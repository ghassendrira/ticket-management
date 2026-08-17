package com.ticketmanagement.ticketservice.controller;

import com.ticketmanagement.ticketservice.client.AuthServiceClient;
import com.ticketmanagement.ticketservice.client.NotificationClient;
import com.ticketmanagement.ticketservice.dto.AttachmentResponseDTO;
import com.ticketmanagement.ticketservice.dto.CreateNotificationRequestDTO;
import com.ticketmanagement.ticketservice.dto.NotificationType;
import com.ticketmanagement.ticketservice.entity.Attachment;
import com.ticketmanagement.ticketservice.entity.Role;
import com.ticketmanagement.ticketservice.entity.Ticket;
import com.ticketmanagement.ticketservice.exception.TicketNotFoundException;
import com.ticketmanagement.ticketservice.exception.UnauthorizedTicketActionException;
import com.ticketmanagement.ticketservice.repository.AttachmentRepository;
import com.ticketmanagement.ticketservice.repository.TicketRepository;
import com.ticketmanagement.ticketservice.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AttachmentController {

    private static final Set<Role> ALLOWED_ROLES = Set.of(Role.ADMIN, Role.MANAGER, Role.AGENT);

    private final AttachmentRepository attachmentRepository;
    private final TicketRepository ticketRepository;
    private final FileStorageService fileStorageService;
    private final AuthServiceClient authServiceClient;
    private final NotificationClient notificationClient;

    @PostMapping("/tickets/{ticketId}/attachments")
    public ResponseEntity<AttachmentResponseDTO> uploadAttachment(
            @PathVariable UUID ticketId,
            @RequestParam("file") MultipartFile file,
            @RequestHeader("X-User-Id") String userIdHeader,
            @RequestHeader("X-User-Role") String roleHeader) throws IOException {

        Role role = Role.valueOf(roleHeader);
        if (!ALLOWED_ROLES.contains(role)) {
            throw new UnauthorizedTicketActionException("Not authorized to upload attachments");
        }

        UUID userId = UUID.fromString(userIdHeader);

        // Check if ticket exists
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new TicketNotFoundException("Ticket not found"));

        // Store file
        String relativePath = fileStorageService.storeFile(file, ticketId);

        // Create attachment entity
        Attachment attachment = new Attachment();
        attachment.setTicket(ticket);
        attachment.setFileName(file.getOriginalFilename());
        attachment.setStoredFileName(relativePath.substring(relativePath.lastIndexOf("/") + 1));
        attachment.setFileType(file.getContentType());
        attachment.setFileSize(file.getSize());
        attachment.setFilePath(relativePath);
        attachment.setUploadedById(userId);
        Attachment savedAttachment = attachmentRepository.save(attachment);

        // Create DTO response
        AttachmentResponseDTO response = mapToResponseDTO(savedAttachment);

        // Trigger notification
        if (ticket.getAssignedAgentId() != null && !ticket.getAssignedAgentId().equals(userId)) {
            String uploaderName = authServiceClient.getUserById(userId).getFullName();
            CreateNotificationRequestDTO notification = new CreateNotificationRequestDTO();
            notification.setUserId(ticket.getAssignedAgentId());
            notification.setTitle("New attachment");
            notification.setMessage(String.format("%s uploaded %s to Ticket #%s",
                    uploaderName, file.getOriginalFilename(), ticketId));
            notification.setType(NotificationType.COMMENT_ADDED);
            notificationClient.createNotification(notification);
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/tickets/{ticketId}/attachments")
    public ResponseEntity<List<AttachmentResponseDTO>> getAttachmentsForTicket(
            @PathVariable UUID ticketId,
            @RequestHeader("X-User-Id") String userIdHeader,
            @RequestHeader("X-User-Role") String roleHeader) {

        Role role = Role.valueOf(roleHeader);
        if (!ALLOWED_ROLES.contains(role)) {
            throw new UnauthorizedTicketActionException("Not authorized to view attachments");
        }

        List<Attachment> attachments = attachmentRepository.findByTicketId(ticketId);
        List<AttachmentResponseDTO> response = attachments.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/attachments/{id}/download")
    public ResponseEntity<Resource> downloadAttachment(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String userIdHeader,
            @RequestHeader("X-User-Role") String roleHeader) throws IOException {

        Role role = Role.valueOf(roleHeader);
        if (!ALLOWED_ROLES.contains(role)) {
            throw new UnauthorizedTicketActionException("Not authorized to download attachments");
        }

        Attachment attachment = attachmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Attachment not found"));

        Resource resource = fileStorageService.loadFileAsResource(attachment.getFilePath());
        String contentType = attachment.getFileType() != null ? attachment.getFileType() : MediaType.APPLICATION_OCTET_STREAM_VALUE;

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + attachment.getFileName() + "\"")
                .body(resource);
    }

    @DeleteMapping("/attachments/{id}")
    public ResponseEntity<Void> deleteAttachment(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String userIdHeader,
            @RequestHeader("X-User-Role") String roleHeader) throws IOException {

        Role role = Role.valueOf(roleHeader);
        UUID userId = UUID.fromString(userIdHeader);

        Attachment attachment = attachmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Attachment not found"));

        // Check permissions
        if (!attachment.getUploadedById().equals(userId) &&
                role != Role.ADMIN && role != Role.MANAGER) {
            throw new UnauthorizedTicketActionException("Not authorized to delete this attachment");
        }

        // Delete physical file first
        fileStorageService.deleteFile(attachment.getFilePath());

        // Delete DB record
        attachmentRepository.delete(attachment);

        return ResponseEntity.noContent().build();
    }

    private AttachmentResponseDTO mapToResponseDTO(Attachment attachment) {
        String uploadedByName = authServiceClient.getUserById(attachment.getUploadedById()).getFullName();
        return new AttachmentResponseDTO(
                attachment.getId(),
                attachment.getFileName(),
                attachment.getFileType(),
                attachment.getFileSize(),
                attachment.getUploadedAt(),
                attachment.getUploadedById(),
                uploadedByName
        );
    }
}
