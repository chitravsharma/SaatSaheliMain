package com.SaatSaheli.spring.config;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.List;

@Configuration
public class GoogleSheetsConfig {

    @Value("${google.sheets.credentials-file:}")
    private String credentialsFilePath;

    @Value("${GOOGLE_CREDENTIALS_JSON:}")
    private String credentialsJson;

    @Bean
    public Drive driveService() throws IOException, GeneralSecurityException {
        InputStream credentialsStream;

        if (credentialsJson != null && !credentialsJson.isBlank()) {
            // Cloud: read credentials from env var (raw JSON string)
            credentialsStream = new ByteArrayInputStream(
                    credentialsJson.getBytes(StandardCharsets.UTF_8));
        } else if (credentialsFilePath != null && !credentialsFilePath.isBlank()) {
            // Local dev: read credentials from file path
            credentialsStream = new FileInputStream(credentialsFilePath);
        } else {
            throw new IllegalStateException(
                    "No Google credentials configured. Set GOOGLE_CREDENTIALS_JSON env var or google.sheets.credentials-file property.");
        }

        GoogleCredentials credentials = GoogleCredentials
                .fromStream(credentialsStream)
                .createScoped(List.of(DriveScopes.DRIVE_FILE));

        return new Drive.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                new HttpCredentialsAdapter(credentials))
                .setApplicationName("SaatSaheli")
                .build();
    }
}
