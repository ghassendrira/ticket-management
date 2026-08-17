package com.ticketmanagement.aiservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.UUID;

public record PriorityEstimateRequest(
    @NotNull UUID ticketId,
    @NotBlank String title,
    String description,
    String category,          // ex: "SECURITY", "BUG", "FEATURE_REQUEST"
    String customerTier,      // ex: "VIP", "ENTERPRISE", "STANDARD"
    LocalDateTime createdAt,
    LocalDateTime slaDeadline
) {}