package com.example.ragbackend.auth;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminUserSeedRunner implements CommandLineRunner {

    private final AdminUserRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminUserSeedRunner(AdminUserRepository adminUserRepository, PasswordEncoder passwordEncoder) {
        this.adminUserRepository = adminUserRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (adminUserRepository.count() > 0) {
            return;
        }

        AdminUserEntity admin = new AdminUserEntity();
        admin.setEmail("admin@rag-portal.com");
        admin.setPasswordHash(passwordEncoder.encode("Admin123!"));
        adminUserRepository.save(admin);
    }
}
