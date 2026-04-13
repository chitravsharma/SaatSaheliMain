package com.SaatSaheli.spring.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
public class RecaptchaService {

    private static final Logger log = LoggerFactory.getLogger(RecaptchaService.class);
    private static final String VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

    @Value("${RECAPTCHA_SECRET_KEY:}")
    private String secretKey;

    private final RestTemplate restTemplate = new RestTemplate();

    public boolean verify(String token, String clientIp) {
        if (secretKey == null || secretKey.isBlank()) {
            // No key configured — skip verification so local dev without keys still works.
            // Production must always set RECAPTCHA_SECRET_KEY.
            log.warn("RECAPTCHA_SECRET_KEY not set — skipping reCAPTCHA verification");
            return true;
        }
        if (token == null || token.isBlank()) {
            return false;
        }
        try {
            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("secret", secretKey);
            form.add("response", token);
            if (clientIp != null && !clientIp.isBlank()) {
                form.add("remoteip", clientIp);
            }
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            HttpEntity<MultiValueMap<String, String>> req = new HttpEntity<>(form, headers);

            @SuppressWarnings("unchecked")
            Map<String, Object> body = restTemplate.postForObject(VERIFY_URL, req, Map.class);
            if (body == null) return false;

            boolean success = Boolean.TRUE.equals(body.get("success"));
            if (!success) {
                log.warn("reCAPTCHA verification failed: {}", body.get("error-codes"));
            }
            return success;
        } catch (Exception e) {
            log.error("reCAPTCHA verification error", e);
            return false;
        }
    }
}
