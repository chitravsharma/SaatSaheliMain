package com.SaatSaheli.spring.service;

import org.springframework.web.multipart.MultipartFile;

import java.awt.image.BufferedImage;
import java.io.IOException;

/**
 * Storage backend for uploaded media (images, audio, PDFs).
 * Implemented by {@link R2StorageService} (Cloudflare R2, S3-compatible).
 */
public interface MediaStorageService {

    /** Upload a multipart file (any type) and return the public URL. */
    String uploadFile(MultipartFile file) throws IOException;

    /** Upload raw bytes with a logical filename + MIME type and return the public URL. */
    String uploadBytes(byte[] data, String filename, String mimeType) throws IOException;

    /** Encode a BufferedImage in the given format (e.g. "png", "jpeg") and upload. */
    String saveBufferedImage(BufferedImage image, String format) throws IOException;

    /** Encode a BufferedImage as JPEG with the given quality (0.0–1.0) and upload. */
    String saveJpegImage(BufferedImage image, float quality) throws IOException;
}
