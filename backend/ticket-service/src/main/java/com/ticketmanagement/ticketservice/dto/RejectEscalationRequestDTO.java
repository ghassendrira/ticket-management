package com.ticketmanagement.ticketservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RejectEscalationRequestDTO {
    @NotBlank(message = "Reason is required")
    private String reason;
}
