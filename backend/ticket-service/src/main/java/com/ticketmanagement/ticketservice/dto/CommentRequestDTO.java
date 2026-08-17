package com.ticketmanagement.ticketservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommentRequestDTO {
    @NotBlank(message = "Content is required")
    private String content;
    private boolean isInternal = false;
}
