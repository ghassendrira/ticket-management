package com.ticketmanagement.authservice.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "brevo")
@Data
public class BrevoConfig {
    private String apiKey;
    private String senderEmail;
    private String senderName;
}
