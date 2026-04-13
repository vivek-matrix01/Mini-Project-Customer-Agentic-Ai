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
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;


import java.util.Map;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ReviewCategoryRepository categoryRepository;
    private final ReviewKeywordRepository keywordRepository;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public Review submitReview(Review review) {


        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("User not authenticated");
        }

        Object principal = authentication.getPrincipal();

        if (!(principal instanceof User user)) {
            throw new RuntimeException("Invalid user principal");
        }

        review.setUser(user);

        JsonNode json = null;


        try {
            String url = "http://localhost:8000/analyze";

            Map<String, String> request = Map.of("review", review.getReviewText());

            String response = restTemplate.postForObject(url, request, String.class);

            json = objectMapper.readTree(response);

            review.setSentiment(json.get("sentiment").asText());
            review.setSeverity(json.get("severity").asText());
            review.setSummary(json.get("summary").asText());

        } catch (Exception e) {

            System.out.println("AI Service Error: " + e.getMessage());

            review.setSentiment("UNKNOWN");
            review.setSeverity("LOW");
            review.setSummary("AI service unavailable");
        }


        Review saved = reviewRepository.save(review);


        if (json != null && json.has("categories")) {
            for (JsonNode cat : json.get("categories")) {
                categoryRepository.save(
                        new ReviewCategory(null, saved, cat.asText())
                );
            }
        }


        if (json != null && json.has("keywords")) {
            for (JsonNode kw : json.get("keywords")) {
                keywordRepository.save(
                        new ReviewKeyword(null, saved, kw.asText())
                );
            }
        }

        return saved;
    }
}