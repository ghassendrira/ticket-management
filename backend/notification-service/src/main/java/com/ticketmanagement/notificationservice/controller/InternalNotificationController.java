package com.ticketmanagement.notificationservice.controller;

import com.ticketmanagement.notificationservice.dto.CreateNotificationRequestDTO;
import com.ticketmanagement.notificationservice.dto.NotificationResponseDTO;
import com.ticketmanagement.notificationservice.dto.SendEmailRequestDTO;
import com.ticketmanagement.notificationservice.service.EmailService;
import com.ticketmanagement.notificationservice.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/internal/notifications")
@RequiredArgsConstructor
@Slf4j
public class InternalNotificationController {
    private final NotificationService notificationService;
    private final EmailService emailService;

    @PostMapping
    public ResponseEntity<NotificationResponseDTO> createNotification(@Valid @RequestBody CreateNotificationRequestDTO request) {
        log.info("InternalNotificationController.createNotification received request: {}", request);
        return ResponseEntity.ok(notificationService.createNotification(request));
    }

    @PostMapping("/email")
    public ResponseEntity<Void> sendEmail(@Valid @RequestBody SendEmailRequestDTO request) {
        log.info("InternalNotificationController.sendEmail received request: {}", request);
        emailService.sendEmail(request.getTo(), null, request.getSubject(), request.getBody());
        return ResponseEntity.noContent().build();
    }
}
