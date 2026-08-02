package com.mini.project.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * CorsConfiguration — Production Upgrade
 *
 * FIXES THE CRITICAL "Failed to fetch" BUG:
 *  Old code hardcoded setAllowedOrigins(List.of("http://localhost:5174")),
 *  which rejected ALL Vercel origins (e.g. https://your-app.vercel.app).
 *  When CORS preflight (OPTIONS) is rejected by Spring, the browser aborts
 *  and throws "Failed to fetch".
 *
 *  New code uses setAllowedOriginPatterns(List.of("*")) which dynamically
 *  allows any domain (Vercel, localhost, mobile) while still allowing credentials.
 */
@Configuration
public class CorsConfiguration {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        org.springframework.web.cors.CorsConfiguration config = new org.springframework.web.cors.CorsConfiguration();

        // Allow any origin (Vercel, localhost, Railway, etc.)
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        return source;
    }
}
