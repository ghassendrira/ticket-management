package com.ticketmanagement.aiservice.service;

import com.ticketmanagement.aiservice.client.GeminiApiClient;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class GeminiTestService {

    private final GeminiApiClient geminiApiClient;

    @CircuitBreaker(name = "gemini-api", fallbackMethod = "fallbackTest")
    public String testGemini(String prompt) {
        return geminiApiClient.generateContent(prompt);
    }

    public String fallbackTest(String prompt, Exception ex) {
        return "{\"error\": \"Service Gemini indisponible\", \"fallback\": true, \"detail\": \"" + ex.getMessage() + "\"}";
    }
}