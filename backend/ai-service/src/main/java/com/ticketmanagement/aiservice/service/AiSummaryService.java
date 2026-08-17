package com.ticketmanagement.aiservice.service;

import com.ticketmanagement.aiservice.dto.SummaryResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class AiSummaryService {

    private static final Logger log = LoggerFactory.getLogger(AiSummaryService.class);

    private final OllamaService ollamaService;

    public AiSummaryService(OllamaService ollamaService) {
        this.ollamaService = ollamaService;
    }

    public SummaryResponse summarizeTicket(String title, String description) {
        log.info("Generating AI summary for ticket: {}", title);
        String summary = ollamaService.generateSummary(title, description);
        log.info("Summary generated successfully");
        return new SummaryResponse(summary);
    }
}