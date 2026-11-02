package com.mini.project.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final JdbcTemplate jdbcTemplate;

    @GetMapping("/{productId}")
    public Map<String, Object> getAllAnalytics(@PathVariable Long productId) {

        Map<String, Object> result = new HashMap<>();

        // 1. Normalized Sentiment Breakdown (LOWER to group 'Positive' and 'positive' cleanly)
        result.put("sentiment", jdbcTemplate.queryForList(
                """
                SELECT LOWER(TRIM(sentiment)) as sentiment, COUNT(*) as count 
                FROM review 
                WHERE product_id = ? 
                  AND sentiment IS NOT NULL 
                  AND LOWER(TRIM(sentiment)) NOT IN ('pending', 'unknown')
                GROUP BY LOWER(TRIM(sentiment))
                """,
                productId
        ));

        // 2. Normalized Severity Breakdown
        result.put("severity", jdbcTemplate.queryForList(
                """
                SELECT LOWER(TRIM(severity)) as severity, COUNT(*) as count 
                FROM review 
                WHERE product_id = ? 
                  AND severity IS NOT NULL 
                  AND LOWER(TRIM(severity)) NOT IN ('pending', 'unknown')
                GROUP BY LOWER(TRIM(severity))
                """,
                productId
        ));

        // 3. Category Distribution
        result.put("categories", jdbcTemplate.queryForList(
                """
                SELECT LOWER(TRIM(rc.category_name)) as category_name, COUNT(*) as count
                FROM review_category rc
                JOIN review r ON r.id = rc.review_id
                WHERE r.product_id = ?
                GROUP BY LOWER(TRIM(rc.category_name))
                ORDER BY count DESC
                """,
                productId
        ));

        // 4. Top Keywords
        result.put("keywords", jdbcTemplate.queryForList(
                """
                SELECT LOWER(TRIM(rk.keyword)) as keyword, COUNT(*) as count
                FROM review_keyword rk
                JOIN review r ON r.id = rk.review_id
                WHERE r.product_id = ?
                GROUP BY LOWER(TRIM(rk.keyword))
                ORDER BY count DESC
                LIMIT 10
                """,
                productId
        ));

        return result;
    }
}
