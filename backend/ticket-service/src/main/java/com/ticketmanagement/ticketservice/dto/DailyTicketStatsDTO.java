package com.ticketmanagement.ticketservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Aggregated count of tickets created vs resolved per day.
 * Date is returned as ISO string (yyyy-MM-dd) for easy client consumption.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DailyTicketStatsDTO {
    private String date;
    private long created;
    private long resolved;
}
