package com.ticketmanagement.ticketservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Distribution bucket for tickets grouped by category (count, count + share of total).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CategoryStatsDTO {
    private String category;
    private long count;
    private int percentage;
}
