package com.SaatSaheli.spring.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.MemoryCacheImageOutputStream;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

/**
 * Filesystem media backend for local development.
 *
 * <p>Exists because the dev profile inherits the production R2 credentials from
 * {@code .env}, so every local upload — and every page of every test PDF import —
 * was being written into the LIVE media bucket, leaving objects there that no
 * production record references. This is the storage counterpart of
 * {@code app.email.enabled=false}: dev has the real credentials and deliberately
 * does not use them.
 *
 * <p>Selected by {@code app.media.storage=local}, which the dev profile sets.
 * Production leaves the property unset and keeps {@link R2StorageService}.
 *
 * <p>Files are written under {@code app.media.local-dir} and served back by
 * {@code LocalMediaController}. Unlike the R2 backend this does NOT strip EXIF or
 * downscale oversized photos — those protect production privacy and container
 * memory, and skipping them locally only makes stored test files larger.
 */
@Service
@ConditionalOnProperty(name = "app.media.storage", havingValue = "local")
public class LocalMediaStorageService implements MediaStorageService {

    private static final Logger log = LoggerFactory.getLogger(LocalMediaStorageService.class);

    /** Path segment the companion controller serves these files under. */
    public static final String URL_PREFIX = "/local-media/";

    private final Path dir;
    private final String baseUrl;

    public LocalMediaStorageService(
            @Value("${app.media.local-dir:${user.home}/.saatsaheli/media}") String localDir,
            @Value("${app.media.local-base-url:http://localhost:8081}") String baseUrl) throws IOException {
        this.dir = Paths.get(localDir).toAbsolutePath().normalize();
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        Files.createDirectories(this.dir);
        log.warn("Media storage backend is LOCAL — uploads go to {} and NOT to Cloudflare R2.", this.dir);
    }

    /** Directory files are stored in, for the controller that serves them back. */
    public Path directory() {
        return dir;
    }

    private String write(byte[] data, String filename) throws IOException {
        // Flatten any path in the caller's filename — the stored name is ours to choose,
        // and a name carrying separators could escape the media directory.
        String safe = filename.replaceAll(".*[/\\\\]", "");
        Path target = dir.resolve(safe).normalize();
        if (!target.startsWith(dir)) {
            throw new IOException("Refusing to write outside the media directory: " + filename);
        }
        Files.write(target, data);
        return baseUrl + URL_PREFIX + safe;
    }

    private static String extensionFor(String mimeType, String filename) {
        if (filename != null && filename.matches(".*\\.[A-Za-z0-9]{1,5}$")) {
            return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
        }
        if (mimeType == null) return "bin";
        String mt = mimeType.toLowerCase();
        if (mt.contains("jpeg") || mt.contains("jpg")) return "jpg";
        if (mt.contains("png")) return "png";
        if (mt.contains("gif")) return "gif";
        if (mt.contains("webp")) return "webp";
        if (mt.contains("pdf")) return "pdf";
        if (mt.contains("mpeg")) return "mp3";
        return "bin";
    }

    @Override
    public String uploadFile(MultipartFile file) throws IOException {
        // Same content-signature backstop the R2 path applies, so a file rejected in
        // production is rejected here too rather than passing local testing.
        com.SaatSaheli.spring.util.UploadValidator.requireKnownSafeType(file);
        String ext = extensionFor(file.getContentType(), file.getOriginalFilename());
        return write(file.getBytes(), UUID.randomUUID() + "." + ext);
    }

    @Override
    public String uploadBytes(byte[] data, String filename, String mimeType) throws IOException {
        String ext = extensionFor(mimeType, filename);
        return write(data, UUID.randomUUID() + "." + ext);
    }

    @Override
    public String saveBufferedImage(BufferedImage image, String format) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(image, format, baos);
        return uploadBytes(baos.toByteArray(), null, "image/" + format);
    }

    @Override
    public String saveJpegImage(BufferedImage image, float quality) throws IOException {
        // Mirrors R2StorageService.saveJpegImage, including flushing the temporary RGB
        // copy: PDF import calls this once per page, and on an image-heavy magazine
        // those full-size second buffers are what drove the container OOMs.
        BufferedImage rgb = image;
        if (image.getColorModel().hasAlpha() || image.getType() != BufferedImage.TYPE_INT_RGB) {
            rgb = new BufferedImage(image.getWidth(), image.getHeight(), BufferedImage.TYPE_INT_RGB);
            Graphics2D g = rgb.createGraphics();
            g.drawImage(image, 0, 0, null);
            g.dispose();
        }
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        ImageWriteParam param = writer.getDefaultWriteParam();
        param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
        param.setCompressionQuality(quality);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (MemoryCacheImageOutputStream out = new MemoryCacheImageOutputStream(baos)) {
            writer.setOutput(out);
            writer.write(null, new IIOImage(rgb, null, null), param);
        } finally {
            writer.dispose();
            if (rgb != image) {
                rgb.flush();
            }
        }
        return uploadBytes(baos.toByteArray(), null, "image/jpeg");
    }
}
