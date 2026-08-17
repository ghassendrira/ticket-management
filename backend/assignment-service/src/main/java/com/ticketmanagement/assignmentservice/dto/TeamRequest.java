package com.ticketmanagement.assignmentservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class TeamRequest {

    @NotBlank(message = "Team name is required")
    private String name;

    private String description;

    private List<String> managedCategories = new ArrayList<>();

    @NotBlank(message = "Manager is required")
    private String managerId;
}
