package com.ticketmanagement.assignmentservice.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class UpdateAgentTeamRequest {
    private UUID teamId;
}