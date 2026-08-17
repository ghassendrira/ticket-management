package com.ticketmanagement.ticketservice.controller;

import com.ticketmanagement.ticketservice.dto.*;
import com.ticketmanagement.ticketservice.entity.EscalationStatus;
import com.ticketmanagement.ticketservice.entity.Role;
import com.ticketmanagement.ticketservice.exception.UnauthorizedTicketActionException;
import com.ticketmanagement.ticketservice.service.TicketService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tickets/escalations") // CORRECTION : Harmonisé avec le front-end sur /api/tickets/escalations
@RequiredArgsConstructor
public class EscalationController {
    private final TicketService ticketService;

    @GetMapping
    public ResponseEntity<List<EscalationResponseDTO>> listEscalations(
            @RequestHeader("X-User-Id") String userIdHeader,
            @RequestHeader("X-User-Role") String roleHeader,
            @RequestParam(required = false) EscalationStatus status,
            @RequestParam(required = false) UUID agentId,
            @RequestParam(required = false) UUID teamId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate createdFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate createdTo
    ) {
        Role role = Role.valueOf(roleHeader);
        UUID userId = UUID.fromString(userIdHeader);
        LocalDateTime from = createdFrom != null ? createdFrom.atStartOfDay() : null;
        LocalDateTime to = createdTo != null ? createdTo.plusDays(1).atStartOfDay().minusNanos(1) : null;
        return ResponseEntity.ok(ticketService.listEscalations(userId, role, status, agentId, teamId, search, from, to));
    }

    @PostMapping("/{id}/accept")
    public ResponseEntity<Void> acceptEscalation(
            @PathVariable UUID id,
            @Valid @RequestBody AcceptEscalationRequestDTO dto,
            @RequestHeader("X-User-Id") String userIdHeader,
            @RequestHeader("X-User-Role") String roleHeader
    ) {
        Role role = Role.valueOf(roleHeader);
        if (role != Role.MANAGER && role != Role.ADMIN) {
            throw new UnauthorizedTicketActionException("Only managers/admins can accept escalations");
        }
        UUID userId = UUID.fromString(userIdHeader);
        ticketService.acceptEscalation(id, userId, dto.isSetInProgress(), dto.isTakeOwnership());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<Void> rejectEscalation(
            @PathVariable UUID id,
            @Valid @RequestBody RejectEscalationRequestDTO dto,
            @RequestHeader("X-User-Id") String userIdHeader,
            @RequestHeader("X-User-Role") String roleHeader
    ) {
        Role role = Role.valueOf(roleHeader);
        if (role != Role.MANAGER && role != Role.ADMIN) {
            throw new UnauthorizedTicketActionException("Only managers/admins can reject escalations");
        }
        UUID userId = UUID.fromString(userIdHeader);
        ticketService.rejectEscalation(id, dto.getReason(), userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/reassign")
    public ResponseEntity<Void> reassignEscalation(
            @PathVariable UUID id,
            @Valid @RequestBody ReassignEscalationRequestDTO dto,
            @RequestHeader("X-User-Id") String userIdHeader,
            @RequestHeader("X-User-Role") String roleHeader
    ) {
        Role role = Role.valueOf(roleHeader);
        if (role != Role.MANAGER && role != Role.ADMIN) {
            throw new UnauthorizedTicketActionException("Only managers/admins can reassign escalations");
        }
        UUID userId = UUID.fromString(userIdHeader);
        ticketService.reassignEscalation(id, dto.getAgentId(), userId);
        return ResponseEntity.ok().build();
    }
}