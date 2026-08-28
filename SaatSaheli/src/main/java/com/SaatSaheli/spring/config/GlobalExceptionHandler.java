package com.SaatSaheli.spring.config;

import org.apache.catalina.connector.ClientAbortException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import jakarta.servlet.http.HttpServletRequest;

import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<?> handleMaxUploadSize(MaxUploadSizeExceededException e) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(Map.of("error", "File size exceeds the maximum allowed limit"));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
    }

    // Client disconnected mid-response (closed tab, mobile blip, proxy timeout).
    // Socket is already broken — any response attempt throws again, so we just log and bail.
    @ExceptionHandler({AsyncRequestNotUsableException.class, ClientAbortException.class})
    public void handleClientDisconnect(Exception e) {
        log.debug("Client disconnected before response completed: {}", e.getMessage());
    }

    // Missing static resource — mostly scanner probes (e.g. /api/.env, /.git/config).
    // Return 404 without a stack trace; debug-level so legitimate misses are still inspectable.
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<?> handleNoResourceFound(NoResourceFoundException e) {
        log.debug("No static resource: {}", e.getResourcePath());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", "Not found"));
    }

    // A path/query value that can't be converted to the expected type — e.g. a
    // bot hitting /api/articles/public (where {id} expects a number). Client error,
    // not a server fault: return a clean 400 without an ERROR-level stack trace.
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<?> handleTypeMismatch(MethodArgumentTypeMismatchException e) {
        log.debug("Bad request parameter '{}': could not convert '{}'", e.getName(), e.getValue());
        return ResponseEntity.badRequest()
                .body(Map.of("error", "Invalid value for '" + e.getName() + "'"));
    }

    // Wrong HTTP verb for a path that does exist — overwhelmingly scanner traffic
    // POSTing at the site (e.g. POST /wp-login.php, POST /index.html). SPA fallback
    // means those paths resolve to a real static resource, so they get past the
    // NoResourceFoundException handler above and die in ResourceHttpRequestHandler's
    // method check instead. Without this they reach the catch-all and are reported as
    // 500 with a full ERROR stack trace, which is both the wrong status and enough log
    // noise to bury real faults. Answer 405 and log the method + path at debug.
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<?> handleMethodNotSupported(HttpRequestMethodNotSupportedException e,
                                                      HttpServletRequest request) {
        log.debug("Method not supported: {} {}", request.getMethod(), request.getRequestURI());
        ResponseEntity.BodyBuilder response = ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED);
        if (e.getSupportedHttpMethods() != null) {
            response.allow(e.getSupportedHttpMethods().toArray(new org.springframework.http.HttpMethod[0]));
        }
        return response.body(Map.of("error", "Method not allowed"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGenericException(Exception e) {
        // Log the full stack trace server-side, but return a safe message to the client
        log.error("Unhandled exception", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "An unexpected error occurred. Please try again."));
    }
}
