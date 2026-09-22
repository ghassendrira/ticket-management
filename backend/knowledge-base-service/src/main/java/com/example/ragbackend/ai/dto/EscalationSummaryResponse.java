package com.example.ragbackend.ai.dto;

import java.util.List;

public record EscalationSummaryResponse(
    String title,
    String summary,
    String predictedCategory,
    String predictedPriority,
    String sentiment,
    List<String> attemptedSolutions
) {}
