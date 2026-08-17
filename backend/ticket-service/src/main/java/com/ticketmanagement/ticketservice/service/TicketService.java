package com.ticketmanagement.ticketservice.service;

import com.ticketmanagement.ticketservice.dto.*;
import com.ticketmanagement.ticketservice.entity.EscalationStatus;
import com.ticketmanagement.ticketservice.entity.Role;
import com.ticketmanagement.ticketservice.entity.TicketStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface TicketService {
    TicketResponseDTO createTicket(TicketRequestDTO dto, UUID createdByUserId);
    List<TicketResponseDTO> getAllTickets(UUID userId, Role role);
    TicketDetailResponseDTO getTicketById(UUID id);
    TicketResponseDTO changeStatus(UUID ticketId, TicketStatus newStatus, UUID changedByUserId, Role role);
    TicketResponseDTO assignTicket(UUID ticketId, UUID agentId, UUID assignedByUserId);
    CommentResponseDTO addComment(UUID ticketId, CommentRequestDTO dto, UUID authorUserId, Role role);
    List<CommentResponseDTO> getCommentsForTicket(UUID ticketId);
    long countByAssignedAgentIdAndStatus(String assignedAgentId, TicketStatus status);
    void requestEscalation(UUID ticketId, String reason, UUID agentUserId);
    List<EscalationResponseDTO> listEscalations(UUID userId, Role role, EscalationStatus status,
                                                UUID agentId, UUID teamId, String search,
                                                LocalDateTime createdFrom, LocalDateTime createdTo);
    void acceptEscalation(UUID escalationId, UUID managerUserId, boolean setInProgress, boolean takeOwnership);
    void rejectEscalation(UUID escalationId, String reason, UUID managerUserId);
    void reassignEscalation(UUID escalationId, UUID newAgentId, UUID managerUserId);
}