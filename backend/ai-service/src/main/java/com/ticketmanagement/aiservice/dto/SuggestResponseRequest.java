package com.ticketmanagement.aiservice.dto;

import jakarta.validation.constraints.NotBlank;

public record SuggestResponseRequest(
    @NotBlank String title,
    String description
) {}