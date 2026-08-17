package com.ticketmanagement.ticketservice.dto;

import com.ticketmanagement.ticketservice.entity.Category;
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
public class TicketResponseDTO {
    private UUID id;
    private String title;
    private String description;
    private TicketStatus status;
    private Priority priority;
    private Category category;
    private String customerId;
    private String requestId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID assignedAgentId;
    private String assignedAgentName;
    private int commentsCount;
    private UUID teamId;
}