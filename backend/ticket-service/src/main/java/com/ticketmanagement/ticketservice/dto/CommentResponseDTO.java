package com.ticketmanagement.ticketservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommentResponseDTO {
    private UUID id;
    private String content;
    private LocalDateTime createdAt;
    private UUID authorId;
    private String authorName;
    private boolean isInternal;
}
