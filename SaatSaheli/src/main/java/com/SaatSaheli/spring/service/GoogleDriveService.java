package com.SaatSaheli.spring.service;

import com.google.api.client.http.InputStreamContent;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.model.File;
import com.google.api.services.drive.model.Permission;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Collections;
import java.util.UUID;

@Service
public class GoogleDriveService {

    @Autowired(required = false)
    private Drive driveService;

    @Value("${google.drive.folder-id:}")
    private String folderId;

    private void checkDriveAvailable() {
        if (driveService == null) {
            throw new IllegalStateException("Google Drive is not configured. Set GOOGLE_CREDENTIALS_JSON or google.sheets.credentials-file to enable file uploads.");
        }
    }

    public String uploadFile(MultipartFile file) throws IOException {
        checkDriveAvailable();
        File fileMetadata = new File();
        fileMetadata.setName(file.getOriginalFilename());
        fileMetadata.setParents(Collections.singletonList(folderId));

        InputStreamContent mediaContent = new InputStreamContent(
                file.getContentType(),
                file.getInputStream());
        mediaContent.setLength(file.getSize());

        File uploaded = driveService.files().create(fileMetadata, mediaContent)
                .setFields("id")
                .execute();

        // Set "anyone with link" read permission
        Permission permission = new Permission();
        permission.setType("anyone");
        permission.setRole("reader");
        driveService.permissions().create(uploaded.getId(), permission).execute();

        return "https://drive.google.com/file/d/" + uploaded.getId() + "/view?usp=sharing";
    }

    public String uploadBytes(byte[] data, String filename, String mimeType) throws IOException {
        checkDriveAvailable();
        File fileMetadata = new File();
        fileMetadata.setName(filename);
        fileMetadata.setParents(Collections.singletonList(folderId));

        InputStreamContent mediaContent = new InputStreamContent(
                mimeType, new ByteArrayInputStream(data));
        mediaContent.setLength(data.length);

        File uploaded = driveService.files().create(fileMetadata, mediaContent)
                .setFields("id")
                .execute();

        Permission permission = new Permission();
        permission.setType("anyone");
        permission.setRole("reader");
        driveService.permissions().create(uploaded.getId(), permission).execute();

        return "https://drive.google.com/file/d/" + uploaded.getId() + "/view?usp=sharing";
    }

    public String saveBufferedImage(BufferedImage image, String format) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(image, format, baos);
        byte[] data = baos.toByteArray();
        String filename = UUID.randomUUID() + "." + format;
        String mimeType = "image/" + format;
        return uploadBytes(data, filename, mimeType);
    }
}
