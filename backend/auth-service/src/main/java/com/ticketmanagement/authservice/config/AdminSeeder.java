package com.ticketmanagement.authservice.config;

import com.ticketmanagement.authservice.entity.Role;
import com.ticketmanagement.authservice.entity.User;
import com.ticketmanagement.authservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class AdminSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${admin.username:admin}")
    private String adminUsername;

    @Value("${admin.email:admin@example.com}")
    private String adminEmail;

    @Value("${admin.password:}")
    private String adminPassword;

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.count() == 0) {
            if (adminPassword == null || adminPassword.isBlank()) {
                log.error("Admin password not set! Please set ADMIN_PASSWORD environment variable.");
                return;
            }

            User admin = new User();
            admin.setUsername(adminUsername);
            admin.setEmail(adminEmail);
            admin.setPasswordHash(passwordEncoder.encode(adminPassword));
            admin.setRole(Role.ADMIN);
            admin.setFullName("System Administrator");
            admin.setActive(true);

            userRepository.save(admin);
            log.info("Admin user created successfully!");
        }
    }
}
