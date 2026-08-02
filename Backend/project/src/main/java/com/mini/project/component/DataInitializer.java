package com.mini.project.component;

import com.mini.project.entity.User;
import com.mini.project.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * DataInitializer — Automatically seeds default Admin accounts on application startup.
 *
 * Pre-created Admin Credentials:
 *   Email:    admin@gmail.com  (or admin)
 *   Password: admin
 *   Role:     ADMIN
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;

    @Override
    public void run(String... args) {
        // Seed admin@gmail.com / admin
        if (userRepository.findByEmail("admin@gmail.com").isEmpty()) {
            User admin = new User(null, "System Administrator", "admin@gmail.com", "admin", "ADMIN");
            userRepository.save(admin);
            log.info("✓ Pre-seeded Admin user: email=admin@gmail.com, password=admin");
        }

        // Seed short email 'admin' / 'admin' for convenient login
        if (userRepository.findByEmail("admin").isEmpty()) {
            User adminShort = new User(null, "System Administrator", "admin", "admin", "ADMIN");
            userRepository.save(adminShort);
            log.info("✓ Pre-seeded Admin user: email=admin, password=admin");
        }
    }
}
