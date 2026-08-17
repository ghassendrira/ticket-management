package com.ticketmanagement.authservice.service;

import com.ticketmanagement.authservice.config.BrevoConfig;
import com.ticketmanagement.authservice.entity.Role;
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
    public boolean sendTemporaryPasswordEmail(String toEmail, String toName, String username, String tempPassword, Role role) {
        if (brevoConfig.getApiKey() == null || brevoConfig.getApiKey().isBlank()) {
            log.warn("BREVO_API_KEY is not set — skipping email send for user {}", toEmail);
            return false;
        }

        if (brevoConfig.getSenderEmail() == null || brevoConfig.getSenderEmail().isBlank()) {
            log.warn("BREVO_SENDER_EMAIL is not set — skipping email send for user {}", toEmail);
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
                            "to", List.of(Map.of("email", toEmail, "name", toName)),
                            "subject", "Your Ticket Management Platform Account",
                            "htmlContent", buildEmailHtml(toName, username, tempPassword, role)
                    ))
                    .retrieve()
                    .toBodilessEntity();
            log.info("Temporary password email successfully sent to {}", toEmail);
            return true;
        } catch (Exception e) {
            log.error("Failed to send temporary password email to {}: {}", toEmail, e.getMessage(), e);
            return false;
        }
    }

   private String buildEmailHtml(String toName, String username, String tempPassword, Role role) {
    return """
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 30px; text-align: center; border-radius: 8px;">
                    <h1 style="margin: 0; font-size: 24px;">Ticket Management Platform</h1>
                </div>
                <div style="background: #ffffff; padding: 30px; border: 1px solid #eee; border-radius: 8px; margin-top: 20px;">
                    <h2 style="color: #333; margin-top: 0;">Hi %s,</h2>
                    <p style="color: #666; line-height: 1.6;">
                        An account has been created for you on the Ticket Management Platform.
                    </p>
                    <p style="color: #666; line-height: 1.6;">
                        <strong>Your username:</strong> %s
                    </p>
                    <p style="color: #666; line-height: 1.6;">
                        <strong>Your role:</strong> %s
                    </p>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                        <p style="color: #666; margin: 0 0 10px 0;">Your temporary password:</p>
                        <div style="background: white; border: 1px dashed #ddd; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 18px; color: #333; font-weight: bold;">
                            %s
                        </div>
                    </div>
                    <p style="color: #666; line-height: 1.6;">
                        Please log in immediately and change this password. This temporary password will only work until you set a new one.
                    </p>
                </div>
                <div style="text-align: center; margin-top: 20px; color: #aaa; font-size: 12px;">
                    <p>This is an automated message — please do not reply.</p>
                </div>
            </div>
            """.formatted(toName, username, capitalizeFirstLetter(role.name()), tempPassword);
}
   
   private String capitalizeFirstLetter(String input) {
       if (input == null || input.isEmpty()) {
           return input;
       }
       return input.substring(0, 1).toUpperCase() + input.substring(1).toLowerCase();
   }
}
