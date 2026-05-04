package com.mini.project.controller;

import com.mini.project.entity.Review;
import com.mini.project.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping
    public ResponseEntity<?> submitReview(@RequestBody Review review) {
        try {
            return ResponseEntity.ok(reviewService.submitReview(review));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }

    @GetMapping("/user")
    public ResponseEntity<?> getReviewsByUser() {
        try {
            org.springframework.security.core.Authentication authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401).body("User not authenticated");
            }
            Object principal = authentication.getPrincipal();
            if (!(principal instanceof com.mini.project.entity.User)) {
                return ResponseEntity.status(401).body("Invalid user principal");
            }
            com.mini.project.entity.User user = (com.mini.project.entity.User) principal;
            return ResponseEntity.ok(reviewService.getReviewsByUser(user.getId()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }
}