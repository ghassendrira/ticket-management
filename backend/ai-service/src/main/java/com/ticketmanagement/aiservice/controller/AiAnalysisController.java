package com.ticketmanagement.aiservice.controller;

import com.ticketmanagement.aiservice.dto.AnalysisResult;
import com.ticketmanagement.aiservice.dto.AnalyzeTicketRequest;
import com.ticketmanagement.aiservice.service.TicketAnalysisService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
}