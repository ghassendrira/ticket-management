package com.ticketmanagement.ticketservice.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class TeamActivityResponse {
    private UUID id;
    private String eventType;
    private String message;
    private UUID ticketId;
    private String ticketTitle;
    private String actorName;
    private LocalDateTime timestamp;
}
