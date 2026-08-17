package com.ticketmanagement.assignmentservice.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RecommendationFactor {
    private String criterion;
    private int weight;
    private int contribution;
    private String explanation;
}