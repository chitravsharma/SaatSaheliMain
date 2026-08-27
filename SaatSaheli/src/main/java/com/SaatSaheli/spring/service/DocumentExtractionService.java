package com.SaatSaheli.spring.service;

import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.io.MemoryUsageSetting;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.graphics.PDXObject;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

@Service
public class DocumentExtractionService {

    private static final Logger log = LoggerFactory.getLogger(DocumentExtractionService.class);

    private static final int DOCX_PAGE_CHAR_LIMIT = 500;

    // OOM safety: rasterizing a PDF (renderImageWithDPI decodes embedded images
    // at SOURCE resolution) is the dominant memory spike on Render's small box.
    // Reject a too-large / too-many-page PDF BEFORE the render loop so a single
    // upload can't take the app down. Tunable via env; raise after the RAM bump.
    @Value("${app.pdf.max-pages-per-upload:20}")
    private int maxPagesPerUpload;

    // Per-page image budget in MEGAPIXELS. PDFBox decodes embedded images at
    // source resolution (4 bytes/px) during render, so one 20 MP photo = ~80 MB
    // RAM regardless of its compressed size — the single image-heavy page that
    // OOMs the box. Read cheaply from image metadata (no decode) and reject
    // before rendering. Default 16 MP (~64 MB) is 512MB-safe; raise after 2GB.
    @Value("${app.pdf.max-megapixels-per-page:16}")
    private int maxMegapixelsPerPage;

    // Spill PDFBox's parse/scratch state to a temp file instead of holding it
    // all in JVM heap. For image-heavy magazine PDFs the default in-memory
    // scratch buffer is the dominant OOM driver on Render's 512 MB container
    // (OOMs 2026-05-09/14/20 and 2026-06-08). Render disk is ephemeral, so
    // spilling to /tmp is free here and trades heap pressure for disk I/O.
    private static MemoryUsageSetting tempFileOnly() {
        return MemoryUsageSetting.setupTempFileOnly();
    }

    @Autowired
    private MediaStorageService mediaStorage;

    public List<String> extractText(MultipartFile file) throws IOException {
        String filename = file.getOriginalFilename();
        if (filename == null) {
            throw new IllegalArgumentException("File name is required");
        }
        String lower = filename.toLowerCase();
        if (lower.endsWith(".pdf")) {
            return extractFromPdf(file);
        } else if (lower.endsWith(".docx") || lower.endsWith(".doc")) {
            return extractFromDocx(file);
        } else {
            throw new IllegalArgumentException("Unsupported file type. Please upload a PDF or Word document (.pdf, .docx, .doc).");
        }
    }

    /**
     * Result of a PDF import: the rendered page images plus the document's own trim
     * size, so the caller can fit the book's reader frame to the real page shape
     * without re-opening (and re-parsing) the PDF.
     */
    public record PdfImport(List<String> imageUrls, double widthInches, double heightInches) {}

    /**
     * Trim size of a PDF page in inches. PDF user-space units are 1/72 in, so the
     * CropBox converts directly. A /Rotate of 90 or 270 swaps the visual edges, so
     * the rotation is applied before reporting.
     */
    private static double[] trimInches(PDPage page) {
        PDRectangle box = page.getCropBox() != null ? page.getCropBox() : page.getMediaBox();
        if (box == null) return new double[] { 0, 0 };
        double w = box.getWidth() / 72.0;
        double h = box.getHeight() / 72.0;
        int rotation = ((page.getRotation() % 360) + 360) % 360;
        if (rotation == 90 || rotation == 270) {
            double swap = w; w = h; h = swap;
        }
        return new double[] { w, h };
    }

    // PDF page rendering: 100 DPI JPEG @ 0.85 quality keeps text legible while
    // cutting per-page heap allocation ~2× (vs 150 DPI) and stored size ~10×
    // (vs PNG). At 150 DPI PNG one page is ~5 MP / ~20 MB BufferedImage —
    // a 20-page PDF rendered concurrently was the suspect in the 2026-05-09
    // and 2026-05-14 Render OOMs.
    public List<String> extractPdfAsImages(MultipartFile file) throws IOException {
        return importPdfAsImages(file).imageUrls();
    }

