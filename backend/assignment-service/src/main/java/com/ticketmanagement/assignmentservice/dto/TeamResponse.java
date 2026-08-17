package com.ticketmanagement.assignmentservice.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class TeamResponse {
    private UUID id;
    private String name;
    private String description;
    private List<String> managedCategories;
    private String managerId;
    private String managerName;
    private int agentCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}