package com.SaatSaheli.spring.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class LocalFileService {

    private static final String UPLOAD_DIR = "./uploads";

    @PostConstruct
    public void init() throws IOException {
        Path uploadPath = Paths.get(UPLOAD_DIR);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }
    }

    public String uploadFile(MultipartFile file) throws IOException {
        String originalName = file.getOriginalFilename();
        String extension = "";
        if (originalName != null && originalName.contains(".")) {
            extension = originalName.substring(originalName.lastIndexOf("."));
        }
        String uniqueName = UUID.randomUUID() + extension;

        Path filePath = Paths.get(UPLOAD_DIR, uniqueName);
        Files.copy(file.getInputStream(), filePath);

        return "/uploads/" + uniqueName;
    }
}
