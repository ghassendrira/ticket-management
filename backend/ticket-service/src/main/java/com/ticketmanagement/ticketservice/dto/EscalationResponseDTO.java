package com.ticketmanagement.ticketservice.dto;

import com.ticketmanagement.ticketservice.entity.EscalationStatus;
import com.ticketmanagement.ticketservice.entity.Priority;
import com.ticketmanagement.ticketservice.entity.TicketStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EscalationResponseDTO {
    private UUID id;
    private UUID ticketId;
    private String ticketTitle;
    private TicketStatus ticketStatus;
    private Priority ticketPriority;
    private String ticketRequestId;
    private UUID requestedByAgentId;
    private String requestedByAgentName;
    private UUID managerId;
    private UUID teamId;
    private String teamName;
    private String reason;
    private EscalationStatus status;
    private String managerResponseReason;
    private UUID reassignedToAgentId;
    private String reassignedToAgentName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
