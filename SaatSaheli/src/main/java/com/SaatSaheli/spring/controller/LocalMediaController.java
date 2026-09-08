package com.SaatSaheli.spring.controller;

import com.SaatSaheli.spring.service.LocalMediaStorageService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

/**
 * Serves files written by {@link LocalMediaStorageService} back to the browser, so
 * local development renders uploaded images the same way production serves them
 * from the R2 public host.
 *
 * <p>A controller rather than a static resource handler on purpose: SpaForwardingConfig
 * already registers a catch-all {@code /**} handler that falls back to index.html, and
 * controller mappings are matched ahead of resource handlers, so this needs no ordering
 * games to win.
 *
 * <p>Only exists when {@code app.media.storage=local}; production never exposes it.
 */
@RestController
@ConditionalOnProperty(name = "app.media.storage", havingValue = "local")
public class LocalMediaController {

    private final LocalMediaStorageService storage;

    public LocalMediaController(LocalMediaStorageService storage) {
        this.storage = storage;
    }

    @GetMapping("/local-media/{filename}")
    public ResponseEntity<Resource> serve(@PathVariable String filename) throws IOException {
        Path dir = storage.directory();
        // Resolve then confirm containment: a traversal attempt in the path variable
        // must not reach outside the media directory.
        Path file = dir.resolve(filename).normalize();
        if (!file.startsWith(dir) || !Files.isRegularFile(file)) {
            return ResponseEntity.notFound().build();
        }
        String contentType = Files.probeContentType(file);
        return ResponseEntity.ok()
                .contentType(contentType != null
                        ? MediaType.parseMediaType(contentType)
                        : MediaType.APPLICATION_OCTET_STREAM)
                .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS))
                .body(new FileSystemResource(file));
    }
}
