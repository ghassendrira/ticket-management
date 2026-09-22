package com.example.ragbackend.ai.dto;

import java.util.UUID;

public record SourceDto(
    UUID documentId,
    String title,
    String section,
    Integer page
) {}
