package com.example.ragbackend.ai.dto;

import java.util.List;

public record RagAnswer(
    String answer,
    double confidence,
    List<SourceDto> sources,
    List<SearchResultDto> retrievedChunks,
    boolean answered
) {}
