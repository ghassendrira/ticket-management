package com.example.ragbackend.auth;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AdminUserDetailsService implements UserDetailsService {

    private final AdminUserRepository adminUserRepository;

    public AdminUserDetailsService(AdminUserRepository adminUserRepository) {
        this.adminUserRepository = adminUserRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        AdminUserEntity adminUser = adminUserRepository.findByEmail(username)
            .orElseThrow(() -> new UsernameNotFoundException("Admin introuvable"));

        return new User(
            adminUser.getEmail(),
            adminUser.getPasswordHash(),
            List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
        );
    }
}
