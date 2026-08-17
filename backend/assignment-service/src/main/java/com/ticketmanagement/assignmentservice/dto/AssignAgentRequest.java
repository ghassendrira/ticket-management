package com.ticketmanagement.assignmentservice.dto;

import lombok.Data;

@Data
public class AssignAgentRequest {
    private String userId;
    private Integer maxConcurrentTickets;
}