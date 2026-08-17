package com.ticketmanagement.aiservice.service;

import com.ticketmanagement.aiservice.dto.SuggestResponseRequest;
import com.ticketmanagement.aiservice.dto.SuggestedResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class AiResponseService {

    private static final Logger log = LoggerFactory.getLogger(AiResponseService.class);

    private final OllamaService ollamaService;

    public AiResponseService(OllamaService ollamaService) {
        this.ollamaService = ollamaService;
    }

    public SuggestedResponse suggestReply(String title, String description) {
        log.info("Generating suggested response for ticket: {}", title);
        String reply = ollamaService.generateSuggestedResponse(title, description);
        log.info("Suggested response generated successfully");
        return new SuggestedResponse(reply);
    }
}