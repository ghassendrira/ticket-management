package com.ticketmanagement.aiservice.dto.gemini;

import java.util.List;

public record GeminiApiRequest(List<Content> contents, GenerationConfig generationConfig) {
    public record Content(List<Part> parts) {}
    public record Part(String text) {}
    public record GenerationConfig(double temperature, String responseMimeType) {}
}