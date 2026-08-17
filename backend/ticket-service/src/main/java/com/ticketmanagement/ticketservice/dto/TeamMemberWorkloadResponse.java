package com.ticketmanagement.ticketservice.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TeamMemberWorkloadResponse {
    private String userId;
    private String fullName;
    private String role;
    private Integer activeTicketsCount;
    private Boolean isOnline;
    private Integer maxConcurrentTickets;
}
