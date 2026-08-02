package com.mini.project.component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

/**
 * JwtComponent — Phase 3 Upgrade
 *
 * WHAT CHANGED vs original:
 *  - SECRET key is now loaded from application.yaml (${jwt.secret})
 *    instead of being randomly regenerated on every server restart.
 *    The old code generated a new key on each restart, which invalidated
 *    ALL existing user tokens after every deploy — a critical production bug.
 *  - Token expiration loaded from config (${jwt.expiration-ms}).
 *  - Migrated from deprecated Jwts.parser() to Jwts.parserBuilder().
 *  - Added isTokenExpired() helper for cleaner JwtFilter logic.
 */
@Component
public class JwtComponent {

    @Value("${jwt.secret}")
    private String secretString;

    @Value("${jwt.expiration-ms:3600000}")
    private long expirationMs;

    private Key getSigningKey() {
        // HMAC-SHA key derived from the configured secret string
        byte[] keyBytes = secretString.getBytes();
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(String email) {
        return Jwts.builder()
                .setSubject(email)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractEmail(String token) {
        return extractAllClaims(token).getSubject();
    }

    public boolean isTokenExpired(String token) {
        return extractAllClaims(token).getExpiration().before(new Date());
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}