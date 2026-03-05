package com.SaatSaheli.spring.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class DocumentExtractionService {

    private static final String UPLOAD_DIR = "./uploads/";
    private static final int DOCX_PAGE_CHAR_LIMIT = 500;

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

    public List<String> extractPdfAsImages(MultipartFile file) throws IOException {
        File uploadDir = new File(UPLOAD_DIR);
        if (!uploadDir.exists()) {
            uploadDir.mkdirs();
        }

        List<String> imageUrls = new ArrayList<>();
        try (PDDocument doc = PDDocument.load(file.getInputStream())) {
            PDFRenderer renderer = new PDFRenderer(doc);
            int totalPages = doc.getNumberOfPages();
            for (int i = 0; i < totalPages; i++) {
                BufferedImage image = renderer.renderImageWithDPI(i, 150);
                String filename = UUID.randomUUID() + ".png";
                File outFile = new File(uploadDir, filename);
                ImageIO.write(image, "png", outFile);
                imageUrls.add("/uploads/" + filename);
            }
        }
        return imageUrls;
    }

    private List<String> extractFromPdf(MultipartFile file) throws IOException {
        List<String> pages = new ArrayList<>();
        try (PDDocument doc = PDDocument.load(file.getInputStream())) {
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
