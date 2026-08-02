package com.SaatSaheli.spring.util;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.EnumSet;
import java.util.Set;

/**
 * Content-based (magic-byte) upload validation. Extensions and client-sent
 * Content-Type are trivially spoofable, so we sniff the actual file header and
 * whitelist known-safe types. This blocks executables, scripts, HTML/SVG
 * (stored-XSS vectors) and anything unrecognized — a cheap first line of
 * defense that fits the small Render box. It is NOT antivirus: it does not
 * detect malware payloads inside an otherwise-valid image/PDF (that needs the
 * deferred cloud-AV scan).
 */
public final class UploadValidator {

    private UploadValidator() {}

    public enum FileType { JPEG, PNG, GIF, WEBP, BMP, TIFF, PDF, DOCX, DOC, HEIC, UNKNOWN }

    /** Raster image formats browsers render safely. */
    private static final Set<FileType> SAFE_IMAGES = EnumSet.of(FileType.JPEG, FileType.PNG, FileType.GIF, FileType.WEBP);
    /** Document formats the book importer accepts. */
    private static final Set<FileType> DOCUMENTS = EnumSet.of(FileType.PDF, FileType.DOCX, FileType.DOC);

    private static final int HEADER_LEN = 16;

    /** Max size for a raster image upload. Guards the small Render box against
     *  memory-heavy rasterization and mirrors the client-side check. */
    private static final long MAX_IMAGE_BYTES = 10L * 1024 * 1024; // 10 MB

    /** Sniff the file header and classify by signature. Never throws. */
    public static FileType detect(MultipartFile file) {
        if (file == null) return FileType.UNKNOWN;
        byte[] h = readHeader(file);
        if (h == null || h.length < 4) return FileType.UNKNOWN;

        int b0 = h[0] & 0xFF, b1 = h[1] & 0xFF, b2 = h[2] & 0xFF, b3 = h[3] & 0xFF;

        // JPEG: FF D8 FF
        if (b0 == 0xFF && b1 == 0xD8 && b2 == 0xFF) return FileType.JPEG;
        // PNG: 89 50 4E 47
        if (b0 == 0x89 && b1 == 0x50 && b2 == 0x4E && b3 == 0x47) return FileType.PNG;
        // GIF: "GIF8"
        if (b0 == 'G' && b1 == 'I' && b2 == 'F' && b3 == '8') return FileType.GIF;
        // BMP: "BM"
        if (b0 == 'B' && b1 == 'M') return FileType.BMP;
        // PDF: "%PDF"
        if (b0 == '%' && b1 == 'P' && b2 == 'D' && b3 == 'F') return FileType.PDF;
        // TIFF: "II*\0" or "MM\0*"
        if ((b0 == 'I' && b1 == 'I' && b2 == 0x2A && b3 == 0x00)
                || (b0 == 'M' && b1 == 'M' && b2 == 0x00 && b3 == 0x2A)) return FileType.TIFF;
        // ZIP container (DOCX/OOXML): "PK\3\4"
        if (b0 == 'P' && b1 == 'K' && b2 == 0x03 && b3 == 0x04) return FileType.DOCX;
        // OLE compound (legacy .doc): D0 CF 11 E0
        if (b0 == 0xD0 && b1 == 0xCF && b2 == 0x11 && b3 == 0xE0) return FileType.DOC;
        // RIFF....WEBP  and  ....ftyp<heic-brand>  both need bytes 4..11
        if (h.length >= 12) {
            if (b0 == 'R' && b1 == 'I' && b2 == 'F' && b3 == 'F'
                    && h[8] == 'W' && h[9] == 'E' && h[10] == 'B' && h[11] == 'P') return FileType.WEBP;
            if (h[4] == 'f' && h[5] == 't' && h[6] == 'y' && h[7] == 'p') {
                String brand = new String(h, 8, 4).toLowerCase();
                if (brand.startsWith("hei") || brand.equals("mif1") || brand.equals("heix")
                        || brand.equals("hevc") || brand.equals("heim")) return FileType.HEIC;
            }
        }
        return FileType.UNKNOWN;
    }

    /** Throw if the file is not a browser-safe raster image. */
    public static void requireSafeImage(MultipartFile file) {
        if (file != null && file.getSize() > MAX_IMAGE_BYTES) {
            throw new IllegalArgumentException(
                    "Image is too large. Please upload an image under "
                            + (MAX_IMAGE_BYTES / (1024 * 1024)) + " MB.");
        }
        FileType t = detect(file);
        if (t == FileType.HEIC) {
            throw new IllegalArgumentException(
                    "HEIC/HEIF images aren't supported in browsers. Please convert to JPEG or PNG before uploading.");
        }
        if (!SAFE_IMAGES.contains(t)) {
            throw new IllegalArgumentException(
                    "Unsupported or unrecognized image file. Please upload a JPG, PNG, GIF, or WEBP image.");
        }
    }

    /** Throw if the file is not a supported document. */
    public static void requireDocument(MultipartFile file) {
        if (!DOCUMENTS.contains(detect(file))) {
            throw new IllegalArgumentException(
                    "Unsupported or unrecognized file. Please upload a PDF or Word document (.pdf, .docx, .doc).");
        }
    }

    /**
     * Backstop for the shared store path: allow any known-safe image or
     * document, reject everything else (executables, scripts, HTML/SVG, unknown).
     */
    public static void requireKnownSafeType(MultipartFile file) {
        FileType t = detect(file);
        if (!SAFE_IMAGES.contains(t) && !DOCUMENTS.contains(t)) {
            throw new IllegalArgumentException("Unsupported or unrecognized file type.");
        }
    }

    private static byte[] readHeader(MultipartFile file) {
        try (InputStream in = file.getInputStream()) {
            byte[] buf = new byte[HEADER_LEN];
            int read = 0;
            while (read < HEADER_LEN) {
                int n = in.read(buf, read, HEADER_LEN - read);
                if (n < 0) break;
                read += n;
            }
            if (read == HEADER_LEN) return buf;
            byte[] out = new byte[read];
            System.arraycopy(buf, 0, out, 0, read);
            return out;
        } catch (IOException e) {
            return null;
        }
    }
}
