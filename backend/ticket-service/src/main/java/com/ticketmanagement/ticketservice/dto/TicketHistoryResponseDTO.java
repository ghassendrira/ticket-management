package com.ticketmanagement.ticketservice.dto;

import com.ticketmanagement.ticketservice.entity.TicketStatus;
import com.ticketmanagement.ticketservice.entity.TicketHistoryEventType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TicketHistoryResponseDTO {
    private UUID id;
    private TicketStatus oldStatus;
    private TicketStatus newStatus;
    private String changedByName;
    private LocalDateTime changedAt;
    private TicketHistoryEventType eventType;
    private String message;
    private String reason;
    private UUID actorId;
    private String actorName;
}
