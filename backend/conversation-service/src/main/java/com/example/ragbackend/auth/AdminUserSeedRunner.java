package com.example.ragbackend.auth;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminUserSeedRunner implements CommandLineRunner {

    private final AdminJdbcRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminUserSeedRunner(AdminJdbcRepository adminUserRepository, PasswordEncoder passwordEncoder) {
        this.adminUserRepository = adminUserRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        if (adminUserRepository.count() > 0) {
            return;
        }

        AdminUserEntity admin = new AdminUserEntity();
        admin.setEmail("admin@example.com");
        admin.setPasswordHash(passwordEncoder.encode("admin"));

        adminUserRepository.save(admin);
    }
}
