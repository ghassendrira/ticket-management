package com.ticketmanagement.aiservice.controller;

import com.ticketmanagement.aiservice.dto.AnalysisResult;
import com.ticketmanagement.aiservice.dto.AnalyzeTicketRequest;
import com.ticketmanagement.aiservice.dto.ClassificationResult;
import com.ticketmanagement.aiservice.service.TicketAnalysisService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiAnalysisController {

    private final TicketAnalysisService ticketAnalysisService;

    @PostMapping("/analyze")
    public ResponseEntity<AnalysisResult> analyze(@Valid @RequestBody AnalyzeTicketRequest request) {
        AnalysisResult result = ticketAnalysisService.analyzeTicket(
            request.ticketId(),
            request.title(),
            request.description()
        );
        return ResponseEntity.ok(result);
    }

    /**
     * Simplified endpoint that returns only the category classification
     */
    @PostMapping("/classify")
    public ResponseEntity<ClassificationResult> classify(@Valid @RequestBody AnalyzeTicketRequest request) {
        AnalysisResult result = ticketAnalysisService.analyzeTicket(
            request.ticketId(),
            request.title(),
            request.description()
        );
        return ResponseEntity.ok(new ClassificationResult(result.category(), result.categoryConfidence()));
    }

    /**
     * Classify without a ticketId - for quick classification
     */
    @PostMapping("/classify/quick")
    public ResponseEntity<ClassificationResult> classifyQuick(@RequestParam String title, @RequestParam String description) {
        AnalysisResult result = ticketAnalysisService.analyzeTicket(
            UUID.randomUUID(),
            title,
            description
        );
        return ResponseEntity.ok(new ClassificationResult(result.category(), result.categoryConfidence()));
    }
}