package com.ticketmanagement.aiservice.dto;

import jakarta.validation.constraints.NotBlank;

public record GeminiTestRequest(@NotBlank(message = "Le prompt est obligatoire") String prompt) {}