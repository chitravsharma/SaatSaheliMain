package com.SaatSaheli.spring.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

import static java.util.Map.entry;

@Service
public class ImageGenerationService {

    private static final Pattern DEVANAGARI = Pattern.compile("[\\u0900-\\u097F]");
    private static final String TRANSLATION_MODEL = "Helsinki-NLP/opus-mt-hi-en";
    private static final ObjectMapper objectMapper = new ObjectMapper();

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

    @Autowired
    private GoogleDriveService googleDriveService;

    private final RestClient restClient = RestClient.create();

    public String generateImage(String prompt, String style) throws IOException {
        if (prompt == null || prompt.trim().isEmpty()) {
            throw new IllegalArgumentException("Prompt cannot be empty");
        }
        if ("YOUR_HF_TOKEN_HERE".equals(apiToken) || apiToken == null || apiToken.isBlank()) {
            throw new IllegalStateException("Hugging Face API token is not configured");
        }

        // Translate Hindi text to English for Stable Diffusion
        String processedPrompt = prompt.trim();
        if (DEVANAGARI.matcher(processedPrompt).find()) {
            processedPrompt = translateHindiToEnglish(processedPrompt);
        }

        String prefix = STYLE_PREFIXES.getOrDefault(
                style != null ? style : "general", STYLE_PREFIXES.get("general"));
        String enhancedPrompt = prefix + processedPrompt;
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

        // Upload to Google Drive instead of local filesystem
        String filename = UUID.randomUUID() + ".png";
        return googleDriveService.uploadBytes(imageBytes, filename, "image/png");
    }

    private String translateHindiToEnglish(String hindiText) throws IOException {
        String url = "https://router.huggingface.co/hf-inference/models/" + TRANSLATION_MODEL;
        try {
            byte[] responseBytes = restClient.post()
                    .uri(url)
                    .header("Authorization", "Bearer " + apiToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("inputs", hindiText))
                    .retrieve()
                    .body(byte[].class);

            if (responseBytes != null && responseBytes.length > 0) {
                JsonNode root = objectMapper.readTree(responseBytes);
                if (root.isArray() && !root.isEmpty()) {
                    String translated = root.get(0).path("translation_text").asText("");
                    if (!translated.isEmpty()) {
                        return translated;
                    }
                }
            }
        } catch (Exception e) {
            // If translation fails, return original text as fallback
        }
        return hindiText;
    }
}
