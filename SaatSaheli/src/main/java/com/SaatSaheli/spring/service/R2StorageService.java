package com.SaatSaheli.spring.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import net.coobird.thumbnailator.Thumbnails;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.MemoryCacheImageOutputStream;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.util.Set;
import java.util.UUID;

/**
 * Cloudflare R2 implementation of {@link MediaStorageService} — the sole media
 * backend. Uses the AWS S3 SDK v2 against R2's S3-compatible endpoint.
 *
 * <p>Strips EXIF/GPS metadata locally before upload by re-encoding through
 * ImageIO. Files are written under {@code saatsaheli/} prefix.
 *
 * <p>Returned URLs are public URLs served via the R2 custom-domain base
 * configured in {@code R2_PUBLIC_BASE_URL} (e.g. media.saatsaheli.com).
 */
@Service
public class R2StorageService implements MediaStorageService {

    private static final org.slf4j.Logger UPLOAD_LOG = org.slf4j.LoggerFactory.getLogger(R2StorageService.class);

    private static final Set<String> IMAGE_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/tiff");

    private static final String FOLDER = "saatsaheli";
    // Longest-edge cap for uploaded photos — bounds per-upload memory (avoids
    // OOM on the 512MB container) and keeps files web-sized. 2400px is plenty
    // for full-screen viewing on any device.
    private static final int MAX_UPLOAD_DIM = 2400;

    private final S3Client s3;
    private final String bucket;
    private final String publicBaseUrl;
    private final String endpoint;

