package com.ticketmanagement.ticketservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AttachmentResponseDTO {
    private UUID id;
    private String fileName;
    private String fileType;
    private long fileSize;
    private LocalDateTime uploadedAt;
    private UUID uploadedById;
    private String uploadedByName;
}
