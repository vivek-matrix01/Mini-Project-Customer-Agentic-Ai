package com.mini.project.repository;

import com.mini.project.entity.ReviewCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewCategoryRepository extends JpaRepository<ReviewCategory, Long> {

    List<ReviewCategory> findByReview_ProductId(Long productId);

}