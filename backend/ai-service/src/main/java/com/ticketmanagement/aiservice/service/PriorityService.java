package com.ticketmanagement.aiservice.service;

import com.ticketmanagement.aiservice.dto.PriorityEstimateRequest;
import com.ticketmanagement.aiservice.dto.PriorityEstimateResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class PriorityService {

    private static final Logger log = LoggerFactory.getLogger(PriorityService.class);

    private final OllamaService ollamaService;
    private final BusinessRulesEngine rulesEngine;

    public PriorityService(OllamaService ollamaService, BusinessRulesEngine rulesEngine) {
        this.ollamaService = ollamaService;
        this.rulesEngine = rulesEngine;
    }

    public PriorityEstimateResponse estimatePriority(PriorityEstimateRequest req) {
        log.info("Estimating priority for ticket: {}", req.ticketId());

        double[] aiScores = ollamaService.estimatePriorityScores(req.title(), req.description(), req.category());
        double modelScore = aiScores[0];
        double sentimentScore = aiScores[1];

        double businessScore = rulesEngine.computeBusinessScore(
                req.title(), req.description(), req.category(), req.customerTier());

        double ageSlaScore = rulesEngine.computeAgeSlaScore(req.createdAt(), req.slaDeadline());

        double finalScore = (0.40 * modelScore)
                          + (0.30 * businessScore)
                          + (0.20 * sentimentScore)
                          + (0.10 * ageSlaScore);

        int rounded = (int) Math.round(finalScore);
        String level = mapLevel(rounded);

        String explanation = String.format(
                "Model: %.0f | Business: %.0f | Sentiment: %.0f | Age/SLA: %.0f -> Final: %d (%s)",
                modelScore, businessScore, sentimentScore, ageSlaScore, rounded, level
        );

        log.info("Priority calculated for {}: {}", req.ticketId(), explanation);

        return new PriorityEstimateResponse(
                req.ticketId().toString(),
                rounded,
                level,
                modelScore,
                businessScore,
                sentimentScore,
                ageSlaScore,
                explanation
        );
    }

    private String mapLevel(int score) {
        if (score >= 80) return "CRITICAL";
        if (score >= 60) return "HIGH";
        if (score >= 40) return "MEDIUM";
        return "LOW";
    }
}