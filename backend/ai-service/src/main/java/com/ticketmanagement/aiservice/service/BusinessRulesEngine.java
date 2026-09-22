package com.ticketmanagement.aiservice.service;

import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Set;

@Component
public class BusinessRulesEngine {

    private static final Set<String> CRITICAL_KEYWORDS = Set.of(
        "crash", "down", "outage", "payment failed", "urgent", "blocked",
        "payment", "double charged", "debited twice", "debite deux fois", "remboursement",
        "today", "aujourd'hui", "demain", "cannot access", "security breach", "data loss", "hacked", "piraté",
        "502", "503", "500 error", "deadlock", "corrupt"
    );

   public double computeBusinessScore(String title, String description, String category, String customerTier) {
    double score = 0.0; // aucun facteur de risque par défaut

    String text = (title + " " + (description != null ? description : "")).toLowerCase();

    boolean explicitHigh = text.contains("urgent") || text.contains("aujourd'hui")
        || text.contains("demain") || text.contains("débité deux fois")
        || text.contains("debite deux fois") || text.contains("double charged");
    boolean critical = text.contains("hacked") || text.contains("piraté")
        || text.contains("security breach") || text.contains("compte piraté")
        || text.contains("payment failed") || text.contains("paiement échoué")
        || text.contains("service totalement indisponible")
        || text.contains("tous les clients") || text.contains("plusieurs clients");

    if (critical) return 100.0;

    int keywordHits = 0;
    for (String kw : CRITICAL_KEYWORDS) {
        if (text.contains(kw)) keywordHits++;
    }
    score += Math.min(keywordHits * 15, 30);

    score += switch (category != null ? category.toUpperCase() : "OTHER") {
        case "SECURITY" -> 20;
        case "INFRASTRUCTURE", "PRODUCTION" -> 15;
        case "BUG" -> 10;
        case "FEATURE_REQUEST" -> 0; // no longer needs to go negative
        default -> 0;
    };

    score += switch (customerTier != null ? customerTier.toUpperCase() : "STANDARD") {
        case "VIP" -> 25;
        case "ENTERPRISE", "PREMIUM" -> 15;
        case "STANDARD" -> 0;
        default -> 0;
    };

    return clamp(explicitHigh ? Math.max(score, 70.0) : score);
}

public double computeAgeSlaScore(LocalDateTime createdAt, LocalDateTime slaDeadline) {
    double score = 0.0; // aucune urgence temporelle par défaut
    LocalDateTime now = LocalDateTime.now();

    if (createdAt != null) {
        long hoursOpen = ChronoUnit.HOURS.between(createdAt, now);
        if (hoursOpen > 72) score += 25;
        else if (hoursOpen > 24) score += 20;
        else if (hoursOpen > 4)  score += 10;
        else if (hoursOpen > 1)  score += 5;
    }

    if (slaDeadline != null) {
        long hoursUntil = ChronoUnit.HOURS.between(now, slaDeadline);
        if (hoursUntil < 0) score += 50;        // SLA dépassé — increased weight since it's now the dominant signal
        else if (hoursUntil < 4) score += 30;
        else if (hoursUntil < 24) score += 15;
        else if (hoursUntil < 48) score += 5;
    }

    return clamp(score);
}

    private double clamp(double value) {
        return Math.max(0.0, Math.min(100.0, value));
    }
}