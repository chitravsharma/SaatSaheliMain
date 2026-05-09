package com.SaatSaheli.spring.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
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
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@ConditionalOnProperty(name = "app.media.storage", havingValue = "cloudinary", matchIfMissing = true)
public class CloudinaryService implements MediaStorageService {

    private final Cloudinary cloudinary;

    private static final Set<String> IMAGE_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/tiff");

    public CloudinaryService(
            @Value("${cloudinary.cloud-name}") String cloudName,
            @Value("${cloudinary.api-key}") String apiKey,
            @Value("${cloudinary.api-secret}") String apiSecret) {
        this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudName,
                "api_key", apiKey,
                "api_secret", apiSecret,
                "secure", true));
    }

    /**
     * Strip EXIF/GPS metadata from image bytes by re-encoding through ImageIO.
     * Non-image content is returned as-is.
     */
    private byte[] stripExifMetadata(byte[] data, String contentType) {
        if (contentType == null || !IMAGE_TYPES.contains(contentType.toLowerCase())) {
            return data; // not an image — return unchanged
        }
        try {
            BufferedImage img = ImageIO.read(new ByteArrayInputStream(data));
            if (img == null) return data;
            // Determine output format: keep PNG as PNG, everything else → JPEG
            String fmt = contentType.contains("png") ? "png" : "jpg";
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(img, fmt, out);
            return out.toByteArray();
        } catch (IOException e) {
            // If stripping fails, upload original rather than blocking
            return data;
        }
    }

    public String uploadFile(MultipartFile file) throws IOException {
        byte[] clean = stripExifMetadata(file.getBytes(), file.getContentType());
        Map result = cloudinary.uploader().upload(clean, ObjectUtils.asMap(
                "folder", "saatsaheli",
                "resource_type", "auto"));
        return (String) result.get("secure_url");
    }

    public String uploadBytes(byte[] data, String filename, String mimeType) throws IOException {
        byte[] clean = stripExifMetadata(data, mimeType);
        Map result = cloudinary.uploader().upload(clean, ObjectUtils.asMap(
                "folder", "saatsaheli",
                "public_id", filename.replaceAll("\\.[^.]+$", ""),
                "resource_type", "auto"));
        return (String) result.get("secure_url");
    }

    public String saveBufferedImage(BufferedImage image, String format) throws IOException {
        // BufferedImage has no EXIF — already clean
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(image, format, baos);
        byte[] data = baos.toByteArray();
        String filename = UUID.randomUUID() + "." + format;
        return uploadBytes(data, filename, "image/" + format);
    }

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
