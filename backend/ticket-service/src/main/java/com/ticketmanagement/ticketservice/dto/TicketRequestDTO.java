package com.ticketmanagement.ticketservice.dto;

import com.ticketmanagement.ticketservice.entity.Category;
import com.ticketmanagement.ticketservice.entity.Priority;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TicketRequestDTO {
    @NotBlank(message = "Title is required")
    private String title;
    private String description;
    private Category category;
    private Priority priority;
    private String customerId;
    private UUID teamId;
}