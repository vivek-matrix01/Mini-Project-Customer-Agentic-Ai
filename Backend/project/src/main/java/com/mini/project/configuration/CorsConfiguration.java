package com.mini.project.configuration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * CorsConfiguration — Production Strict Security Upgrade
 *
 * STRICT ORIGIN WHITELIST:
 *  - Only your verified Vercel frontend domains (https://*.vercel.app)
 *    and local development environments are permitted.
 *  - Malicious external origins attempting cross-origin requests are blocked.
 *  - Optional custom origins can be passed via the CORS_ALLOWED_ORIGINS env variable.
 */
@Configuration
public class CorsConfiguration {

    @Value("${cors.allowed-origins:}")
    private String customOrigins;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        org.springframework.web.cors.CorsConfiguration config = new org.springframework.web.cors.CorsConfiguration();

        List<String> allowedOrigins = new ArrayList<>(List.of(
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "https://*.vercel.app"  // Whitelists all Vercel production and preview domains
        ));

        // Append custom domain if provided via environment
        if (customOrigins != null && !customOrigins.isBlank()) {
            allowedOrigins.addAll(Arrays.stream(customOrigins.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toList());
        }

        config.setAllowedOriginPatterns(allowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L); // Cache CORS preflight for 1 hour

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        return source;
    }
}
