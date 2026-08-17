package com.ticketmanagement.authservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ToggleUserStatusRequest {
    @NotNull(message = "Active status is required")
    private Boolean active;
}
