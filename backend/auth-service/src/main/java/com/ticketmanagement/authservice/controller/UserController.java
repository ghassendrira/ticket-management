package com.ticketmanagement.authservice.controller;

import com.ticketmanagement.authservice.dto.*;
import com.ticketmanagement.authservice.entity.Role;
import com.ticketmanagement.authservice.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserService userService;

    @GetMapping
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
public ResponseEntity<List<UserResponse>> getAllUsers(
        @RequestParam(required = false) String search,
        @RequestParam(required = false) Role role,
        @RequestParam(required = false) Boolean active,
        org.springframework.security.core.Authentication auth
) {
    boolean isManager = auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER"));
    boolean isAdmin = auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

    if (isManager && !isAdmin) {
        // Manager: only agents
        role = Role.AGENT;
    }
    return ResponseEntity.ok(userService.getAllUsers(search, role, active));
}

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<UserResponse> getUserById(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.getUserResponseById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CreateUserResponse> createUser(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.ok(userService.createUser(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserRequest request
    ) {
        return ResponseEntity.ok(userService.updateUser(id, request));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> toggleUserStatus(
            @PathVariable UUID id,
            @Valid @RequestBody ToggleUserStatusRequest request
    ) {
        log.info("UserController.toggleUserStatus: id={}, request body={}", id, request);
        return ResponseEntity.ok(userService.toggleUserStatus(id, request.getActive()));
    }
}
