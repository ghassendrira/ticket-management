package com.ticketmanagement.aiservice.dto;

import java.util.UUID;

public record SimilarTicketResponse(
        UUID ticketId,
        double similarityScore,
        String resolutionSummary
) {}