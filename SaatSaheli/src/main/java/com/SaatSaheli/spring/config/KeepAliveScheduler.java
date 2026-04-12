package com.SaatSaheli.spring.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

/**
 * Pings the app every 10 minutes to keep Render free-tier from sleeping.
 * The self-ping URL is derived from the RENDER_EXTERNAL_URL env var
 * (automatically set by Render), or falls back to localhost.
 */
@Component
@EnableScheduling
public class KeepAliveScheduler {

    private static final Logger log = LoggerFactory.getLogger(KeepAliveScheduler.class);

    @Value("${RENDER_EXTERNAL_URL:}")
    private String renderUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    @Scheduled(fixedRate = 600000) // every 10 minutes
    public void keepAlive() {
        if (renderUrl == null || renderUrl.isEmpty()) {
            return; // skip when running locally
        }
        try {
            String healthUrl = renderUrl + "/api/health";
            restTemplate.getForObject(healthUrl, String.class);
            log.debug("Keep-alive ping sent to {}", healthUrl);
        } catch (Exception e) {
            log.warn("Keep-alive ping failed: {}", e.getMessage());
        }
    }
}
