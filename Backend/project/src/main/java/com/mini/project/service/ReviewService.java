package com.mini.project.service;

import com.mini.project.entity.Review;
import com.mini.project.entity.ReviewCategory;
import com.mini.project.entity.ReviewKeyword;
import com.mini.project.entity.User;
import com.mini.project.repository.ReviewCategoryRepository;
import com.mini.project.repository.ReviewKeywordRepository;
import com.mini.project.repository.ReviewRepository;
import com.mini.project.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;

/**
 * ReviewService — Instant AI Response Pipeline
 *
 * UPGRADE:
 *  - Calls Groq-powered AI service directly (~300ms latency).
 *  - Enriches sentiment, severity, categories, and customer response in the SAME request.
 *  - Returns the real AI response immediately to the client (no more "Refresh shortly").
 *  - Graceful fallback if the AI microservice is temporarily sleeping or unreachable.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository         reviewRepository;
    private final ReviewCategoryRepository categoryRepository;
    private final ReviewKeywordRepository  keywordRepository;
    private final UserRepository           userRepository;
    private final RestTemplate             restTemplate;

    @Value("${ai.service.url:http://localhost:8000/analyze}")
    private String aiServiceUrl;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public Review submitReview(Review review) {

        // 1. Authenticate calling user
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new RuntimeException("User not authenticated");
        }
        Object principal = auth.getPrincipal();
        if (!(principal instanceof User user)) {
            throw new RuntimeException("Invalid user principal");
        }
        review.setUser(user);

        // 2. Call AI Microservice directly for instant response
        try {
            log.info("Sending review text to AI service at: {}", aiServiceUrl);
            Map<String, String> request = Map.of("review", review.getReviewText());
            String response = restTemplate.postForObject(aiServiceUrl, request, String.class);
            JsonNode json   = objectMapper.readTree(response);

            review.setSentiment(json.path("sentiment").asText("neutral").trim().toLowerCase());
            review.setSeverity (json.path("severity").asText("low").trim().toLowerCase());
            review.setSummary  (json.path("summary").asText("Review processed successfully"));
            review.setAiResponse(json.path("ai_response").asText("Thank you for your feedback! Our support team has logged your review."));

            Review saved = reviewRepository.save(review);

            // Save extracted categories
            if (json.has("categories")) {
                for (JsonNode cat : json.get("categories")) {
                    categoryRepository.save(new ReviewCategory(null, saved, cat.asText()));
                }
            }

            // Save extracted keywords
            if (json.has("keywords")) {
                for (JsonNode kw : json.get("keywords")) {
                    keywordRepository.save(new ReviewKeyword(null, saved, kw.asText()));
                }
            }

            log.info("✓ Review id={} successfully enriched by AI with sentiment={}", saved.getId(), saved.getSentiment());
            return saved;

        } catch (Exception e) {
            log.error("AI service call failed or timed out ({}): {}. Falling back to default response.", aiServiceUrl, e.getMessage());

            // Graceful fallback: Still save the review so data is never lost!
            review.setSentiment("NEUTRAL");
            review.setSeverity("LOW");
            review.setSummary("Review logged");
            review.setAiResponse("Thank you for your feedback! Our customer care team is reviewing your comments.");

            return reviewRepository.save(review);
        }
    }

    public List<Review> getReviewsByUser(Long userId) {
        return reviewRepository.findByUserId(userId);
    }
}
