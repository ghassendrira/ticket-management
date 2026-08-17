package com.ticketmanagement.notificationservice.service;

import com.ticketmanagement.notificationservice.config.BrevoConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailServiceImpl implements EmailService {
    private final BrevoConfig brevoConfig;

    @Override
    public boolean sendEmail(String toEmail, String toName, String subject, String htmlBody) {
        if (brevoConfig.getApiKey() == null || brevoConfig.getApiKey().isBlank()) {
            log.warn("BREVO_API_KEY is not set — skipping email send to {}", toEmail);
            return false;
        }
        if (brevoConfig.getSenderEmail() == null || brevoConfig.getSenderEmail().isBlank()) {
            log.warn("BREVO_SENDER_EMAIL is not set — skipping email send to {}", toEmail);
            return false;
        }
        try {
            RestClient restClient = RestClient.create("https://api.brevo.com/v3");
            restClient.post()
                    .uri("/smtp/email")
                    .header("api-key", brevoConfig.getApiKey())
                    .header("Content-Type", "application/json")
                    .body(Map.of(
                            "sender", Map.of("name", brevoConfig.getSenderName(), "email", brevoConfig.getSenderEmail()),
                            "to", List.of(Map.of("email", toEmail, "name", toName != null ? toName : toEmail)),
                            "subject", subject,
                            "htmlContent", htmlBody
                    ))
                    .retrieve()
                    .toBodilessEntity();
            log.info("Email successfully sent to {}", toEmail);
            return true;
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", toEmail, e.getMessage(), e);
            return false;
        }
    }
}
