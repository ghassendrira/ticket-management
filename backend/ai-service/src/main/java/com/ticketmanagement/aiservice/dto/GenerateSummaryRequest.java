package com.ticketmanagement.aiservice.dto;

import jakarta.validation.constraints.NotBlank;

public record GenerateSummaryRequest(
    @NotBlank String title,
    @NotBlank String description
) {}