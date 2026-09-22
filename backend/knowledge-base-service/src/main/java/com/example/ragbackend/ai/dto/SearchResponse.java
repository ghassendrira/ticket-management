package com.example.ragbackend.ai.dto;

import java.util.List;

public record SearchResponse(
    List<SearchResultDto> results
) {}
