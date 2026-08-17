package com.ticketmanagement.aiservice.controller;

import com.ticketmanagement.aiservice.dto.GenerateSummaryRequest;
import com.ticketmanagement.aiservice.dto.SummaryResponse;
import com.ticketmanagement.aiservice.service.AiSummaryService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
public class AiSummaryController {

    private static final Logger log = LoggerFactory.getLogger(AiSummaryController.class);

    private final AiSummaryService aiSummaryService;

    public AiSummaryController(AiSummaryService aiSummaryService) {
        this.aiSummaryService = aiSummaryService;
    }

    /**
     * POST /api/ai/summary
     * Body: { "title": "...", "description": "..." }
     */
    @PostMapping("/summary")
    public ResponseEntity<SummaryResponse> generateSummary(
            @Valid @RequestBody GenerateSummaryRequest request) {

        log.info("Received summary request for ticket: {}", request.title());
        SummaryResponse response = aiSummaryService.summarizeTicket(
                request.title(),
                request.description()
        );
        return ResponseEntity.ok(response);
    }
}