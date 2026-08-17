package com.ticketmanagement.aiservice.controller;

import com.ticketmanagement.aiservice.dto.GeminiTestRequest;
import com.ticketmanagement.aiservice.service.GeminiTestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiTestController {

    private final GeminiTestService geminiTestService;

    @PostMapping("/test")
    public ResponseEntity<Map<String, Object>> testGemini(@Valid @RequestBody GeminiTestRequest request) {
        String geminiResponse = geminiTestService.testGemini(request.prompt());
        return ResponseEntity.ok(Map.of(
            "status", "ok",
            "prompt", request.prompt(),
            "geminiResponse", geminiResponse
        ));
    }
}