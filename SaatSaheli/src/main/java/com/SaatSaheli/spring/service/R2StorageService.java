package com.SaatSaheli.spring.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

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
 * Cloudflare R2 implementation of {@link MediaStorageService}.
 *
 * <p>Activated when {@code app.media.storage=r2}. Mirrors {@link CloudinaryService}'s
 * 4-method surface so call sites don't change. Uses the AWS S3 SDK v2 against
 * R2's S3-compatible endpoint.
 *
 * <p>Strips EXIF/GPS metadata locally (same as the Cloudinary impl) before upload
 * by re-encoding through ImageIO. Files are written under {@code saatsaheli/} prefix
 * to match Cloudinary's folder structure for easy migration.
 *
 * <p>Returned URLs are public URLs (either the R2 custom-domain base or, if not
 * configured, the bucket's default S3-compatible URL — which is NOT publicly readable
 * out of the box; configure a custom domain via Cloudflare R2 settings or expose the
 * bucket via a Worker).
 */
@Service
@ConditionalOnProperty(name = "app.media.storage", havingValue = "r2")
public class R2StorageService implements MediaStorageService {

    private static final Set<String> IMAGE_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/tiff");

    private static final String FOLDER = "saatsaheli";

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
        try {
            BufferedImage img = ImageIO.read(new ByteArrayInputStream(data));
            if (img == null) return data;
            String fmt = contentType.contains("png") ? "png" : "jpg";
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(img, fmt, out);
            return out.toByteArray();
        } catch (IOException e) {
            return data; // upload original rather than blocking
        }
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
        }
        String filename = UUID.randomUUID() + ".jpg";
        return uploadBytes(baos.toByteArray(), filename, "image/jpeg");
    }
}
