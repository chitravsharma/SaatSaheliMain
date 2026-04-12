package com.SaatSaheli.spring.service;

import com.SaatSaheli.spring.model.Book;
import com.SaatSaheli.spring.model.Page;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.poi.xwpf.usermodel.*;
import org.apache.poi.util.Units;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.*;
import java.net.URI;
import java.net.URL;
import java.util.Comparator;
import java.util.List;

@Service
public class ExportService {

    private static final Logger log = LoggerFactory.getLogger(ExportService.class);

    private static final float PAGE_WIDTH = PDRectangle.A4.getWidth();
    private static final float PAGE_HEIGHT = PDRectangle.A4.getHeight();
    private static final float MARGIN = 50;
    private static final float CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
    private static final float LINE_HEIGHT = 16f;
    private static final float IMAGE_MAX_WIDTH = CONTENT_WIDTH;
    private static final float IMAGE_MAX_HEIGHT = 300f;

    /**
     * Export a book to PDF format.
     */
    public byte[] exportToPdf(Book book, List<Page> pages) throws IOException {
        pages.sort(Comparator.comparingInt(Page::getPageNumber));

        try (PDDocument doc = new PDDocument()) {
            // Title page
            addPdfTitlePage(doc, book);

            // Content pages
            for (Page page : pages) {
                addPdfContentPage(doc, page, book);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }

    /**
     * Export a book to DOCX format.
     */
    public byte[] exportToDocx(Book book, List<Page> pages) throws IOException {
        pages.sort(Comparator.comparingInt(Page::getPageNumber));

        try (XWPFDocument doc = new XWPFDocument()) {
            // Title page
            XWPFParagraph titlePara = doc.createParagraph();
            titlePara.setAlignment(ParagraphAlignment.CENTER);
            titlePara.setSpacingBefore(3000);
            XWPFRun titleRun = titlePara.createRun();
            titleRun.setText(book.getTitle());
            titleRun.setBold(true);
            titleRun.setFontSize(28);
            titleRun.setFontFamily("Georgia");

            if (book.getAuthorName() != null && !book.getAuthorName().isEmpty()) {
                XWPFParagraph authorPara = doc.createParagraph();
                authorPara.setAlignment(ParagraphAlignment.CENTER);
                authorPara.setSpacingBefore(400);
                XWPFRun authorRun = authorPara.createRun();
                authorRun.setText("by " + book.getAuthorName());
                authorRun.setFontSize(14);
                authorRun.setItalic(true);
                authorRun.setColor("666666");
            }

            XWPFParagraph catPara = doc.createParagraph();
            catPara.setAlignment(ParagraphAlignment.CENTER);
            catPara.setSpacingBefore(200);
            XWPFRun catRun = catPara.createRun();
            catRun.setText(book.getCategory() != null ? book.getCategory() : "");
            catRun.setFontSize(11);
            catRun.setColor("999999");

            // Page break after title
            XWPFParagraph breakPara = doc.createParagraph();
            breakPara.setPageBreak(true);

            // Content pages
            for (int i = 0; i < pages.size(); i++) {
                Page page = pages.get(i);
                addDocxContentPage(doc, page, i);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.write(out);
            return out.toByteArray();
        }
    }

    // ── PDF helpers ──

    private void addPdfTitlePage(PDDocument doc, Book book) throws IOException {
        PDPage pdfPage = new PDPage(PDRectangle.A4);
        doc.addPage(pdfPage);

        try (PDPageContentStream cs = new PDPageContentStream(doc, pdfPage)) {
            // Title
            PDType1Font titleFont = PDType1Font.HELVETICA_BOLD;
            PDType1Font regularFont = PDType1Font.HELVETICA;

            float titleSize = 28f;
            String title = sanitizeText(book.getTitle());
            float titleWidth = titleFont.getStringWidth(title) / 1000 * titleSize;
            float titleX = (PAGE_WIDTH - titleWidth) / 2;

            cs.beginText();
            cs.setFont(titleFont, titleSize);
            cs.newLineAtOffset(titleX, PAGE_HEIGHT - 250);
            cs.showText(title);
            cs.endText();

            // Author
            if (book.getAuthorName() != null && !book.getAuthorName().isEmpty()) {
                String author = "by " + sanitizeText(book.getAuthorName());
                float authorSize = 14f;
                float authorWidth = regularFont.getStringWidth(author) / 1000 * authorSize;
                float authorX = (PAGE_WIDTH - authorWidth) / 2;

                cs.beginText();
                cs.setFont(regularFont, authorSize);
                cs.newLineAtOffset(authorX, PAGE_HEIGHT - 290);
                cs.showText(author);
                cs.endText();
            }

            // Category
            if (book.getCategory() != null) {
                String category = sanitizeText(book.getCategory());
                float catSize = 11f;
                float catWidth = regularFont.getStringWidth(category) / 1000 * catSize;
                float catX = (PAGE_WIDTH - catWidth) / 2;

                cs.beginText();
                cs.setFont(regularFont, catSize);
                cs.setNonStrokingColor(0.6f, 0.6f, 0.6f);
                cs.newLineAtOffset(catX, PAGE_HEIGHT - 320);
                cs.showText(category);
                cs.endText();
            }
        }
    }

    private void addPdfContentPage(PDDocument doc, Page page, Book book) throws IOException {
        PDPage pdfPage = new PDPage(PDRectangle.A4);
        doc.addPage(pdfPage);

        try (PDPageContentStream cs = new PDPageContentStream(doc, pdfPage)) {
            PDType1Font font = PDType1Font.HELVETICA;
            PDType1Font boldFont = PDType1Font.HELVETICA_BOLD;
            float y = PAGE_HEIGHT - MARGIN;
            float fontSize = 11f;

            // Page number header
            cs.beginText();
            cs.setFont(boldFont, 9f);
            cs.setNonStrokingColor(0.5f, 0.5f, 0.5f);
            String header = sanitizeText(book.getTitle()) + "  |  Page " + page.getPageNumber();
            cs.newLineAtOffset(MARGIN, PAGE_HEIGHT - 30);
            cs.showText(header);
            cs.endText();
            cs.setNonStrokingColor(0f, 0f, 0f);

            y -= 20; // space after header

            // Image
            if (page.getImageUrl() != null && !page.getImageUrl().isEmpty()) {
                y = addPdfImage(doc, cs, pdfPage, page.getImageUrl(), y);
                y -= 10;
            }

            // Second image
            if (page.getImageUrl2() != null && !page.getImageUrl2().isEmpty()) {
                y = addPdfImage(doc, cs, pdfPage, page.getImageUrl2(), y);
                y -= 10;
            }

            // Text content
            if (page.getContent() != null && !page.getContent().isEmpty()) {
                String text = page.getContent();
                // Strip HTML tags if any
                text = text.replaceAll("<[^>]*>", "");
                text = sanitizeText(text);

                cs.beginText();
                cs.setFont(font, fontSize);
                cs.setLeading(LINE_HEIGHT);
                cs.newLineAtOffset(MARGIN, y);

                for (String line : wrapText(text, font, fontSize, CONTENT_WIDTH)) {
                    if (y < MARGIN + 20) {
                        cs.endText();
                        // New page for overflow
                        PDPage overflow = new PDPage(PDRectangle.A4);
                        doc.addPage(overflow);
                        PDPageContentStream cs2 = new PDPageContentStream(doc, overflow);
                        cs2.beginText();
                        cs2.setFont(font, fontSize);
                        cs2.setLeading(LINE_HEIGHT);
                        y = PAGE_HEIGHT - MARGIN;
                        cs2.newLineAtOffset(MARGIN, y);
                        cs2.showText(line);
                        cs2.newLine();
                        y -= LINE_HEIGHT;
                        // We can't easily chain content streams here,
                        // so for very long pages just continue on same stream
                        cs2.endText();
                        cs2.close();
                        continue;
                    }
                    cs.showText(line);
                    cs.newLine();
                    y -= LINE_HEIGHT;
                }
                cs.endText();
            }
        }
    }

    private float addPdfImage(PDDocument doc, PDPageContentStream cs, PDPage pdfPage, String imageUrl, float y) {
        try {
            byte[] imgBytes = downloadImage(imageUrl);
            if (imgBytes == null) return y;

            PDImageXObject pdImage = PDImageXObject.createFromByteArray(doc, imgBytes, "image");
            float imgWidth = pdImage.getWidth();
            float imgHeight = pdImage.getHeight();

            // Scale to fit
            float scale = Math.min(IMAGE_MAX_WIDTH / imgWidth, IMAGE_MAX_HEIGHT / imgHeight);
            if (scale > 1) scale = 1; // don't upscale
            float drawWidth = imgWidth * scale;
            float drawHeight = imgHeight * scale;

            // Center horizontally
            float x = MARGIN + (CONTENT_WIDTH - drawWidth) / 2;
            float drawY = y - drawHeight;

            if (drawY < MARGIN) {
                drawY = PAGE_HEIGHT - MARGIN - drawHeight;
            }

            cs.drawImage(pdImage, x, drawY, drawWidth, drawHeight);
            return drawY;
        } catch (Exception e) {
            log.warn("Failed to add image to PDF: {} — {}", imageUrl, e.getMessage());
            return y;
        }
    }

    // ── DOCX helpers ──

    private void addDocxContentPage(XWPFDocument doc, Page page, int index) {
        // Page number
        XWPFParagraph numPara = doc.createParagraph();
        numPara.setAlignment(ParagraphAlignment.RIGHT);
        XWPFRun numRun = numPara.createRun();
        numRun.setText("Page " + page.getPageNumber());
        numRun.setFontSize(9);
        numRun.setColor("999999");
        numRun.setItalic(true);

        // Images
        if (page.getImageUrl() != null && !page.getImageUrl().isEmpty()) {
            addDocxImage(doc, page.getImageUrl());
        }
        if (page.getImageUrl2() != null && !page.getImageUrl2().isEmpty()) {
            addDocxImage(doc, page.getImageUrl2());
        }

        // Text content
        if (page.getContent() != null && !page.getContent().isEmpty()) {
            String text = page.getContent().replaceAll("<[^>]*>", ""); // strip HTML
            String[] paragraphs = text.split("\n\n|\r\n\r\n");
            for (String para : paragraphs) {
                String trimmed = para.trim();
                if (trimmed.isEmpty()) continue;
                XWPFParagraph p = doc.createParagraph();
                p.setSpacingAfter(120);
                XWPFRun run = p.createRun();
                // Handle line breaks within paragraph
                String[] lines = trimmed.split("\n|\r\n");
                for (int i = 0; i < lines.length; i++) {
                    run.setText(lines[i]);
                    if (i < lines.length - 1) run.addBreak();
                }
                run.setFontSize(11);
                run.setFontFamily("Georgia");
            }
        }

        // Page break (except last page)
        XWPFParagraph breakPara = doc.createParagraph();
        breakPara.setPageBreak(true);
    }

    private void addDocxImage(XWPFDocument doc, String imageUrl) {
        try {
            byte[] imgBytes = downloadImage(imageUrl);
            if (imgBytes == null) return;

            // Detect image type
            int picType;
            String lower = imageUrl.toLowerCase();
            if (lower.contains(".png")) picType = XWPFDocument.PICTURE_TYPE_PNG;
            else if (lower.contains(".gif")) picType = XWPFDocument.PICTURE_TYPE_GIF;
            else picType = XWPFDocument.PICTURE_TYPE_JPEG;

            // Get dimensions
            BufferedImage bi = ImageIO.read(new ByteArrayInputStream(imgBytes));
            if (bi == null) return;
            int imgWidth = bi.getWidth();
            int imgHeight = bi.getHeight();

            // Scale to max 500px wide
            double maxWidth = 500;
            double scale = Math.min(maxWidth / imgWidth, 1.0);
            int drawWidth = (int) (imgWidth * scale);
            int drawHeight = (int) (imgHeight * scale);

            XWPFParagraph imgPara = doc.createParagraph();
            imgPara.setAlignment(ParagraphAlignment.CENTER);
            imgPara.setSpacingAfter(200);
            XWPFRun imgRun = imgPara.createRun();
            imgRun.addPicture(
                    new ByteArrayInputStream(imgBytes),
                    picType,
                    "image",
                    Units.toEMU(drawWidth),
                    Units.toEMU(drawHeight)
            );
        } catch (Exception e) {
            log.warn("Failed to add image to DOCX: {} — {}", imageUrl, e.getMessage());
        }
    }

    // ── Utilities ──

    private byte[] downloadImage(String url) {
        try {
            URL imageUrl = URI.create(url).toURL();
            try (InputStream in = imageUrl.openStream();
                 ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                byte[] buf = new byte[8192];
                int n;
                while ((n = in.read(buf)) != -1) {
                    out.write(buf, 0, n);
                }
                return out.toByteArray();
            }
        } catch (Exception e) {
            log.warn("Failed to download image: {} — {}", url, e.getMessage());
            return null;
        }
    }

    private String sanitizeText(String text) {
        if (text == null) return "";
        // Replace characters not in WinAnsiEncoding
        StringBuilder sb = new StringBuilder();
        for (char c : text.toCharArray()) {
            if (c >= 32 && c <= 126) {
                sb.append(c);
            } else if (c == '\u2013' || c == '\u2014') {
                sb.append('-');
            } else if (c == '\u2018' || c == '\u2019') {
                sb.append('\'');
            } else if (c == '\u201C' || c == '\u201D') {
                sb.append('"');
            } else if (c == '\u2026') {
                sb.append("...");
            } else if (c > 126) {
                sb.append(' '); // replace non-ASCII with space
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }

    private String[] wrapText(String text, PDType1Font font, float fontSize, float maxWidth) throws IOException {
        String[] words = text.split("\\s+");
        StringBuilder line = new StringBuilder();
        java.util.List<String> lines = new java.util.ArrayList<>();

        for (String word : words) {
            String testLine = line.length() == 0 ? word : line + " " + word;
            float width = font.getStringWidth(testLine) / 1000 * fontSize;
            if (width > maxWidth && line.length() > 0) {
                lines.add(line.toString());
                line = new StringBuilder(word);
            } else {
                line = new StringBuilder(testLine);
            }
        }
        if (line.length() > 0) lines.add(line.toString());
        return lines.toArray(new String[0]);
    }
}
