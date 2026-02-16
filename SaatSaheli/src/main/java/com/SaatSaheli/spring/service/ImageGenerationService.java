package com.SaatSaheli.spring.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;

import static java.util.Map.entry;

@Service
public class ImageGenerationService {

    private static final String UPLOAD_DIR = "./uploads";

    private static final Map<String, String> STYLE_PREFIXES = Map.ofEntries(
        entry("general",     "High quality, detailed illustration: "),
        entry("children",    "Children's book illustration, colorful, whimsical style: "),
        entry("poetry",      "Artistic, dreamy, poetic watercolor illustration: "),
        entry("story",       "Vivid storytelling illustration, narrative scene: "),
        entry("art",         "Fine art painting, museum quality, expressive brushwork: "),
        entry("science",     "Scientific illustration, accurate, educational diagram style: "),
        entry("politics",    "Editorial illustration, bold political commentary style: "),
        entry("technology",  "Futuristic, sleek technology concept art: "),
        entry("geography",   "Beautiful landscape, geographical illustration, natural scenery: "),
        entry("history",     "Historical illustration, period-accurate, vintage style: "),
        entry("fantasy",     "Epic fantasy art, magical, otherworldly scene: "),
        entry("realistic",   "Photorealistic, high detail, lifelike rendering: ")
    );

    @Value("${huggingface.api.token}")
    private String apiToken;

    @Value("${huggingface.api.model}")
    private String model;

    @Value("${huggingface.api.timeout:60000}")
    private int timeout;

    private final RestClient restClient = RestClient.create();

    public String generateImage(String prompt, String style) throws IOException {
        if (prompt == null || prompt.trim().isEmpty()) {
            throw new IllegalArgumentException("Prompt cannot be empty");
        }
        if ("YOUR_HF_TOKEN_HERE".equals(apiToken) || apiToken == null || apiToken.isBlank()) {
            throw new IllegalStateException("Hugging Face API token is not configured");
        }

        // Ensure uploads directory exists
        Path uploadPath = Paths.get(UPLOAD_DIR);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String prefix = STYLE_PREFIXES.getOrDefault(
                style != null ? style : "general", STYLE_PREFIXES.get("general"));
        String enhancedPrompt = prefix + prompt.trim();
        String url = "https://router.huggingface.co/hf-inference/models/" + model;

        byte[] imageBytes = null;
        int maxRetries = 3;

        for (int attempt = 0; attempt < maxRetries; attempt++) {
            try {
                imageBytes = restClient.post()
                        .uri(url)
                        .header("Authorization", "Bearer " + apiToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of("inputs", enhancedPrompt))
                        .retrieve()
                        .body(byte[].class);
                break; // success
            } catch (Exception e) {
                String msg = e.getMessage() != null ? e.getMessage() : "";
                // Retry on 503 (model loading)
                if (msg.contains("503") && attempt < maxRetries - 1) {
                    try {
                        Thread.sleep(20000);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new IOException("Image generation interrupted", ie);
                    }
                } else {
                    throw new IOException("Image generation failed: " + msg, e);
                }
            }
        }

        if (imageBytes == null || imageBytes.length == 0) {
            throw new IOException("No image data received from API");
        }

        String filename = UUID.randomUUID() + ".png";
        Path filePath = Paths.get(UPLOAD_DIR, filename);
        Files.write(filePath, imageBytes);

        return "/uploads/" + filename;
    }
}
