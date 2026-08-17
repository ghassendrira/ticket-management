package com.ticketmanagement.notificationservice.dto;

import com.ticketmanagement.notificationservice.entity.NotificationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateNotificationRequestDTO {
    @NotNull
    private UUID userId;
    @NotBlank
    private String title;
    @NotBlank
    private String message;
    @NotNull
    private NotificationType type;
    private UUID ticketId;
    private UUID agentId;
    private String escalationReason;
    private UUID teamId;
}
