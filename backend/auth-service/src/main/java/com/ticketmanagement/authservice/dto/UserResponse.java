package com.ticketmanagement.authservice.dto;

import com.ticketmanagement.authservice.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private UUID id;
    private String username;
    private String email;
    private Role role;
    private String fullName;
    private Boolean active;
    private Boolean mustChangePassword;
    private Instant createdAt;
}
