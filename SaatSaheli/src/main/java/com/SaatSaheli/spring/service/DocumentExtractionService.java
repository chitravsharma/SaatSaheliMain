package com.SaatSaheli.spring.service;

import org.apache.pdfbox.io.MemoryUsageSetting;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
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

    private static final int DOCX_PAGE_CHAR_LIMIT = 500;

    // OOM safety: rasterizing a PDF (renderImageWithDPI decodes embedded images
    // at SOURCE resolution) is the dominant memory spike on Render's small box.
    // Reject a too-large / too-many-page PDF BEFORE the render loop so a single
    // upload can't take the app down. Tunable via env; raise after the RAM bump.
    @Value("${app.pdf.max-pages-per-upload:20}")
    private int maxPagesPerUpload;

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

    // PDF page rendering: 100 DPI JPEG @ 0.85 quality keeps text legible while
    // cutting per-page heap allocation ~2× (vs 150 DPI) and stored size ~10×
    // (vs PNG). At 150 DPI PNG one page is ~5 MP / ~20 MB BufferedImage —
    // a 20-page PDF rendered concurrently was the suspect in the 2026-05-09
    // and 2026-05-14 Render OOMs.
    public List<String> extractPdfAsImages(MultipartFile file) throws IOException {
        List<String> imageUrls = new ArrayList<>();
        try (PDDocument doc = PDDocument.load(file.getInputStream(), tempFileOnly())) {
            PDFRenderer renderer = new PDFRenderer(doc);
            int totalPages = doc.getNumberOfPages();
            // Fail fast BEFORE rasterizing — getNumberOfPages() is cheap, the
            // render loop is what OOMs. Forces users to split big PDFs (already
            // the documented magazine workflow: 12-page chunks).
            if (totalPages > maxPagesPerUpload) {
                throw new IllegalArgumentException("This PDF has " + totalPages + " pages. Please split it into "
                        + "files of " + maxPagesPerUpload + " pages or fewer and upload them one at a time.");
            }
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
        return imageUrls;
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
