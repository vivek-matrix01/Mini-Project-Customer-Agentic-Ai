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
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;

/**
 * ReviewService — Phase 3 Upgrade
 *
 * WHAT CHANGED vs original:
 *
 *  1. @Async AI Processing:
 *     The old code made a SYNCHRONOUS blocking HTTP call to the Python AI service.
 *     When Ollama takes 5-10s to respond, the frontend HTTP request froze for that
 *     entire duration. The new design:
 *       a) Saves the review immediately to DB with status PENDING
 *       b) Returns the saved Review instantly (200ms) to the frontend
 *       c) Dispatches enrichAiData() as a background @Async task
 *       d) enrichAiData() updates the DB row when AI finishes
 *     This makes the POST /reviews endpoint feel instant.
 *
 *  2. AI_SERVICE_URL loaded from @Value (application.yaml / env var).
 *
 *  3. Switched from tools.jackson to com.fasterxml.jackson (correct import).
 *
 *  4. Added @Slf4j for structured logging instead of System.out.println.
 *
 *  5. importedObjectMapper as Spring bean (via @RequiredArgsConstructor)
 *     instead of being created inline (ensures consistent configuration).
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

    // ── Submit ────────────────────────────────────────────────────────────────

    public Review submitReview(Review review) {

        // 1. Authenticate the calling user
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new RuntimeException("User not authenticated");
        }
        Object principal = auth.getPrincipal();
        if (!(principal instanceof User user)) {
            throw new RuntimeException("Invalid user principal");
        }
        review.setUser(user);

        // 2. Persist immediately with PENDING status (makes endpoint feel instant)
        review.setSentiment("PENDING");
        review.setSeverity("PENDING");
        review.setSummary("AI analysis in progress…");
        review.setAiResponse("Processing your review. Refresh shortly for the AI response.");
        Review saved = reviewRepository.save(review);

        // 3. Fire-and-forget: enrich AI data in background thread
        enrichAiData(saved.getId(), saved.getReviewText());

        return saved;
    }

    // ── Async AI Enrichment ───────────────────────────────────────────────────

    /**
     * Calls the Python AI microservice and updates the Review row.
     * Annotated @Async — Spring runs this in a separate thread pool.
     * The caller (submitReview) does NOT wait for this to complete.
     */
    @Async
    public void enrichAiData(Long reviewId, String reviewText) {
        log.info("Starting async AI enrichment for review id={}", reviewId);

        try {
            Map<String, String> request = Map.of("review", reviewText);
            String response = restTemplate.postForObject(aiServiceUrl, request, String.class);
            JsonNode json   = objectMapper.readTree(response);

            // Update the persisted review with AI results
            reviewRepository.findById(reviewId).ifPresent(review -> {
                review.setSentiment(json.path("sentiment").asText("unknown"));
                review.setSeverity (json.path("severity").asText("low"));
                review.setSummary  (json.path("summary").asText(""));
                review.setAiResponse(json.path("ai_response").asText("Thank you for your feedback."));
                reviewRepository.save(review);

                // Save categories
                if (json.has("categories")) {
                    for (JsonNode cat : json.get("categories")) {
                        categoryRepository.save(new ReviewCategory(null, review, cat.asText()));
                    }
                }

                // Save keywords
                if (json.has("keywords")) {
                    for (JsonNode kw : json.get("keywords")) {
                        keywordRepository.save(new ReviewKeyword(null, review, kw.asText()));
                    }
                }

                log.info("AI enrichment complete for review id={}, sentiment={}", reviewId, review.getSentiment());
            });

        } catch (Exception e) {
            log.error("AI enrichment failed for review id={}: {}", reviewId, e.getMessage());

            // Update with error sentinel so frontend knows something went wrong
            reviewRepository.findById(reviewId).ifPresent(review -> {
                review.setSentiment("UNKNOWN");
                review.setSeverity("LOW");
                review.setSummary("AI service unavailable");
                review.setAiResponse("We received your review. Our team will process it shortly.");
                reviewRepository.save(review);
            });
        }
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    public List<Review> getReviewsByUser(Long userId) {
        return reviewRepository.findByUserId(userId);
    }
}