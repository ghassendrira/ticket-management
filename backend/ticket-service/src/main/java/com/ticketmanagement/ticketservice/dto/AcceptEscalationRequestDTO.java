package com.ticketmanagement.ticketservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AcceptEscalationRequestDTO {
    private boolean setInProgress = true;
    private boolean takeOwnership = false;
}
