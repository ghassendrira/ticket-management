package com.ticketmanagement.ticketservice.controller;

import com.ticketmanagement.ticketservice.dto.*;
import com.ticketmanagement.ticketservice.entity.Role;
import com.ticketmanagement.ticketservice.exception.UnauthorizedTicketActionException;
import com.ticketmanagement.ticketservice.service.TicketService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import com.ticketmanagement.ticketservice.entity.TicketStatus;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {
    private final TicketService ticketService;

    private static final Set<Role> ALLOWED_CREATE_ROLES = Set.of(Role.ADMIN, Role.MANAGER, Role.AGENT);
    private static final Set<Role> ALLOWED_ASSIGN_ROLES = Set.of(Role.ADMIN, Role.MANAGER);

    private static final UUID SYSTEM_RAG_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000000");
    private static final String INTERNAL_HEADER = "X-Internal-Service-Key";

    @Value("${internal.service-secret}")
    private String internalServiceSecret;

    @PostMapping
    public ResponseEntity<TicketResponseDTO> createTicket(
            @Valid @RequestBody TicketRequestDTO dto,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "X-User-Role", required = false) String roleHeader,
            HttpServletRequest request) {
        boolean internal = isInternalAuthenticated(request);
        UUID userId;
        if (internal) {
            userId = SYSTEM_RAG_USER_ID;
        } else {
            requireHeaders(userIdHeader, roleHeader);
            Role role = Role.valueOf(roleHeader);
            if (!ALLOWED_CREATE_ROLES.contains(role)) {
                throw new UnauthorizedTicketActionException("Not authorized to create tickets");
            }
            userId = UUID.fromString(userIdHeader);
        }
        TicketResponseDTO response = ticketService.createTicket(dto, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<TicketResponseDTO>> getAllTickets(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "X-User-Role", required = false) String roleHeader,
            HttpServletRequest request) {
        boolean internal = isInternalAuthenticated(request);
        UUID userId;
        Role role;
        if (internal) {
            userId = SYSTEM_RAG_USER_ID;
            role = Role.ADMIN;
        } else {
            requireHeaders(userIdHeader, roleHeader);
            role = Role.valueOf(roleHeader);
            if (!ALLOWED_CREATE_ROLES.contains(role)) {
                throw new UnauthorizedTicketActionException("Not authorized to view tickets");
            }
            userId = UUID.fromString(userIdHeader);
        }
        List<TicketResponseDTO> tickets = ticketService.getAllTickets(userId, role);
        return ResponseEntity.ok(tickets);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TicketDetailResponseDTO> getTicketById(
            @PathVariable UUID id,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "X-User-Role", required = false) String roleHeader,
            HttpServletRequest request) {
        boolean internal = isInternalAuthenticated(request);
        if (!internal) {
            requireHeaders(userIdHeader, roleHeader);
            Role role = Role.valueOf(roleHeader);
            if (!ALLOWED_CREATE_ROLES.contains(role)) {
                throw new UnauthorizedTicketActionException("Not authorized to view this ticket");
            }
        }
        TicketDetailResponseDTO ticket = ticketService.getTicketById(id);
        return ResponseEntity.ok(ticket);
    }

   @PatchMapping("/{id}/status")
public ResponseEntity<TicketResponseDTO> changeStatus(
        @PathVariable UUID id,
        @Valid @RequestBody ChangeStatusRequestDTO dto,
        @RequestHeader("X-User-Id") String userIdHeader,
        @RequestHeader("X-User-Role") String roleHeader) {


    System.out.println("========== PATCH STATUS ==========");
    System.out.println("USER ID HEADER: " + userIdHeader);
    System.out.println("ROLE HEADER: " + roleHeader);
    System.out.println("NEW STATUS: " + dto.getNewStatus());


    Role role = Role.valueOf(roleHeader);

    if (!ALLOWED_CREATE_ROLES.contains(role)) {
        throw new UnauthorizedTicketActionException(
                "Not authorized to change ticket status"
        );
    }

    UUID userId = UUID.fromString(userIdHeader);

    TicketResponseDTO updated =
            ticketService.changeStatus(id, dto.getNewStatus(), userId, role);

    return ResponseEntity.ok(updated);
}
    @PatchMapping("/{id}/assign")
    public ResponseEntity<TicketResponseDTO> assignTicket(
            @PathVariable UUID id,
            @Valid @RequestBody AssignTicketRequestDTO dto,
            @RequestHeader("X-User-Id") String userIdHeader,
            @RequestHeader("X-User-Role") String roleHeader) {
        Role role = Role.valueOf(roleHeader);
        if (!ALLOWED_ASSIGN_ROLES.contains(role)) {
            throw new UnauthorizedTicketActionException("Not authorized to assign tickets");
        }
        UUID userId = UUID.fromString(userIdHeader);
        TicketResponseDTO updated = ticketService.assignTicket(id, dto.getAgentId(), userId);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<CommentResponseDTO> addComment(
            @PathVariable UUID id,
            @Valid @RequestBody CommentRequestDTO dto,
            @RequestHeader("X-User-Id") String userIdHeader,
            @RequestHeader("X-User-Role") String roleHeader) {
        Role role = Role.valueOf(roleHeader);
        if (!ALLOWED_CREATE_ROLES.contains(role)) {
            throw new UnauthorizedTicketActionException("Not authorized to add comments");
        }
        UUID userId = UUID.fromString(userIdHeader);
        CommentResponseDTO comment = ticketService.addComment(id, dto, userId, role);
        return ResponseEntity.status(HttpStatus.CREATED).body(comment);
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<List<CommentResponseDTO>> getCommentsForTicket(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String userIdHeader,
            @RequestHeader("X-User-Role") String roleHeader) {
        Role role = Role.valueOf(roleHeader);
        if (!ALLOWED_CREATE_ROLES.contains(role)) {
            throw new UnauthorizedTicketActionException("Not authorized to view comments");
        }
        List<CommentResponseDTO> comments = ticketService.getCommentsForTicket(id);
        return ResponseEntity.ok(comments);
    }


    @GetMapping("/count")
public ResponseEntity<Long> countTickets(
        @RequestParam String assignedAgentId,
        @RequestParam TicketStatus status) {
    return ResponseEntity.ok(ticketService.countByAssignedAgentIdAndStatus(assignedAgentId, status));
}

    @PostMapping("/{id}/escalate")
    public ResponseEntity<Void> escalateTicket(
            @PathVariable UUID id,
            @Valid @RequestBody EscalationRequestDTO dto,
            @RequestHeader("X-User-Id") String userIdHeader,
            @RequestHeader("X-User-Role") String roleHeader) {
        Role role = Role.valueOf(roleHeader);
        if (role != Role.AGENT) {
            throw new UnauthorizedTicketActionException("Only agents can request escalation");
        }
        UUID userId = UUID.fromString(userIdHeader);
        ticketService.requestEscalation(id, dto.getReason(), userId);
        return ResponseEntity.ok().build();
    }

    private boolean isInternalAuthenticated(HttpServletRequest request) {
        String header = request.getHeader(INTERNAL_HEADER);
        return StringUtils.hasText(header) && header.equals(internalServiceSecret);
    }

    private void requireHeaders(String userIdHeader, String roleHeader) {
        if (!StringUtils.hasText(userIdHeader) || !StringUtils.hasText(roleHeader)) {
            throw new UnauthorizedTicketActionException("Missing authentication headers");
        }
    }
}
