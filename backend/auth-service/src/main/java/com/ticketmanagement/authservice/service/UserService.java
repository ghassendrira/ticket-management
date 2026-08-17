package com.ticketmanagement.authservice.service;

import com.ticketmanagement.authservice.dto.*;
import com.ticketmanagement.authservice.entity.Role;
import com.ticketmanagement.authservice.entity.User;
import com.ticketmanagement.authservice.repository.RefreshTokenRepository;
import com.ticketmanagement.authservice.repository.UserRepository;
import com.ticketmanagement.authservice.util.PasswordGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    public UserResponse getUserResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole(),
                user.getFullName(),
                user.getActive(),
                user.getMustChangePassword(),
                user.getCreatedAt()
        );
    }

    public List<UserResponse> getAllUsers(String search, Role role, Boolean active) {
        return userRepository.findAllWithFilters(search, role, active).stream()
                .map(this::getUserResponse)
                .collect(Collectors.toList());
    }

    public User getUserById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    public UserResponse getUserResponseById(UUID id) {
        return getUserResponse(getUserById(id));
    }

    @Transactional
    public CreateUserResponse createUser(CreateUserRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already taken");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
        }

        String tempPassword = PasswordGenerator.generateTemporaryPassword(12);
        String tempPasswordHash = passwordEncoder.encode(tempPassword);

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPasswordHash(tempPasswordHash);
        user.setRole(request.getRole());
        user.setFullName(request.getFullName());
        user.setActive(true);
        user.setMustChangePassword(true);

        User savedUser = userRepository.save(user);
        boolean emailSent = emailService.sendTemporaryPasswordEmail(
                request.getEmail(),
                request.getFullName(),
                request.getUsername(),
                tempPassword,
                request.getRole()
        );

        CreateUserResponse response = new CreateUserResponse();
        response.setUser(getUserResponse(savedUser));
        response.setEmailSent(emailSent);
        if (!emailSent) {
            response.setTemporaryPassword(tempPassword);
        }
        return response;
    }

    @Transactional
    public UserResponse updateUser(UUID id, UpdateUserRequest request) {
        User user = getUserById(id);

        // Check if email is being changed and is already taken by another user
        if (!user.getEmail().equals(request.getEmail()) && userRepository.existsByEmail(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
        }

        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setRole(request.getRole());

        return getUserResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse toggleUserStatus(UUID id, Boolean active) {
        log.info("UserService.toggleUserStatus: entered method, id={}, active={}", id, active);
        try {
            User user = getUserById(id);
            log.info("UserService.toggleUserStatus: found user with id={}, current active={}", id, user.getActive());
            user.setActive(active);

            if (!active) {
                // Revoke all refresh tokens for this user
                log.info("UserService.toggleUserStatus: revoking refresh tokens for user {}", id);
                refreshTokenRepository.deleteByUserId(id);
                log.info("Revoked all refresh tokens for user {}", id);
            }

            UserResponse response = getUserResponse(userRepository.save(user));
            log.info("UserService.toggleUserStatus: successfully saved user, response={}", response);
            return response;
        } catch (Exception e) {
            log.error("UserService.toggleUserStatus: exception thrown", e);
            throw e;
        }
    }

    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setMustChangePassword(false);
        userRepository.save(user);
        log.info("Password changed successfully for user {}", request.getUsername());
    }
}
