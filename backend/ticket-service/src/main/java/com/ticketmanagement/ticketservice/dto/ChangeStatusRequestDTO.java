package com.ticketmanagement.ticketservice.dto;

import com.ticketmanagement.ticketservice.entity.TicketStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChangeStatusRequestDTO {
    @NotNull(message = "New status is required")
    private TicketStatus newStatus;
}
