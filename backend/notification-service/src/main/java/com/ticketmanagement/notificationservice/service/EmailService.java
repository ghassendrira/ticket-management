package com.ticketmanagement.notificationservice.service;

public interface EmailService {
    boolean sendEmail(String toEmail, String toName, String subject, String htmlBody);
}
