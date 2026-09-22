package com.example.ragbackend.ai.dto;

import java.util.List;

public record AskResponse(
    String answer,
    double confidence,
    List<SourceDto> sources,
    boolean answered
) {}
