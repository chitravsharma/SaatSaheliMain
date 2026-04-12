package com.SaatSaheli.spring.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;

@Service
public class TranslationService {

    private static final Logger log = LoggerFactory.getLogger(TranslationService.class);
    private static final int QUERY_LIMIT = 500;
    private static final Pattern DEVANAGARI = Pattern.compile("[\\u0900-\\u097F]");
    private static final HttpClient httpClient = HttpClient.newHttpClient();
    private static final ObjectMapper mapper = new ObjectMapper();

    /**
     * Translate English text to Hindi using MyMemory API.
     * Splits long text by paragraphs/sentences to stay within API limits.
     * Returns original text if translation fails.
     */
    public String translateToHindi(String text) {
        if (text == null || text.isBlank()) return text;
        // Already contains Devanagari — likely already Hindi
        if (DEVANAGARI.matcher(text).find()) return text;

        // Strip HTML for translation, but keep for short content
        String plain = stripHtml(text).trim();
        if (plain.isEmpty()) return text;

        if (plain.length() <= QUERY_LIMIT) {
            return translateChunk(plain);
        }

        // Split by paragraphs (double newline or period-space boundaries)
        String[] paragraphs = plain.split("\\n+");
        StringBuilder result = new StringBuilder();
        for (int i = 0; i < paragraphs.length; i++) {
            String para = paragraphs[i].trim();
            if (para.isEmpty()) continue;
            if (i > 0) result.append("\n");
            if (para.length() <= QUERY_LIMIT) {
                result.append(translateChunk(para));
            } else {
                // Further split by sentences
                String[] sentences = para.split("(?<=[.!?])\\s+");
                StringBuilder buf = new StringBuilder();
                for (String s : sentences) {
                    if (buf.length() + s.length() > QUERY_LIMIT && buf.length() > 0) {
                        result.append(translateChunk(buf.toString().trim()));
                        result.append(" ");
                        buf = new StringBuilder();
                    }
                    buf.append(s).append(" ");
                }
                if (buf.length() > 0) {
                    result.append(translateChunk(buf.toString().trim()));
                }
            }
        }
        return result.toString();
    }

    private String translateChunk(String text) {
        if (text == null || text.isBlank()) return text;
        if (DEVANAGARI.matcher(text).find()) return text;

        // Try Google Translate free endpoint first
        String result = translateViaGoogle(text);
        if (result != null && !result.equals(text)) return result;

        // Fallback to MyMemory API
        result = translateViaMyMemory(text);
        if (result != null && !result.equals(text)) return result;

        return text;
    }

    private String translateViaGoogle(String text) {
        try {
            String encoded = URLEncoder.encode(text, StandardCharsets.UTF_8);
            URI uri = URI.create("https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t&q=" + encoded);
            HttpRequest request = HttpRequest.newBuilder(uri)
                    .GET()
                    .header("User-Agent", "Mozilla/5.0")
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode root = mapper.readTree(response.body());
                // Response is [[["translated","original",...],...],...]
                JsonNode sentences = root.get(0);
                if (sentences != null && sentences.isArray()) {
                    StringBuilder sb = new StringBuilder();
                    for (JsonNode sentence : sentences) {
                        if (sentence.isArray() && sentence.size() > 0) {
                            sb.append(sentence.get(0).asText(""));
                        }
                    }
                    String translated = sb.toString();
                    if (!translated.isBlank() && DEVANAGARI.matcher(translated).find()) {
                        return translated;
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Google translate failed (length={}): {}", text.length(), e.getMessage());
        }
        return null;
    }

    private String translateViaMyMemory(String text) {
        try {
            String encoded = URLEncoder.encode(text, StandardCharsets.UTF_8);
            URI uri = URI.create("https://api.mymemory.translated.net/get?q=" + encoded + "&langpair=en|hi");
            HttpRequest request = HttpRequest.newBuilder(uri)
                    .GET()
                    .header("Accept", "application/json")
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode root = mapper.readTree(response.body());
                String translated = root.path("responseData").path("translatedText").asText("");
                if (!translated.isBlank() && !translated.startsWith("MYMEMORY WARNING")) {
                    return translated;
                }
            }
        } catch (Exception e) {
            log.warn("MyMemory translate failed (length={}): {}", text.length(), e.getMessage());
        }
        return null;
    }

    private String stripHtml(String html) {
        if (html == null) return "";
        // Replace block-level tags with newlines
        String result = html.replaceAll("(?i)<br\\s*/?>", "\n")
                .replaceAll("(?i)</(p|div|li|h[1-6]|tr|blockquote)>", "\n")
                .replaceAll("(?i)<(p|div|li|h[1-6]|tr|blockquote)[^>]*>", "");
        // Strip remaining tags
        return result.replaceAll("<[^>]+>", "").replaceAll("&nbsp;", " ").replaceAll("&amp;", "&");
    }
}
