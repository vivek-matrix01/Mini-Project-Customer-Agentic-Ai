package com.mini.project.repository;

import com.mini.project.entity.ReviewKeyword;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReviewKeywordRepository extends JpaRepository<ReviewKeyword, Long> {

    List<ReviewKeyword> findByReview_ProductId(Long productId);

}