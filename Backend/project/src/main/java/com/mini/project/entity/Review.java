package com.mini.project.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    private Long productId;

    @Column(columnDefinition = "TEXT")
    private String reviewText;

    private String sentiment;
    private String severity;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(columnDefinition = "TEXT")
    private String aiResponse;


    @OneToMany(mappedBy = "review", cascade = CascadeType.ALL)
    private List<ReviewCategory> categories;

    @OneToMany(mappedBy = "review", cascade = CascadeType.ALL)
    private List<ReviewKeyword> keywords;
}