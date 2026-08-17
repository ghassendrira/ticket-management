package com.ticketmanagement.aiservice.controller;

import com.ticketmanagement.aiservice.dto.PriorityEstimateRequest;
import com.ticketmanagement.aiservice.dto.PriorityEstimateResponse;
import com.ticketmanagement.aiservice.service.PriorityService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
public class AiPriorityController {

    private static final Logger log = LoggerFactory.getLogger(AiPriorityController.class);

    private final PriorityService priorityService;

    public AiPriorityController(PriorityService priorityService) {
        this.priorityService = priorityService;
    }

    /**
     * POST /api/ai/priority
     * Estime la priorité hybride d'un ticket.
     */
    @PostMapping("/priority")
    public ResponseEntity<PriorityEstimateResponse> estimatePriority(
            @Valid @RequestBody PriorityEstimateRequest request) {

        log.info("Received priority estimation request for ticket: {}", request.ticketId());
        PriorityEstimateResponse response = priorityService.estimatePriority(request);
        return ResponseEntity.ok(response);
    }
}