package com.mini.project.controller;

import com.mini.project.component.JwtComponent;
import com.mini.project.entity.User;
import com.mini.project.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.mini.project.dto.AuthResponse;
import org.springframework.http.ResponseEntity;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtComponent jwtUtil;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody User user) {

        User existingUser = userRepository.findByEmail(user.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!existingUser.getPassword().equals(user.getPassword())) {
            throw new RuntimeException("Invalid credentials");
        }

        String token = jwtUtil.generateToken(existingUser.getEmail());
        AuthResponse response = new AuthResponse(token, existingUser.getId(), existingUser.getEmail(), existingUser.getName(), existingUser.getRole());
        return ResponseEntity.ok(response);
    }
}