    public R2StorageService(
            @Value("${r2.account-id}") String accountId,
            @Value("${r2.access-key-id}") String accessKeyId,
            @Value("${r2.secret-access-key}") String secretAccessKey,
            @Value("${r2.bucket}") String bucket,
            @Value("${r2.endpoint}") String endpoint,
            @Value("${r2.public-base-url:}") String publicBaseUrl) {
        if (accountId == null || accountId.isBlank()
                || accessKeyId == null || accessKeyId.isBlank()
                || secretAccessKey == null || secretAccessKey.isBlank()
                || bucket == null || bucket.isBlank()
                || endpoint == null || endpoint.isBlank()) {
            throw new IllegalStateException(
                    "R2StorageService is active (app.media.storage=r2) but R2 env vars are missing. "
                            + "Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_ENDPOINT.");
        }
        this.bucket = bucket;
        this.endpoint = endpoint;
        this.publicBaseUrl = (publicBaseUrl == null || publicBaseUrl.isBlank())
                ? endpoint + "/" + bucket
                : publicBaseUrl.replaceAll("/+$", "");
        this.s3 = S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .region(Region.of("auto"))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKeyId, secretAccessKey)))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(true)
                        .build())
                .build();
    }

    private byte[] stripExifMetadata(byte[] data, String contentType) {
        if (contentType == null || !IMAGE_TYPES.contains(contentType.toLowerCase())) {
            return data;
        }
        String ct = contentType.toLowerCase();
        // GIF/WebP: leave untouched — they don't carry the EXIF orientation
        // problem and re-encoding them here would lose animation/alpha.
        if (ct.contains("gif") || ct.contains("webp")) {
            return data;
        }
        try {
            String fmt = ct.contains("png") ? "png" : "jpg";
            // Cap the longest edge. A 24MP phone photo is ~96MB as a BufferedImage
            // and applying orientation allocates a second buffer — two concurrent
            // large uploads can OOM the 512MB container. Downscaling keeps peak
            // memory low AND yields web-appropriate files. scale<=1.0 never
            // upscales, so small images are untouched.
            double scale = 1.0;
            int[] dims = readDimensions(data);
            if (dims != null) {
                int longest = Math.max(dims[0], dims[1]);
                if (longest > MAX_UPLOAD_DIM) {
                    scale = (double) MAX_UPLOAD_DIM / longest;
                }
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            // Thumbnailator reads the EXIF Orientation tag and BAKES the rotation
            // into the pixels (useExifOrientation is on by default), then writes
            // without EXIF. This both strips metadata (privacy) AND keeps phone
            // photos upright — the previous ImageIO round-trip dropped the
            // orientation flag without applying it, so portrait photos uploaded
            // rotated/flipped.
            Thumbnails.of(new ByteArrayInputStream(data))
                    .scale(scale)
                    .useExifOrientation(true)
                    .outputFormat(fmt)
                    .toOutputStream(out);
            byte[] result = out.toByteArray();
            return result.length > 0 ? result : data;
        } catch (Exception e) {
            return data; // upload original rather than blocking
        }
    }

    /** Read just the pixel dimensions from the image header — no full decode,
     *  so it's cheap even for huge photos. Returns [width, height] or null. */
    private int[] readDimensions(byte[] data) {
        try (javax.imageio.stream.ImageInputStream iis =
                     ImageIO.createImageInputStream(new ByteArrayInputStream(data))) {
            java.util.Iterator<javax.imageio.ImageReader> it = ImageIO.getImageReaders(iis);
            if (it.hasNext()) {
                javax.imageio.ImageReader r = it.next();
                try {
                    r.setInput(iis);
                    return new int[]{ r.getWidth(0), r.getHeight(0) };
                } finally {
                    r.dispose();
                }
            }
        } catch (Exception ignored) { }
        return null;
    }

    private String guessExtension(String mimeType, String filename) {
        if (mimeType != null) {
            String mt = mimeType.toLowerCase();
            if (mt.contains("png")) return "png";
            if (mt.contains("jpeg") || mt.contains("jpg")) return "jpg";
            if (mt.contains("gif")) return "gif";
            if (mt.contains("webp")) return "webp";
            if (mt.contains("pdf")) return "pdf";
        }
        if (filename != null) {
            int dot = filename.lastIndexOf('.');
            if (dot >= 0 && dot < filename.length() - 1) return filename.substring(dot + 1).toLowerCase();
        }
        return "bin";
    }

    private String putObject(byte[] data, String key, String contentType) {
        PutObjectRequest req = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(contentType != null ? contentType : "application/octet-stream")
                .build();
        s3.putObject(req, RequestBody.fromBytes(data));
        return publicBaseUrl + "/" + key;
    }

    @Override
    public String uploadFile(MultipartFile file) throws IOException {
        // Backstop: content-based type check on the shared store path.
        com.SaatSaheli.spring.util.UploadValidator.requireKnownSafeType(file);
        UPLOAD_LOG.info("Image upload: name={}, size={} KB, contentType={}",
                file.getOriginalFilename(), file.getSize() / 1024, file.getContentType());
        byte[] clean = stripExifMetadata(file.getBytes(), file.getContentType());
        String ext = guessExtension(file.getContentType(), file.getOriginalFilename());
        String key = FOLDER + "/" + UUID.randomUUID() + "." + ext;
        return putObject(clean, key, file.getContentType());
    }

    @Override
    public String uploadBytes(byte[] data, String filename, String mimeType) throws IOException {
        byte[] clean = stripExifMetadata(data, mimeType);
        String base = filename == null ? UUID.randomUUID().toString() : filename.replaceAll("\\.[^.]+$", "");
        String ext = guessExtension(mimeType, filename);
        String key = FOLDER + "/" + base + "." + ext;
        return putObject(clean, key, mimeType);
    }

    @Override
    public String saveBufferedImage(BufferedImage image, String format) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(image, format, baos);
        byte[] data = baos.toByteArray();
        String filename = UUID.randomUUID() + "." + format;
        return uploadBytes(data, filename, "image/" + format);
    }

    @Override
    public String saveJpegImage(BufferedImage image, float quality) throws IOException {
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
            // Release the temporary RGB copy's raster promptly. On image-heavy
            // magazine PDFs this copy is a full-size second buffer per page;
            // leaving it for the GC contributed to the Render 512 MB OOMs.
            if (rgb != image) {
                rgb.flush();
            }
        }
        String filename = UUID.randomUUID() + ".jpg";
        return uploadBytes(baos.toByteArray(), filename, "image/jpeg");
    }
}
