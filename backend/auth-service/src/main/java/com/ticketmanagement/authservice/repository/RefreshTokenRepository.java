package com.ticketmanagement.authservice.repository;

import com.ticketmanagement.authservice.entity.RefreshToken;
import com.ticketmanagement.authservice.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findByToken(String token);
    void deleteAllByUser(User user);
    void deleteByUserId(UUID userId);
}
