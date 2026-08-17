package com.ticketmanagement.assignmentservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamMemberWorkloadDTO {
    private String userId;
    private String fullName;
    private String role;
    private int activeTicketsCount;
    private boolean currentUser;
}