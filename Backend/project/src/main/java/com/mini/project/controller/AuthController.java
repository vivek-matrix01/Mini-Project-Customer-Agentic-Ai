package com.mini.project.controller;

import com.mini.project.component.JwtComponent;
import com.mini.project.entity.User;
import com.mini.project.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.mini.project.dto.AuthResponse;
import org.springframework.http.ResponseEntity;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtComponent jwtUtil;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User user) {

        if (user.getEmail() == null || user.getPassword() == null) {
            return ResponseEntity.status(400).body(Map.of("error", "Email and password are required"));
        }

        Optional<User> optUser = userRepository.findByEmail(user.getEmail().trim());
        if (optUser.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        }

        User existingUser = optUser.get();
        if (!existingUser.getPassword().equals(user.getPassword())) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        }

        String token = jwtUtil.generateToken(existingUser.getEmail());
        AuthResponse response = new AuthResponse(
                token,
                existingUser.getId(),
                existingUser.getEmail(),
                existingUser.getName(),
                existingUser.getRole()
        );
        return ResponseEntity.ok(response);
    }
}
