package com.mini.project.controller;

import com.mini.project.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * ChatController — Secure API Gateway for Admin AI Assistant
 *
 * ARCHITECTURAL UPGRADE:
 *  - Previously, the React frontend bypassed Spring Boot and contacted the
 *    FastAPI Python service directly on port 8000, creating an insecure
 *    public backdoor and requiring the frontend to maintain VITE_AI_SERVICE_URL.
 *  - Now, all chat requests pass through this controller:
 *      1. Validates the caller's JWT token.
 *      2. Enforces Role-Based Access Control (role == "ADMIN").
 *      3. Proxies the prompt and analytics context securely to the internal AI microservice.
 *  - Result: The AI microservice remains private and hidden inside the backend subnet.
 */
@Slf4j
@RestController
@RequestMapping("/admin/chat")
@RequiredArgsConstructor
public class ChatController {

    private final RestTemplate restTemplate;

    @Value("${ai.service.chat-url:http://localhost:8000/chat}")
    private String aiChatUrl;

    @PostMapping
    public ResponseEntity<?> chatWithAi(@RequestBody Map<String, Object> payload) {
        // 1. Authenticate and verify ADMIN authorization
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        Object principal = auth.getPrincipal();
        if (!(principal instanceof User user)) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid user credentials"));
        }

        if (!"ADMIN".equalsIgnoreCase(user.getRole())) {
            log.warn("Non-admin user id={} attempted to access /admin/chat", user.getId());
            return ResponseEntity.status(403).body(Map.of("error", "Access denied. Admin privileges required."));
        }

        // 2. Securely proxy the payload to the internal Python AI microservice
        try {
            log.info("Admin [{}] sending prompt to AI microservice at {}", user.getEmail(), aiChatUrl);
            Map<?, ?> response = restTemplate.postForObject(aiChatUrl, payload, Map.class);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to forward chat to AI microservice at {}: {}", aiChatUrl, e.getMessage());
            return ResponseEntity.status(503).body(Map.of(
                "response", "⚠ The AI service is currently unavailable. Please verify the Python service is running."
            ));
        }
    }
}
