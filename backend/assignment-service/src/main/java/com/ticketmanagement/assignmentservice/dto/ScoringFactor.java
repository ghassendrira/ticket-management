package com.ticketmanagement.assignmentservice.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ScoringFactor {
    private String criterion;
    private int weight;
    private int contribution;
}