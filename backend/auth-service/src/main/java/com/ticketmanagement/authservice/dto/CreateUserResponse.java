package com.ticketmanagement.authservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateUserResponse {
    private UserResponse user;
    private Boolean emailSent;
    private String temporaryPassword; // only set if emailSent is false
}
