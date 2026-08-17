package com.ticketmanagement.ticketservice.service;

import com.ticketmanagement.ticketservice.client.AssignmentServiceClient;
import com.ticketmanagement.ticketservice.client.AuthServiceClient;
import com.ticketmanagement.ticketservice.client.NotificationClient;
import com.ticketmanagement.ticketservice.dto.*;
import com.ticketmanagement.ticketservice.entity.*;
import com.ticketmanagement.ticketservice.exception.InvalidAgentException;
import com.ticketmanagement.ticketservice.exception.InvalidStatusTransitionException;
import com.ticketmanagement.ticketservice.exception.TicketNotFoundException;
import com.ticketmanagement.ticketservice.exception.UnauthorizedTicketActionException;
import com.ticketmanagement.ticketservice.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TicketServiceImpl implements TicketService {

    private final TicketRepository ticketRepository;
    private final CommentRepository commentRepository;
    private final TicketHistoryRepository ticketHistoryRepository;
    private final EscalationRepository escalationRepository;
    private final AuthServiceClient authServiceClient;
    private final NotificationClient notificationClient;
    private final AssignmentServiceClient assignmentServiceClient;

    private static final Map<TicketStatus, Set<TicketStatus>> ALLOWED_TRANSITIONS = Map.of(
            TicketStatus.NEW, Set.of(TicketStatus.ASSIGNED),
            TicketStatus.ASSIGNED, Set.of(TicketStatus.IN_PROGRESS),
            TicketStatus.IN_PROGRESS, Set.of(TicketStatus.PENDING, TicketStatus.RESOLVED),
            TicketStatus.PENDING, Set.of(TicketStatus.IN_PROGRESS),
            TicketStatus.RESOLVED, Set.of(TicketStatus.CLOSED, TicketStatus.REOPENED),
            TicketStatus.REOPENED, Set.of(TicketStatus.IN_PROGRESS)
    );

    @Override
    @Transactional
    public TicketResponseDTO createTicket(TicketRequestDTO dto, UUID createdByUserId) {
        Ticket ticket = new Ticket();
        ticket.setTitle(dto.getTitle());
        ticket.setDescription(dto.getDescription());
        ticket.setStatus(TicketStatus.NEW);
        ticket.setPriority(dto.getPriority() != null ? dto.getPriority() : Priority.MEDIUM);
        ticket.setCategory(dto.getCategory());
        ticket.setCustomerId(dto.getCustomerId());
        ticket.setTeamId(dto.getTeamId());
        ticket.setCreatedAt(LocalDateTime.now());
        ticket.setUpdatedAt(LocalDateTime.now());

        Ticket saved = ticketRepository.save(ticket);

        String creatorName = null;
        try {
            UserSummaryDTO creator = authServiceClient.getUserById(createdByUserId);
            if (creator != null) {
                creatorName = creator.getFullName();
            }
        } catch (Exception ignored) {
        }
        createTicketHistoryEvent(saved,
                TicketHistoryEventType.TICKET_CREATED,
                "Ticket created",
                null,
                createdByUserId,
                creatorName
        );

        if (saved.getTeamId() != null) {
            notifyManagerNewTicket(saved);
        }
        if (saved.getPriority() == Priority.CRITICAL) {
            notifyCriticalTicket(saved);
        }

        Map<UUID, UserSummaryDTO> userCache = new HashMap<>();
        return mapToTicketResponse(saved, userCache);
    }

    @Override
    public List<TicketResponseDTO> getAllTickets(UUID userId, Role role) {
        List<Ticket> tickets;

        if (role == Role.AGENT) {
            tickets = ticketRepository.findByAssignedAgentIdOrderByCreatedAtDesc(userId);

        } else if (role == Role.MANAGER) {
            List<Map<String, Object>> managerTeams =
                    assignmentServiceClient.getAllTeamsByManagerId(userId.toString());

            if (managerTeams == null || managerTeams.isEmpty()) {
                tickets = List.of();
            } else {
                Set<UUID> teamIds = new HashSet<>();
                Set<UUID> agentIds = new HashSet<>();

                for (Map<String, Object> team : managerTeams) {
                    if (team.get("id") == null) continue;
                    UUID teamId = UUID.fromString(team.get("id").toString());
                    teamIds.add(teamId);

                    List<Map<String, Object>> teamAgents = assignmentServiceClient.getAgentsInTeam(teamId);
                    if (teamAgents != null) {
                        for (Map<String, Object> a : teamAgents) {
                            Object uid = a.get("userId");
                            if (uid != null) {
                                agentIds.add(UUID.fromString(uid.toString()));
                            }
                        }
                    }
                }

                Map<UUID, Ticket> unique = new LinkedHashMap<>();

                for (UUID teamId : teamIds) {
                    for (Ticket t : ticketRepository.findByTeamIdOrderByCreatedAtDesc(teamId)) {
                        unique.put(t.getId(), t);
                    }
                }

                if (!agentIds.isEmpty()) {
                    ticketRepository.findAll().stream()
                            .filter(t -> t.getAssignedAgentId() != null && agentIds.contains(t.getAssignedAgentId()))
                            .forEach(t -> unique.putIfAbsent(t.getId(), t));
                }

                tickets = unique.values().stream()
                        .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                        .toList();
            }
        } else {
            tickets = ticketRepository.findAllByOrderByCreatedAtDesc();
        }

        Map<UUID, UserSummaryDTO> userCache = new HashMap<>();
        return tickets.stream()
                .map(t -> mapToTicketResponse(t, userCache))
                .toList();
    }

    private void checkAgentAuthorization(UUID ticketId, UUID userId, Role role) {
        if (role == Role.AGENT) {
            Ticket ticket = getTicketEntityById(ticketId);
            if (ticket.getAssignedAgentId() == null || !ticket.getAssignedAgentId().equals(userId)) {
                throw new UnauthorizedTicketActionException("Not authorized to act on this ticket");
            }
        }
    }

    @Override
    public TicketDetailResponseDTO getTicketById(UUID id) {
        try {
            Ticket ticket = getTicketEntityById(id);
            Map<UUID, UserSummaryDTO> userCache = new HashMap<>();
            TicketResponseDTO basic = mapToTicketResponse(ticket, userCache);

            List<CommentResponseDTO> comments = commentRepository.findByTicketId(ticket.getId()).stream()
            .map(comment -> mapToCommentResponse(comment, userCache))
            .toList(); // <-- Point-virgule manquant ici

        List<TicketHistoryResponseDTO> history = ticketHistoryRepository.findByTicketIdOrderByChangedAtDesc(ticket.getId()).stream()
            .map(h -> mapToTicketHistoryResponse(h, userCache))
            .toList();

            return new TicketDetailResponseDTO(
                    basic.getId(),
                    basic.getTitle(),
                    basic.getDescription(),
                    basic.getStatus(),
                    basic.getPriority(),
                    basic.getCategory(),
                    basic.getCustomerId(),
                    basic.getRequestId(),
                    basic.getCreatedAt(),
                    basic.getUpdatedAt(),
                    basic.getAssignedAgentId(),
                    basic.getAssignedAgentName(),
                    comments.size(),
                    comments,
                    history,
                    basic.getTeamId()
            );
        } catch (Exception e) {
            System.err.println("===== getTicketById FAILED for id=" + id + " =====");
            e.printStackTrace();
            throw e;
        }
    }

    @Override
    @Transactional
    public TicketResponseDTO changeStatus(UUID ticketId, TicketStatus newStatus, UUID changedByUserId, Role role) {
        checkAgentAuthorization(ticketId, changedByUserId, role);
        Ticket ticket = getTicketEntityById(ticketId);
        TicketStatus oldStatus = ticket.getStatus();

        validateStatusTransition(oldStatus, newStatus);

        ticket.setStatus(newStatus);
        ticket.setUpdatedAt(LocalDateTime.now());
        Ticket saved = ticketRepository.save(ticket);

        createTicketHistory(ticket, oldStatus, newStatus, changedByUserId);

        String statusMessage = String.format("Ticket #%s status changed to %s",
                saved.getId().toString().substring(0, 8), newStatus);
        if (saved.getAssignedAgentId() != null) {
            UserSummaryDTO agent = authServiceClient.getUserById(saved.getAssignedAgentId());
            if (agent != null) {
                notifyUserWithEmail(agent,
                        "Ticket Status Changed",
                        statusMessage,
                        NotificationType.STATUS_CHANGED,
                        saved.getId(),
                        saved.getTeamId(),
                        buildStatusChangeEmailHtml(
                                agent.getFullName(),
                                saved.getId().toString().substring(0, 8),
                                saved.getTitle(),
                                newStatus
                        )
                );
            }
        }

        List<UserSummaryDTO> admins = authServiceClient.getUsersByRole("ADMIN");
        notifyUsersWithEmail(admins,
                "Ticket Status Updated",
                statusMessage,
                NotificationType.STATUS_CHANGED,
                saved.getId(),
                saved.getTeamId(),
                buildStatusChangeEmailHtml("Admin", saved.getId().toString().substring(0, 8), saved.getTitle(), newStatus)
        );

        Map<UUID, UserSummaryDTO> userCache = new HashMap<>();
        return mapToTicketResponse(saved, userCache);
    }

    @Override
    @Transactional
    public TicketResponseDTO assignTicket(UUID ticketId, UUID agentId, UUID assignedByUserId) {
        UserSummaryDTO agent = authServiceClient.getUserByIdStrict(agentId);
        if (agent == null) {
            throw new InvalidAgentException("Agent with id " + agentId + " does not exist or could not be verified");
        }
        if (agent.getRole() == null || !agent.getRole().equalsIgnoreCase(Role.AGENT.name())) {
            throw new InvalidAgentException("User with id " + agentId + " does not have AGENT role (role: " + agent.getRole() + ")");
        }

        Map<String, Object> agentProfile = assignmentServiceClient.getAgentProfileByUserId(agentId.toString());
        int maxConcurrentTickets = 5;
        if (agentProfile != null && agentProfile.get("maxConcurrentTickets") != null) {
            Object maxTicketsObj = agentProfile.get("maxConcurrentTickets");
            if (maxTicketsObj instanceof Number numeric) {
                maxConcurrentTickets = numeric.intValue();
            } else {
                try {
                    maxConcurrentTickets = Integer.parseInt(maxTicketsObj.toString());
                } catch (NumberFormatException ignored) {
                }
            }
        }

        Ticket ticket = getTicketEntityById(ticketId);
        long activeTickets = ticketRepository.countByAssignedAgentIdAndStatusIn(agentId,
                Set.of(TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.PENDING));
        if (activeTickets >= maxConcurrentTickets) {
            throw new InvalidAgentException(String.format(
                    "Cannot assign ticket: agent has %d active ticket(s) and max allowed is %d.",
                    activeTickets, maxConcurrentTickets));
        }

        UserSummaryDTO assigner = authServiceClient.getUserById(assignedByUserId);
        if (assigner != null && "MANAGER".equalsIgnoreCase(assigner.getRole())) {

            List<Map<String, Object>> managerTeams =
                    assignmentServiceClient.getAllTeamsByManagerId(assignedByUserId.toString());

            if (managerTeams == null || managerTeams.isEmpty()) {
                throw new UnauthorizedTicketActionException(
                        "Cannot assign ticket: you do not belong to any team. Please contact an administrator."
                );
            }

            Set<UUID> managerTeamIds = managerTeams.stream()
                    .map(t -> t.get("id"))
                    .filter(Objects::nonNull)
                    .map(idObj -> {
                        try {
                            return UUID.fromString(idObj.toString());
                        } catch (Exception e) {
                            return null;
                        }
                    })
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());

            if (managerTeamIds.isEmpty()) {
                throw new UnauthorizedTicketActionException(
                        "Cannot assign ticket: you do not belong to any team. Please contact an administrator."
                );
            }

            Set<UUID> agentTeamIds = assignmentServiceClient.getAgentTeamIdsByUserId(agentId.toString());
            UUID agentTeamId = null;

            if (!agentTeamIds.isEmpty()) {
                if (ticket.getTeamId() != null && managerTeamIds.contains(ticket.getTeamId())
                        && agentTeamIds.contains(ticket.getTeamId())) {
                    agentTeamId = ticket.getTeamId();
                }
            }

            if (agentTeamId == null) {
                for (UUID teamId : managerTeamIds) {
                    if (agentTeamIds.contains(teamId)) {
                        agentTeamId = teamId;
                        break;
                    }
                }
            }

            if (agentTeamId == null) {
                throw new UnauthorizedTicketActionException("Cannot assign ticket: agent is not in your team");
            }

            if (ticket.getTeamId() == null || !ticket.getTeamId().equals(agentTeamId)) {
                ticket.setTeamId(agentTeamId);
                ticket.setUpdatedAt(LocalDateTime.now());
                ticket = ticketRepository.save(ticket);
            }
        }

        UUID previousAgentId = ticket.getAssignedAgentId();
        boolean isReassignment = previousAgentId != null && !previousAgentId.equals(agentId);
        ticket.setAssignedAgentId(agentId);

        Ticket updated;
        if (ticket.getStatus() == TicketStatus.NEW) {
            updated = changeStatusInternal(ticket, TicketStatus.ASSIGNED, assignedByUserId);
        } else {
            ticket.setUpdatedAt(LocalDateTime.now());
            updated = ticketRepository.save(ticket);
            if (agent != null) {
                String historyMessage = isReassignment
                        ? "Ticket reassigned to " + agent.getFullName()
                        : "Ticket assigned to " + agent.getFullName();
                TicketHistoryEventType eventType = isReassignment
                        ? TicketHistoryEventType.TICKET_REASSIGNED
                        : TicketHistoryEventType.TICKET_ASSIGNED;
                String assignerName = assigner != null ? assigner.getFullName() : null;
                createTicketHistoryEvent(
                        updated,
                        eventType,
                        historyMessage,
                        null,
                        assignedByUserId,
                        assignerName
                );
            }
        }

        String assignmentMessage = String.format("You have been assigned Ticket #%s: %s",
                updated.getId().toString().substring(0, 8), updated.getTitle());
        String assignmentEmail = buildTicketAssignedEmailHtml(
                agent.getFullName(),
                updated.getId().toString().substring(0, 8),
                updated.getTitle(),
                updated.getPriority() != null ? updated.getPriority().toString() : "MEDIUM",
                updated.getCategory() != null ? updated.getCategory().toString() : "UNSPECIFIED"
        );
        notifyUserWithEmail(agent,
                "New Ticket Assigned",
                assignmentMessage,
                NotificationType.TICKET_ASSIGNED,
                updated.getId(),
                updated.getTeamId(),
                assignmentEmail
        );

        Map<UUID, UserSummaryDTO> userCache = new HashMap<>();
        return mapToTicketResponse(updated, userCache);
    }

    @Override
    @Transactional
    public CommentResponseDTO addComment(UUID ticketId, CommentRequestDTO dto, UUID authorUserId, Role role) {
        checkAgentAuthorization(ticketId, authorUserId, role);
        Ticket ticket = getTicketEntityById(ticketId);

        Comment comment = new Comment();
        comment.setTicket(ticket);
        comment.setContent(dto.getContent());
        comment.setInternal(dto.isInternal());
        comment.setAuthorId(authorUserId);
        comment.setCreatedAt(LocalDateTime.now());

        Comment saved = commentRepository.save(comment);

        if (ticket.getAssignedAgentId() != null && !ticket.getAssignedAgentId().equals(authorUserId)) {
            CreateNotificationRequestDTO commentNotif = new CreateNotificationRequestDTO();
            commentNotif.setUserId(ticket.getAssignedAgentId());
            commentNotif.setTitle("New Comment on Ticket");
            commentNotif.setMessage(String.format("New comment on Ticket #%s", ticket.getId().toString().substring(0, 8)));
            commentNotif.setType(NotificationType.COMMENT_ADDED);
            commentNotif.setTicketId(ticket.getId());
            commentNotif.setTeamId(ticket.getTeamId());
            notificationClient.createNotification(commentNotif);
        }

        Map<UUID, UserSummaryDTO> userCache = new HashMap<>();
        return mapToCommentResponse(saved, userCache);
    }

    @Override
    public List<CommentResponseDTO> getCommentsForTicket(UUID ticketId) {
        Map<UUID, UserSummaryDTO> userCache = new HashMap<>();
        return commentRepository.findByTicketId(ticketId).stream()
                .map(c -> mapToCommentResponse(c, userCache))
                .toList();
    }

    @Override
    public long countByAssignedAgentIdAndStatus(String assignedAgentId, TicketStatus status) {
        return ticketRepository.countByAssignedAgentIdAndStatus(assignedAgentId, status);
    }

    @Override
    @Transactional
    public void requestEscalation(UUID ticketId, String reason, UUID agentUserId) {
        Ticket ticket = getTicketEntityById(ticketId);

        if (ticket.getAssignedAgentId() == null || !ticket.getAssignedAgentId().equals(agentUserId)) {
            throw new UnauthorizedTicketActionException("Only the assigned agent can request escalation");
        }
        if (ticket.getTeamId() == null) {
            throw new UnauthorizedTicketActionException("Ticket is not associated with a team");
        }
        if (reason == null || reason.isBlank()) {
            throw new UnauthorizedTicketActionException("Escalation reason is required");
        }

        String managerId = assignmentServiceClient.getManagerIdByTeamId(ticket.getTeamId());
        if (managerId == null) {
            throw new UnauthorizedTicketActionException("No manager found for this ticket's team");
        }

        var existing = escalationRepository.findFirstByTicketIdAndStatus(ticketId, EscalationStatus.PENDING);
        if (existing.isPresent()) {
            throw new UnauthorizedTicketActionException("An escalation is already pending for this ticket");
        }

        Escalation esc = new Escalation();
        esc.setTicketId(ticketId);
        esc.setRequestedByAgentId(agentUserId);
        esc.setManagerId(UUID.fromString(managerId));
        esc.setTeamId(ticket.getTeamId());
        esc.setReason(reason);
        esc.setStatus(EscalationStatus.PENDING);
        esc.setCreatedAt(LocalDateTime.now());
        esc.setUpdatedAt(LocalDateTime.now());
        escalationRepository.save(esc);

        UserSummaryDTO agent = authServiceClient.getUserById(agentUserId);
        String agentName = (agent != null && agent.getFullName() != null) ? agent.getFullName() : "Unknown Agent";

        createTicketHistoryEvent(
                ticket,
                TicketHistoryEventType.ESCALATION_REQUESTED,
                agentName + " requested help",
                reason,
                agentUserId,
                agentName
        );

        String escalationMessage = "🚨 Escalation Request\nAgent: %s\nTicket: #%s\nReason: %s"
                .formatted(agentName, ticket.getId().toString().substring(0, 8), reason);
        UserSummaryDTO manager = authServiceClient.getUserById(UUID.fromString(managerId));
        if (manager != null) {
            notifyUserWithEmail(manager,
                    "Escalation Request",
                    escalationMessage,
                    NotificationType.ESCALATION_REQUEST,
                    ticket.getId(),
                    ticket.getTeamId(),
                    buildNotificationEmailHtml(manager.getFullName(), "Escalation Request", escalationMessage)
            );
        }
    }

    @Override
    public List<EscalationResponseDTO> listEscalations(UUID userId, Role role, EscalationStatus status,
                                                        UUID agentId, UUID teamId, String search,
                                                        LocalDateTime createdFrom, LocalDateTime createdTo) {
        List<Escalation> list;
        if (role == Role.ADMIN) {
            list = escalationRepository.findAll();
        } else if (role == Role.MANAGER) {
            List<Map<String, Object>> teams = assignmentServiceClient.getAllTeamsByManagerId(userId.toString());
            List<UUID> teamIds = teams != null ? teams.stream()
                    .map(t -> t.get("id")).filter(Objects::nonNull)
                    .map(id -> UUID.fromString(id.toString()))
                    .toList() : List.of();
            Set<Escalation> byManager = new HashSet<>(escalationRepository.findByManagerId(userId));
            Set<Escalation> byTeams = teamIds.isEmpty() ? Set.of() :
                    new HashSet<>(escalationRepository.findAll().stream()
                            .filter(e -> e.getTeamId() != null && teamIds.contains(e.getTeamId()))
                            .toList());
            Set<Escalation> merged = new HashSet<>(byManager);
            merged.addAll(byTeams);
            list = merged.stream().toList();
        } else if (role == Role.AGENT) {
            list = escalationRepository.findByRequestedByAgentId(userId);
        } else {
            list = List.of();
        }

        Map<UUID, Ticket> ticketCache = new HashMap<>();
        Map<UUID, UserSummaryDTO> userCache = new HashMap<>();

        String s = search != null ? search.trim().toLowerCase() : null;

        return list.stream()
                .filter(e -> status == null || e.getStatus() == status)
                .filter(e -> agentId == null || agentId.equals(e.getRequestedByAgentId()))
                .filter(e -> teamId == null || teamId.equals(e.getTeamId()))
                .filter(e -> createdFrom == null || !e.getCreatedAt().isBefore(createdFrom))
                .filter(e -> createdTo == null || !e.getCreatedAt().isAfter(createdTo))
                .filter(e -> {
                    if (s == null || s.isEmpty()) return true;
                    if (e.getReason() != null && e.getReason().toLowerCase().contains(s)) return true;
                    Ticket t = ticketCache.computeIfAbsent(e.getTicketId(), tid -> {
                        try { return getTicketEntityById(tid); } catch (Exception ex) { return null; }
                    });
                    if (t != null) {
                        if (t.getTitle() != null && t.getTitle().toLowerCase().contains(s)) return true;
                        if (t.getRequestId() != null && t.getRequestId().toLowerCase().contains(s)) return true;
                    }
                    UserSummaryDTO u = userCache.computeIfAbsent(e.getRequestedByAgentId(), uid -> authServiceClient.getUserById(uid));
                    return u != null && u.getFullName() != null && u.getFullName().toLowerCase().contains(s);
                })
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(e -> {
                    String requesterName = null;
                    if (e.getRequestedByAgentId() != null) {
                        UserSummaryDTO u = userCache.computeIfAbsent(e.getRequestedByAgentId(), uid -> authServiceClient.getUserById(uid));
                        if (u != null) requesterName = u.getFullName();
                    }
                    EscalationResponseDTO dto = new EscalationResponseDTO();
                    dto.setId(e.getId());
                    dto.setTicketId(e.getTicketId());
                    dto.setRequestedByAgentId(e.getRequestedByAgentId());
                    dto.setRequestedByAgentName(requesterName);
                    dto.setManagerId(e.getManagerId());
                    dto.setTeamId(e.getTeamId());
                    dto.setReason(e.getReason());
                    dto.setStatus(e.getStatus());
                    dto.setManagerResponseReason(e.getManagerResponseReason());
                    dto.setReassignedToAgentId(e.getReassignedToAgentId());
                    dto.setCreatedAt(e.getCreatedAt());
                    dto.setUpdatedAt(e.getUpdatedAt());
                    try {
                        Ticket t = ticketCache.computeIfAbsent(e.getTicketId(), tid -> getTicketEntityById(tid));
                        if (t != null) {
                            dto.setTicketTitle(t.getTitle());
                            dto.setTicketStatus(t.getStatus());
                            dto.setTicketPriority(t.getPriority());
                            dto.setTicketRequestId(t.getRequestId());
                        }
                    } catch (Exception ignored) {}
                    return dto;
                })
                .toList();
    }

    @Override
    @Transactional
    public void acceptEscalation(UUID escalationId, UUID managerUserId, boolean setInProgress, boolean takeOwnership) {
        Escalation esc = escalationRepository.findById(escalationId)
                .orElseThrow(() -> new TicketNotFoundException("Escalation not found"));

        UserSummaryDTO caller = authServiceClient.getUserById(managerUserId);
        boolean isAdmin = caller != null && Role.ADMIN.name().equalsIgnoreCase(caller.getRole());
        if (!isAdmin && !esc.getManagerId().equals(managerUserId)) {
            throw new UnauthorizedTicketActionException("Not authorized to manage this escalation");
        }
        if (esc.getStatus() != EscalationStatus.PENDING) {
            throw new UnauthorizedTicketActionException("Escalation is not pending");
        }

        esc.setStatus(EscalationStatus.ACCEPTED);
        esc.setUpdatedAt(LocalDateTime.now());
        escalationRepository.save(esc);

        Ticket ticket = getTicketEntityById(esc.getTicketId());

        if (takeOwnership) {
            UUID oldAssignedAgentId = ticket.getAssignedAgentId();
            ticket.setAssignedAgentId(managerUserId);
            ticket.setUpdatedAt(LocalDateTime.now());
            UserSummaryDTO owner = authServiceClient.getUserById(managerUserId);
            String ownerName = owner != null ? owner.getFullName() : "Manager";
            ticketRepository.save(ticket);
            createTicketHistoryEvent(
                    ticket,
                    TicketHistoryEventType.STATUS_CHANGED,
                    "Ticket ownership transferred to " + ownerName,
                    null,
                    managerUserId,
                    ownerName
            );
            if (owner != null) {
                notifyUserWithEmail(owner,
                        "Escalation — Ticket Assigned",
                        "You took ownership of Ticket #%s: %s".formatted(ticket.getId().toString().substring(0, 8), ticket.getTitle()),
                        NotificationType.TICKET_ASSIGNED,
                        ticket.getId(),
                        ticket.getTeamId(),
                        buildNotificationEmailHtml(owner.getFullName(), "Escalation — Ticket Assigned", "You took ownership of Ticket #%s: %s".formatted(ticket.getId().toString().substring(0, 8), ticket.getTitle()))
                );
            }
            if (oldAssignedAgentId != null && !oldAssignedAgentId.equals(managerUserId)) {
                UserSummaryDTO previousAgent = authServiceClient.getUserById(oldAssignedAgentId);
                String reassignedMessage = "Ticket #%s was reassigned to %s via escalation acceptance"
                        .formatted(ticket.getId().toString().substring(0, 8), ownerName);
                if (previousAgent != null) {
                    notifyUserWithEmail(previousAgent,
                            "Escalation — Ticket Reassigned",
                            reassignedMessage,
                            NotificationType.ESCALATION_REASSIGNED,
                            ticket.getId(),
                            ticket.getTeamId(),
                            buildNotificationEmailHtml(previousAgent.getFullName(), "Escalation — Ticket Reassigned", reassignedMessage)
                    );
                }
            }
        }

        if (setInProgress) {
            TicketStatus old = ticket.getStatus();
            if (old == TicketStatus.ASSIGNED || old == TicketStatus.PENDING
                    || old == TicketStatus.REOPENED || old == TicketStatus.NEW) {
                ticket.setStatus(TicketStatus.IN_PROGRESS);
                ticket.setUpdatedAt(LocalDateTime.now());
                ticketRepository.save(ticket);
                createTicketHistory(ticket, old, TicketStatus.IN_PROGRESS, managerUserId);
            }
        } else if (!takeOwnership) {
            ticket.setUpdatedAt(LocalDateTime.now());
            ticketRepository.save(ticket);
        }

        UserSummaryDTO managerUser = authServiceClient.getUserById(managerUserId);
        String managerName = managerUser != null ? managerUser.getFullName() : "Manager";

        String historyMsg = takeOwnership
                ? "Escalation accepted and ownership taken by " + managerName
                : "Escalation accepted by " + managerName;
        createTicketHistoryEvent(
                ticket,
                TicketHistoryEventType.ESCALATION_ACCEPTED,
                historyMsg,
                null,
                managerUserId,
                managerName
        );

        if (esc.getRequestedByAgentId() != null) {
            UserSummaryDTO requester = authServiceClient.getUserById(esc.getRequestedByAgentId());
            if (requester != null) {
                String agentMsg = takeOwnership
                        ? "Your escalation for Ticket #%s was accepted by %s — they took ownership of the ticket"
                        : "Your escalation for Ticket #%s was accepted by %s";
                agentMsg = agentMsg.formatted(ticket.getId().toString().substring(0, 8), managerName);
                notifyUserWithEmail(requester,
                        "Escalation Accepted",
                        agentMsg,
                        NotificationType.ESCALATION_ACCEPTED,
                        ticket.getId(),
                        ticket.getTeamId(),
                        buildNotificationEmailHtml(requester.getFullName(), "Escalation Accepted", agentMsg)
                );
            }
        }
    }

    @Override
    @Transactional
    public void rejectEscalation(UUID escalationId, String reason, UUID managerUserId) {
        if (reason == null || reason.isBlank()) {
            throw new UnauthorizedTicketActionException("Reject reason is required");
        }

        Escalation esc = escalationRepository.findById(escalationId)
                .orElseThrow(() -> new TicketNotFoundException("Escalation not found"));

        UserSummaryDTO caller = authServiceClient.getUserById(managerUserId);
        boolean isAdmin = caller != null && Role.ADMIN.name().equalsIgnoreCase(caller.getRole());
        if (!isAdmin && !esc.getManagerId().equals(managerUserId)) {
            throw new UnauthorizedTicketActionException("Not authorized to manage this escalation");
        }
        if (esc.getStatus() != EscalationStatus.PENDING) {
            throw new UnauthorizedTicketActionException("Escalation is not pending");
        }

        esc.setStatus(EscalationStatus.REJECTED);
        esc.setManagerResponseReason(reason);
        esc.setUpdatedAt(LocalDateTime.now());
        escalationRepository.save(esc);

        Ticket ticket = getTicketEntityById(esc.getTicketId());
        UserSummaryDTO managerUser = authServiceClient.getUserById(managerUserId);
        String managerName = managerUser != null ? managerUser.getFullName() : "Manager";

        createTicketHistoryEvent(
                ticket,
                TicketHistoryEventType.ESCALATION_REJECTED,
                "Escalation rejected by " + managerName,
                reason,
                managerUserId,
                managerName
        );

        if (esc.getRequestedByAgentId() != null) {
            UserSummaryDTO requester = authServiceClient.getUserById(esc.getRequestedByAgentId());
            String rejectedMessage = "Your escalation for Ticket #%s was rejected by %s: %s"
                    .formatted(ticket.getId().toString().substring(0, 8), managerName, reason);
            if (requester != null) {
                notifyUserWithEmail(requester,
                        "Escalation Rejected",
                        rejectedMessage,
                        NotificationType.ESCALATION_REJECTED,
                        ticket.getId(),
                        ticket.getTeamId(),
                        buildNotificationEmailHtml(requester.getFullName(), "Escalation Rejected", rejectedMessage)
                );
            }
        }
    }

    @Override
    @Transactional
    public void reassignEscalation(UUID escalationId, UUID newAgentId, UUID managerUserId) {
        Escalation esc = escalationRepository.findById(escalationId)
                .orElseThrow(() -> new TicketNotFoundException("Escalation not found"));

        UserSummaryDTO caller = authServiceClient.getUserById(managerUserId);
        boolean isAdmin = caller != null && Role.ADMIN.name().equalsIgnoreCase(caller.getRole());
        if (!isAdmin && !esc.getManagerId().equals(managerUserId)) {
            throw new UnauthorizedTicketActionException("Not authorized to manage this escalation");
        }
        if (esc.getStatus() != EscalationStatus.PENDING) {
            throw new UnauthorizedTicketActionException("Escalation is not pending");
        }

        UUID teamId = esc.getTeamId();
        boolean teamCheckOk = teamId != null && assignmentServiceClient.isAgentInTeam(newAgentId.toString(), teamId);
        if (!teamCheckOk && !isAdmin) {
            boolean inAnyTeam = false;
            List<Map<String, Object>> teams = assignmentServiceClient.getAllTeamsByManagerId(managerUserId.toString());
            if (teams != null) {
                for (Map<String, Object> t : teams) {
                    if (t.get("id") == null) continue;
                    UUID tid = UUID.fromString(t.get("id").toString());
                    if (assignmentServiceClient.isAgentInTeam(newAgentId.toString(), tid)) {
                        inAnyTeam = true;
                        break;
                    }
                }
            }
            if (!inAnyTeam) {
                throw new UnauthorizedTicketActionException("Agent is not in your team");
            }
        }

        assignTicket(esc.getTicketId(), newAgentId, managerUserId);

        esc.setStatus(EscalationStatus.REASSIGNED);
        esc.setReassignedToAgentId(newAgentId);
        esc.setUpdatedAt(LocalDateTime.now());
        escalationRepository.save(esc);

        Ticket ticket = getTicketEntityById(esc.getTicketId());
        UserSummaryDTO managerUser = authServiceClient.getUserById(managerUserId);
        String managerName = managerUser != null ? managerUser.getFullName() : "Manager";
        UserSummaryDTO newAgent = authServiceClient.getUserById(newAgentId);
        String newAgentName = newAgent != null ? newAgent.getFullName() : "Agent";

        createTicketHistoryEvent(
                ticket,
                TicketHistoryEventType.ESCALATION_REASSIGNED,
                "Ticket reassigned to " + newAgentName,
                null,
                managerUserId,
                managerName
        );

        if (esc.getRequestedByAgentId() != null) {
            UserSummaryDTO requester = authServiceClient.getUserById(esc.getRequestedByAgentId());
            if (requester != null) {
                String agentMsg = "Your escalation for Ticket #%s was reassigned to %s by %s"
                        .formatted(ticket.getId().toString().substring(0, 8), newAgentName, managerName);
                notifyUserWithEmail(requester,
                        "Escalation Reassigned",
                        agentMsg,
                        NotificationType.ESCALATION_REASSIGNED,
                        ticket.getId(),
                        ticket.getTeamId(),
                        buildNotificationEmailHtml(requester.getFullName(), "Escalation Reassigned", agentMsg)
                );
            }
        }
    }

    private Ticket getTicketEntityById(UUID id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new TicketNotFoundException("Ticket with id " + id + " not found"));
    }

    private void validateStatusTransition(TicketStatus oldStatus, TicketStatus newStatus) {
        Set<TicketStatus> allowed = ALLOWED_TRANSITIONS.get(oldStatus);
        if (allowed == null || !allowed.contains(newStatus)) {
            throw new InvalidStatusTransitionException("Cannot transition from " + oldStatus + " to " + newStatus);
        }
    }

    private Ticket changeStatusInternal(Ticket ticket, TicketStatus newStatus, UUID changedByUserId) {
        TicketStatus oldStatus = ticket.getStatus();
        validateStatusTransition(oldStatus, newStatus);
        ticket.setStatus(newStatus);
        ticket.setUpdatedAt(LocalDateTime.now());
        Ticket saved = ticketRepository.save(ticket);

        String message = "Status changed from " + oldStatus + " to " + newStatus;
        if (oldStatus == TicketStatus.NEW && newStatus == TicketStatus.ASSIGNED && ticket.getAssignedAgentId() != null) {
            try {
                UserSummaryDTO assignedAgent = authServiceClient.getUserById(ticket.getAssignedAgentId());
                if (assignedAgent != null && assignedAgent.getFullName() != null) {
                    message = "Ticket assigned to " + assignedAgent.getFullName();
                }
            } catch (Exception ignored) {
            }
        } else if (newStatus == TicketStatus.RESOLVED) {
            message = "Ticket resolved";
        } else if (newStatus == TicketStatus.CLOSED) {
            message = "Ticket closed";
        } else if (newStatus == TicketStatus.REOPENED) {
            message = "Ticket reopened";
        }

        createTicketHistory(saved, oldStatus, newStatus, changedByUserId, message);
        return saved;
    }

    private void createTicketHistory(Ticket ticket, TicketStatus oldStatus, TicketStatus newStatus, UUID changedById) {
        createTicketHistory(ticket, oldStatus, newStatus, changedById,
                "Status changed from " + oldStatus + " to " + newStatus);
    }

    private void createTicketHistory(Ticket ticket, TicketStatus oldStatus, TicketStatus newStatus, UUID changedById, String message) {
        TicketHistory history = new TicketHistory();
        history.setTicket(ticket);
        history.setOldStatus(oldStatus);
        history.setNewStatus(newStatus);
        history.setChangedById(changedById);
        history.setEventType(TicketHistoryEventType.STATUS_CHANGED);
        history.setMessage(message);
        history.setChangedAt(LocalDateTime.now());
        ticketHistoryRepository.save(history);
    }

    private void createTicketHistoryEvent(Ticket ticket,
                                          TicketHistoryEventType eventType,
                                          String message,
                                          String reason,
                                          UUID actorId,
                                          String actorName) {
        TicketHistory history = new TicketHistory();
        history.setTicket(ticket);
        history.setOldStatus(null);
        history.setNewStatus(ticket.getStatus());
        history.setEventType(eventType != null ? eventType : TicketHistoryEventType.STATUS_CHANGED);
        history.setMessage(message);
        history.setReason(reason);
        history.setChangedById(actorId);
        history.setActorId(actorId);
        history.setActorName(actorName);
        history.setChangedAt(LocalDateTime.now());
        ticketHistoryRepository.save(history);
    }

    private void notifyManagerNewTicket(Ticket ticket) {
        try {
            String managerId = assignmentServiceClient.getManagerIdByTeamId(ticket.getTeamId());
            if (managerId == null) return;

            UserSummaryDTO manager = authServiceClient.getUserById(UUID.fromString(managerId));
            if (manager == null) return;

            String message = "Ticket #%s requires assignment.\nTitle: %s\nPriority: %s\nCategory: %s".formatted(
                    ticket.getId().toString().substring(0, 8),
                    ticket.getTitle(),
                    ticket.getPriority() != null ? ticket.getPriority() : "MEDIUM",
                    ticket.getCategory() != null ? ticket.getCategory() : "UNSPECIFIED"
            );

            notifyUserWithEmail(manager,
                    "New ticket received",
                    message,
                    NotificationType.NEW_TICKET,
                    ticket.getId(),
                    ticket.getTeamId(),
                    buildNotificationEmailHtml(manager.getFullName(), "New ticket received", message)
            );
        } catch (Exception e) {
            log.error("Failed to notify manager about new ticket: {}", e.getMessage(), e);
        }
    }

    private void notifyCriticalTicket(Ticket ticket) {
        try {
            String title = "Critical Ticket";
            String message = "🔥 Critical Ticket\nTicket #%s\nPriority: CRITICAL\nImmediate action required."
                    .formatted(ticket.getId().toString().substring(0, 8));

            if (ticket.getTeamId() != null) {
                String managerId = assignmentServiceClient.getManagerIdByTeamId(ticket.getTeamId());
                if (managerId != null) {
                    UserSummaryDTO manager = authServiceClient.getUserById(UUID.fromString(managerId));
                    if (manager != null) {
                        notifyUserWithEmail(manager,
                                title,
                                message,
                                NotificationType.CRITICAL_TICKET,
                                ticket.getId(),
                                ticket.getTeamId(),
                                buildNotificationEmailHtml(manager.getFullName(), title, message)
                        );
                    }
                }
            }
            if (ticket.getAssignedAgentId() != null) {
                UserSummaryDTO agent = authServiceClient.getUserById(ticket.getAssignedAgentId());
                if (agent != null) {
                    notifyUserWithEmail(agent,
                            title,
                            message,
                            NotificationType.CRITICAL_TICKET,
                            ticket.getId(),
                            ticket.getTeamId(),
                            buildNotificationEmailHtml(agent.getFullName(), title, message)
                    );
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to notify about critical ticket: " + e.getMessage());
        }
    }

    private void notifyUserWithEmail(UserSummaryDTO user,
                                     String title,
                                     String message,
                                     NotificationType type,
                                     UUID ticketId,
                                     UUID teamId,
                                     String emailBodyHtml) {
        if (user == null || user.getId() == null) {
            return;
        }

        try {
            CreateNotificationRequestDTO notification = new CreateNotificationRequestDTO();
            notification.setUserId(user.getId());
            notification.setTitle(title);
            notification.setMessage(message);
            notification.setType(type);
            notification.setTicketId(ticketId);
            notification.setTeamId(teamId);
            notificationClient.createNotification(notification);
        } catch (Exception e) {
            log.error("Failed to create notification for user {}: {}", user.getId(), e.getMessage(), e);
        }

        if (user.getEmail() == null || user.getEmail().isBlank()) {
            log.warn("Skipping email send because user {} has no email address", user.getId());
            return;
        }

        try {
            SendEmailRequestDTO emailRequest = new SendEmailRequestDTO();
            emailRequest.setTo(user.getEmail());
            emailRequest.setSubject(title);
            emailRequest.setBody(emailBodyHtml != null && !emailBodyHtml.isBlank() ? emailBodyHtml : message);
            notificationClient.sendEmail(emailRequest);
        } catch (Exception e) {
            log.error("Failed to send email notification to {}: {}", user.getEmail(), e.getMessage(), e);
        }
    }

    private void notifyUsersWithEmail(List<UserSummaryDTO> users,
                                      String title,
                                      String message,
                                      NotificationType type,
                                      UUID ticketId,
                                      UUID teamId,
                                      String emailBodyHtml) {
        if (users == null || users.isEmpty()) {
            return;
        }
        for (UserSummaryDTO user : users) {
            notifyUserWithEmail(user, title, message, type, ticketId, teamId, emailBodyHtml);
        }
    }

    private String buildNotificationEmailHtml(String toName, String subject, String body) {
        return """
                <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;\">
                    <div style=\"background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 30px; text-align: center; border-radius: 8px;\">
                        <h1 style=\"margin: 0; font-size: 24px;\">Ticket Management Platform</h1>
                    </div>
                    <div style=\"background: #ffffff; padding: 30px; border: 1px solid #eee; border-radius: 8px; margin-top: 20px;\">
                        <h2 style=\"color: #333; margin-top: 0;\">Hi %s,</h2>
                        <p style=\"color: #666; line-height: 1.6;\">%s</p>
                        <div style=\"color: #666; line-height: 1.8; white-space: pre-wrap;\">%s</div>
                    </div>
                </div>
                """.formatted(toName, subject, body);
    }

    private String buildStatusChangeEmailHtml(String toName, String shortId, String title, TicketStatus status) {
        return """
                <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;\">
                    <div style=\"background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 30px; text-align: center; border-radius: 8px;\">
                        <h1 style=\"margin: 0; font-size: 24px;\">Ticket Management Platform</h1>
                    </div>
                    <div style=\"background: #ffffff; padding: 30px; border: 1px solid #eee; border-radius: 8px; margin-top: 20px;\">
                        <h2 style=\"color: #333; margin-top: 0;\">Hi %s,</h2>
                        <p style=\"color: #666; line-height: 1.6;\">Your ticket status has changed.</p>
                        <ul style=\"color: #666; line-height: 1.8;\">
                            <li><strong>Ticket #:</strong> %s</li>
                            <li><strong>Title:</strong> %s</li>
                            <li><strong>Status:</strong> %s</li>
                        </ul>
                    </div>
                </div>
                """.formatted(toName, shortId, title, status);
    }

    private TicketResponseDTO mapToTicketResponse(Ticket ticket, Map<UUID, UserSummaryDTO> userCache) {
        String agentName = null;
        UUID agentId = ticket.getAssignedAgentId();
        if (agentId != null) {
            try {
                UserSummaryDTO user = getUserFromCache(agentId, userCache);
                if (user != null) agentName = user.getFullName();
            } catch (Exception ignored) {
            }
        }
        int commentsCount = 0;
        try {
            commentsCount = commentRepository.countByTicketId(ticket.getId());
        } catch (Exception ignored) {
        }

        return new TicketResponseDTO(
                ticket.getId(),
                ticket.getTitle(),
                ticket.getDescription(),
                ticket.getStatus(),
                ticket.getPriority(),
                ticket.getCategory(),
                ticket.getCustomerId(),
                ticket.getRequestId(),
                ticket.getCreatedAt(),
                ticket.getUpdatedAt(),
                agentId,
                agentName,
                commentsCount,
                ticket.getTeamId()
        );
    }

    private CommentResponseDTO mapToCommentResponse(Comment comment, Map<UUID, UserSummaryDTO> userCache) {
        UUID authorId = comment.getAuthorId();
        String authorName = null;
        if (authorId != null) {
            UserSummaryDTO user = getUserFromCache(authorId, userCache);
            if (user != null) authorName = user.getFullName();
        }
        return new CommentResponseDTO(
                comment.getId(),
                comment.getContent(),
                comment.getCreatedAt(),
                authorId,
                authorName,
                comment.isInternal()
        );
    }

    private TicketHistoryResponseDTO mapToTicketHistoryResponse(TicketHistory history,
                                                                Map<UUID, UserSummaryDTO> userCache) {
        UUID actorId = history.getActorId() != null ? history.getActorId() : history.getChangedById();
        String resolvedName = history.getActorName();
        if (resolvedName == null && actorId != null) {
            try {
                UserSummaryDTO user = getUserFromCache(actorId, userCache);
                if (user != null) resolvedName = user.getFullName();
            } catch (Exception ignored) {
            }
        }

        TicketHistoryEventType eventType = history.getEventType() != null
                ? history.getEventType()
                : TicketHistoryEventType.STATUS_CHANGED;

        return new TicketHistoryResponseDTO(
                history.getId(),
                history.getOldStatus(),
                history.getNewStatus(),
                resolvedName,
                history.getChangedAt() != null ? history.getChangedAt() : LocalDateTime.now(),
                eventType,
                history.getMessage(),
                history.getReason(),
                actorId,
                history.getActorName()
        );
    }

    private UserSummaryDTO getUserFromCache(UUID userId, Map<UUID, UserSummaryDTO> userCache) {
        if (userId == null) return null;
        return userCache.computeIfAbsent(userId, authServiceClient::getUserById);
    }

    private String buildTicketAssignedEmailHtml(String toName, String shortId, String title, String priority, String category) {
        return """
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 30px; text-align: center; border-radius: 8px;">
                        <h1 style="margin: 0; font-size: 24px;">Ticket Management Platform</h1>
                    </div>
                    <div style="background: #ffffff; padding: 30px; border: 1px solid #eee; border-radius: 8px; margin-top: 20px;">
                        <h2 style="color: #333; margin-top: 0;">Hi %s,</h2>
                        <p style="color: #666; line-height: 1.6;">A new ticket has been assigned to you.</p>
                        <ul style="color: #666; line-height: 1.8;">
                            <li><strong>Ticket #:</strong> %s</li>
                            <li><strong>Title:</strong> %s</li>
                            <li><strong>Priority:</strong> %s</li>
                            <li><strong>Category:</strong> %s</li>
                        </ul>
                    </div>
                </div>
                """.formatted(toName, shortId, title, priority, category);
    }

    private String buildStatusResolvedEmailHtml(String toName, String shortId, String title, TicketStatus status) {
        return """
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 30px; text-align: center; border-radius: 8px;">
                        <h1 style="margin: 0; font-size: 24px;">Ticket Management Platform</h1>
                    </div>
                    <div style="background: #ffffff; padding: 30px; border: 1px solid #eee; border-radius: 8px; margin-top: 20px;">
                        <h2 style="color: #333; margin-top: 0;">Hi %s,</h2>
                        <p style="color: #666; line-height: 1.6;">Ticket #%s has been resolved.</p>
                        <ul style="color: #666; line-height: 1.8;">
                            <li><strong>Ticket #:</strong> %s</li>
                            <li><strong>Title:</strong> %s</li>
                            <li><strong>Status:</strong> %s</li>
                        </ul>
                    </div>
                </div>
                """.formatted(toName, shortId, shortId, title, status);
    }
}