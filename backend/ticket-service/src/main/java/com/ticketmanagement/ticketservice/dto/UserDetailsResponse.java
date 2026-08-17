package com.ticketmanagement.ticketservice.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class UserDetailsResponse {
    private UserSummaryDTO user;
    private UserTicketStats ticketStats;
    private List<TeamActivityResponse> recentActivity;

    @Data
    @Builder
    public static class UserTicketStats {
        private long totalAssigned;
        private long active;
        private long resolvedOrClosed;
    }
}
