package com.ticketmanagement.assignmentservice.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class AssignmentRecommendationRequest {
    private UUID ticketId;
    private String category;
    private String priority;
    private UUID teamId;
}