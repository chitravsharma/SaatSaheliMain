package com.SaatSaheli.spring.service;

import com.google.api.client.http.InputStreamContent;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.model.File;
import com.google.api.services.drive.model.Permission;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Collections;

@Service
public class GoogleDriveService {

    @Autowired
    private Drive driveService;

    @Value("${google.drive.folder-id}")
    private String folderId;

    public String uploadFile(MultipartFile file) throws IOException {
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
}
