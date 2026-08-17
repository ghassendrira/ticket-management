package com.ticketmanagement.ticketservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserSummaryDTO {
    private UUID id;
    private String username;
    private String email;
    private String role;
    private String fullName;
    private Boolean active;
    private Boolean mustChangePassword;
    private String createdAt;
}
