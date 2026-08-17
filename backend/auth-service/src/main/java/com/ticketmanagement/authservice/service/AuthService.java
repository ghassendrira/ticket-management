package com.ticketmanagement.authservice.service;

import com.ticketmanagement.authservice.config.JwtConfig;
import com.ticketmanagement.authservice.dto.AuthResponse;
import com.ticketmanagement.authservice.dto.LoginRequest;
import com.ticketmanagement.authservice.dto.RefreshTokenRequest;
import com.ticketmanagement.authservice.entity.RefreshToken;
import com.ticketmanagement.authservice.entity.User;
import com.ticketmanagement.authservice.repository.RefreshTokenRepository;
import com.ticketmanagement.authservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final UserService userService;
    private final JwtConfig jwtConfig;

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsernameOrEmail(request.getUsernameOrEmail(), request.getUsernameOrEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!user.getActive()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account is disabled");
        }

        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account is locked temporarily");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            handleFailedLoginAttempt(user);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        resetFailedLoginAttempts(user);

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken();
        saveRefreshToken(user, refreshToken);

        return new AuthResponse(
                accessToken,
                refreshToken,
                userService.getUserResponse(user)
        );
    }

    public AuthResponse refreshToken(RefreshTokenRequest request) {
        User user = validateAndGetUserFromRefreshToken(request.getRefreshToken());
        revokeRefreshToken(request.getRefreshToken());

        String newAccessToken = jwtService.generateAccessToken(user);
        String newRefreshToken = jwtService.generateRefreshToken();
        saveRefreshToken(user, newRefreshToken);

        return new AuthResponse(
                newAccessToken,
                newRefreshToken,
                userService.getUserResponse(user)
        );
    }

    public void logout(RefreshTokenRequest request) {
        revokeRefreshToken(request.getRefreshToken());
    }

    private void handleFailedLoginAttempt(User user) {
        int newAttempts = user.getFailedLoginAttempts() + 1;
        user.setFailedLoginAttempts(newAttempts);
        if (newAttempts >= 5) {
            user.setLockedUntil(Instant.now().plusSeconds(900));
        }
        userRepository.save(user);
    }

    private void resetFailedLoginAttempts(User user) {
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);
    }

    private void saveRefreshToken(User user, String refreshToken) {
        RefreshToken rt = new RefreshToken();
        rt.setUser(user);
        rt.setToken(refreshToken);
        rt.setExpiresAt(Instant.now().plusMillis(jwtConfig.getRefreshTokenExpirationMs()));
        rt.setRevoked(false);
        refreshTokenRepository.save(rt);
    }

    private User validateAndGetUserFromRefreshToken(String refreshToken) {
        RefreshToken rt = refreshTokenRepository.findByToken(refreshToken)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token"));

        if (rt.getRevoked()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token has been revoked");
        }

        if (rt.getExpiresAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token has expired");
        }

        return rt.getUser();
    }

    private void revokeRefreshToken(String refreshToken) {
        refreshTokenRepository.findByToken(refreshToken).ifPresent(rt -> {
            rt.setRevoked(true);
            refreshTokenRepository.save(rt);
        });
    }
}
