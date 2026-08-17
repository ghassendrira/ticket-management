package com.ticketmanagement.aiservice.controller;

import com.ticketmanagement.aiservice.dto.SimilarTicketResponse;
import com.ticketmanagement.aiservice.dto.StoreEmbeddingRequest;
import com.ticketmanagement.aiservice.service.SimilarTicketService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tickets")
public class SimilarTicketController {

    private static final Logger log = LoggerFactory.getLogger(SimilarTicketController.class);

    private final SimilarTicketService similarTicketService;

    public SimilarTicketController(SimilarTicketService similarTicketService) {
        this.similarTicketService = similarTicketService;
    }

    /**
     * Store embedding when a ticket is resolved/closed
     */
    @PostMapping("/{ticketId}/embedding")
    public ResponseEntity<Void> storeEmbedding(
            @PathVariable UUID ticketId,
            @RequestBody StoreEmbeddingRequest request) {

        log.info("Received embedding storage request for ticket: {}", ticketId);

        similarTicketService.storeEmbedding(
                ticketId,
                request.ticketContent(),
                request.resolutionSummary()
        );

        return ResponseEntity.ok().build();
    }

    /**
     * Find top similar resolved/closed tickets
     */
    @GetMapping("/{ticketId}/similar")
    public ResponseEntity<List<SimilarTicketResponse>> findSimilarTickets(
            @PathVariable UUID ticketId,
            @RequestParam String content) {

        log.info("Finding similar tickets for: {}", ticketId);

        List<SimilarTicketResponse> results = similarTicketService.findSimilarTickets(ticketId, content);
        return ResponseEntity.ok(results);
    }
}
