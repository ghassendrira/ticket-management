package com.ticketmanagement.aiservice.controller;

import com.ticketmanagement.aiservice.dto.SuggestResponseRequest;
import com.ticketmanagement.aiservice.dto.SuggestedResponse;
import com.ticketmanagement.aiservice.service.AiResponseService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
public class AiSuggestionController {

    private static final Logger log = LoggerFactory.getLogger(AiSuggestionController.class);

    private final AiResponseService aiResponseService;

    public AiSuggestionController(AiResponseService aiResponseService) {
        this.aiResponseService = aiResponseService;
    }

    /**
     * POST /api/ai/suggest-response
     * Body: { "title": "My payment failed", "description": "..." }
     */
    @PostMapping("/suggest-response")
    public ResponseEntity<SuggestedResponse> suggestResponse(
            @Valid @RequestBody SuggestResponseRequest request) {

        log.info("Received suggest-response request for: {}", request.title());
        SuggestedResponse response = aiResponseService.suggestReply(
                request.title(),
                request.description()
        );
        return ResponseEntity.ok(response);
    }
}