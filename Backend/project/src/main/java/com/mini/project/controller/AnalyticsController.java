package com.mini.project.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;

import java.util.Map;
@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final JdbcTemplate jdbcTemplate;




    @GetMapping("/{productId}")
    public Map<String, Object> getAllAnalytics(@PathVariable Long productId) {

        Map<String, Object> result = new HashMap<>();

        result.put("sentiment", jdbcTemplate.queryForList(
                "SELECT sentiment, COUNT(*) as count FROM review WHERE product_id = ? GROUP BY sentiment",
                productId
        ));

        result.put("severity", jdbcTemplate.queryForList(
                "SELECT severity, COUNT(*) as count FROM review WHERE product_id = ? GROUP BY severity",
                productId
        ));

        result.put("categories", jdbcTemplate.queryForList(
                """
                SELECT rc.category_name, COUNT(*) as count
                FROM review_category rc
                JOIN review r ON r.id = rc.review_id
                WHERE r.product_id = ?
                GROUP BY rc.category_name
                """,
                productId
        ));

        result.put("keywords", jdbcTemplate.queryForList(
                """
                SELECT rk.keyword, COUNT(*) as count
                FROM review_keyword rk
                JOIN review r ON r.id = rk.review_id
                WHERE r.product_id = ?
                GROUP BY rk.keyword
                ORDER BY count DESC
                LIMIT 10
                """,
                productId
        ));

        return result;
    }

}