    public PdfImport importPdfAsImages(MultipartFile file) throws IOException {
        List<String> imageUrls = new ArrayList<>();
        double[] trim = { 0, 0 };
        try (PDDocument doc = PDDocument.load(file.getInputStream(), tempFileOnly())) {
            PDFRenderer renderer = new PDFRenderer(doc);
            int totalPages = doc.getNumberOfPages();
            String sizeMB = String.format("%.1f", file.getSize() / (1024.0 * 1024.0));
            // Fail fast BEFORE rasterizing — getNumberOfPages() is cheap, the
            // render loop is what OOMs. Forces users to split big PDFs (already
            // the documented magazine workflow: 12-page chunks).
            if (totalPages > maxPagesPerUpload) {
                log.warn("PDF upload REJECTED (pages): name={}, size={} MB, pages={} > {}",
                        file.getOriginalFilename(), sizeMB, totalPages, maxPagesPerUpload);
                throw new IllegalArgumentException("This PDF has " + totalPages + " pages. Please split it into "
                        + "files of " + maxPagesPerUpload + " pages or fewer and upload them one at a time.");
            }
            // Pre-pass (cheap, no decode): reject a single image-heavy page before
            // it's rendered. This is the one-page OOM case that size/page caps miss.
            long maxPixels = (long) maxMegapixelsPerPage * 1_000_000L;
            long maxObservedPx = 0;
            for (int i = 0; i < totalPages; i++) {
                long px = embeddedImagePixels(doc.getPage(i));
                maxObservedPx = Math.max(maxObservedPx, px);
                if (px > maxPixels) {
                    log.warn("PDF upload REJECTED (page MP): name={}, size={} MB, page={}, {} MP > {} MP",
                            file.getOriginalFilename(), sizeMB, i + 1, px / 1_000_000, maxMegapixelsPerPage);
                    throw new IllegalArgumentException("Page " + (i + 1) + " contains very high-resolution image(s) (~"
                            + (px / 1_000_000) + " MP). Please downscale images to under " + maxMegapixelsPerPage
                            + " MP per page (e.g. export at 150 DPI) before uploading.");
                }
            }
            // Measure page 1 — the whole document is assumed to share one trim, which is
            // true of anything exported for print.
            trim = trimInches(doc.getPage(0));
            log.info("PDF upload accepted: name={}, size={} MB, pages={}, maxPageImages={} MP, trim={}x{} in",
                    file.getOriginalFilename(), sizeMB, totalPages, maxObservedPx / 1_000_000,
                    String.format("%.3f", trim[0]), String.format("%.3f", trim[1]));
            for (int i = 0; i < totalPages; i++) {
                // Render, upload, then release the page raster before the next
                // iteration. The renderer decodes embedded images at their
                // source resolution (not the 100 DPI output), so each page can
                // be tens of MB of heap; flush()+null lets it be reclaimed
                // immediately rather than accumulating across a 36-page magazine.
                BufferedImage page = renderer.renderImageWithDPI(i, 100);
                String url = mediaStorage.saveJpegImage(page, 0.85f);
                imageUrls.add(url);
                page.flush();
                page = null;
            }
        }
        return new PdfImport(imageUrls, trim[0], trim[1]);
    }

    /**
     * Total pixels of images placed directly on a page, read from image metadata
     * (getWidth/getHeight) WITHOUT decoding the raster. Covers the common case
     * (photos placed on the page); images nested inside form XObjects aren't
     * counted, so this is a strong heuristic, not a hard guarantee.
     */
    private long embeddedImagePixels(PDPage page) throws IOException {
        PDResources res = page.getResources();
        if (res == null) return 0;
        long pixels = 0;
        for (COSName name : res.getXObjectNames()) {
            PDXObject xobj = res.getXObject(name);
            if (xobj instanceof PDImageXObject) {
                PDImageXObject img = (PDImageXObject) xobj;
                pixels += (long) img.getWidth() * img.getHeight();
            }
        }
        return pixels;
    }

    private List<String> extractFromPdf(MultipartFile file) throws IOException {
        List<String> pages = new ArrayList<>();
        try (PDDocument doc = PDDocument.load(file.getInputStream(), tempFileOnly())) {
            PDFTextStripper stripper = new PDFTextStripper();
            int totalPages = doc.getNumberOfPages();
            for (int i = 1; i <= totalPages; i++) {
                stripper.setStartPage(i);
                stripper.setEndPage(i);
                String text = stripper.getText(doc).trim();
                if (!text.isEmpty()) {
                    pages.add(text);
                }
            }
        }
        return pages;
    }

    private List<String> extractFromDocx(MultipartFile file) throws IOException {
        List<String> pages = new ArrayList<>();
        try (InputStream is = file.getInputStream();
             XWPFDocument doc = new XWPFDocument(is)) {
            StringBuilder current = new StringBuilder();
            for (XWPFParagraph para : doc.getParagraphs()) {
                String text = para.getText();
                if (text == null || text.trim().isEmpty()) {
                    continue;
                }
                if (current.length() + text.length() > DOCX_PAGE_CHAR_LIMIT && current.length() > 0) {
                    pages.add(current.toString().trim());
                    current = new StringBuilder();
                }
                if (current.length() > 0) {
                    current.append("\n");
                }
                current.append(text);
            }
            if (current.length() > 0) {
                pages.add(current.toString().trim());
            }
        }
        return pages;
    }
}
