package com.ticketmanagement.ticketservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReassignEscalationRequestDTO {
    @NotNull
    private UUID agentId;
}
