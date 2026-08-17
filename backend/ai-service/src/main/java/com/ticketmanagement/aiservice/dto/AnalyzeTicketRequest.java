package com.ticketmanagement.aiservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record AnalyzeTicketRequest(
    @NotNull UUID ticketId,
    @NotBlank String title,
    @NotBlank String description
) {}