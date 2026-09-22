package com.example.ragbackend.ai.dto;

import java.util.UUID;

public record SearchResultDto(
    UUID documentId,
    String documentTitle,
    Integer page,
    String section,
    String content,
    double similarity
) {}
