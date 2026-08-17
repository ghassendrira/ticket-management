package com.ticketmanagement.ticketservice.controller;

import com.ticketmanagement.ticketservice.client.AssignmentServiceClient;
import com.ticketmanagement.ticketservice.client.AuthServiceClient;
import com.ticketmanagement.ticketservice.dto.TeamActivityResponse;
import com.ticketmanagement.ticketservice.dto.UserDetailsResponse;
import com.ticketmanagement.ticketservice.dto.UserSummaryDTO;
import com.ticketmanagement.ticketservice.entity.Role;
import com.ticketmanagement.ticketservice.entity.Ticket;
import com.ticketmanagement.ticketservice.entity.TicketHistory;
import com.ticketmanagement.ticketservice.entity.TicketHistoryEventType;
import com.ticketmanagement.ticketservice.entity.TicketStatus;
import com.ticketmanagement.ticketservice.repository.TicketHistoryRepository;
import com.ticketmanagement.ticketservice.repository.TicketRepository;
import com.ticketmanagement.ticketservice.exception.UnauthorizedTicketActionException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
public class UserStatsController {

    private static final Set<TicketStatus> ACTIVE_STATUSES = Set.of(
            TicketStatus.NEW, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS,
            TicketStatus.PENDING, TicketStatus.REOPENED
    );

    private final AuthServiceClient authServiceClient;
    private final AssignmentServiceClient assignmentServiceClient;
    private final TicketRepository ticketRepository;
    private final TicketHistoryRepository ticketHistoryRepository;

    @GetMapping("/{userId}/details")
    public ResponseEntity<UserDetailsResponse> getUserDetails(
            @PathVariable String userId,
            @RequestHeader("X-User-Id") String callerId,
            @RequestHeader("X-User-Role") String callerRole
    ) {
        try {
            Role role = Role.valueOf(callerRole);

            // ADMIN can view any user
            if (role == Role.ADMIN) {
                // allowed
            } else if (role == Role.MANAGER) {
                // manager can view only users in their teams
                // get manager's teams and user's teams, check intersection
                List<Map<String, Object>> managerTeams = assignmentServiceClient.getAllTeamsByManagerId(callerId);
                Set<UUID> managerTeamIds = managerTeams.stream()
                        .map(t -> t.get("id")).filter(Objects::nonNull)
                        .map(Object::toString)
                        .map(id -> {
                            try { return UUID.fromString(id); } catch (Exception e) { return null; }
                        })
                        .filter(Objects::nonNull)
                        .collect(Collectors.toSet());

                Set<UUID> userTeamIds = assignmentServiceClient.getAgentTeamIdsByUserId(userId);
                boolean intersects = userTeamIds.stream().anyMatch(managerTeamIds::contains);
                if (!intersects) throw new UnauthorizedTicketActionException("You do not manage this user");
            } else if (role == Role.AGENT) {
                // agents can view only themselves
                if (!Objects.equals(callerId, userId)) throw new UnauthorizedTicketActionException("Not authorized");
            } else {
                throw new UnauthorizedTicketActionException("Not authorized to view user details");
            }

            UserSummaryDTO user = null;
            try {
                UUID uid = UUID.fromString(userId);
                user = authServiceClient.getUserById(uid);
            } catch (Exception e) {
                log.warn("Failed to parse user id {}: {}", userId, e.getMessage());
            }

            // Ticket statistics
            long totalAssigned = 0;
            long active = 0;
            long resolvedOrClosed = 0;
            try {
                UUID uid = UUID.fromString(userId);
                List<Ticket> assigned = ticketRepository.findByAssignedAgentIdOrderByCreatedAtDesc(uid);
                totalAssigned = assigned.size();
                active = ticketRepository.countByAssignedAgentIdAndStatusIn(uid, ACTIVE_STATUSES);
                resolvedOrClosed = ticketRepository.countResolvedInRange(
                        LocalDateTime.of(1970,1,1,0,0), LocalDateTime.now(),
                        Set.of(TicketStatus.RESOLVED, TicketStatus.CLOSED), null, uid);
            } catch (Exception e) {
                log.warn("Failed to compute ticket stats for {}: {}", userId, e.getMessage());
            }

            // Recent activity: gather by actorId or changedById
            List<TicketHistory> byActor = List.of();
            List<TicketHistory> byChanged = List.of();
            try {
                UUID uid = UUID.fromString(userId);
                byActor = ticketHistoryRepository.findByActorIdOrderByChangedAtDesc(uid);
                byChanged = ticketHistoryRepository.findByChangedByIdOrderByChangedAtDesc(uid);
            } catch (Exception e) {
                log.warn("Failed to fetch ticket history for {}: {}", userId, e.getMessage());
            }

            Map<UUID, TicketHistory> activityMap = new LinkedHashMap<>();
            for (TicketHistory h : byActor) {
                if (h == null || h.getId() == null) continue;
                activityMap.put(h.getId(), h);
            }
            for (TicketHistory h : byChanged) {
                if (h == null || h.getId() == null) continue;
                activityMap.putIfAbsent(h.getId(), h);
            }

            List<TeamActivityResponse> activity = activityMap.values().stream()
                    .map(h -> {
                        var t = h.getTicket();
                        String eventType = h.getEventType() != null ? h.getEventType().name() : "STATUS_CHANGED";
                        String message = formatEventMessage(h, t);
                        return TeamActivityResponse.builder()
                                .id(h.getId())
                                .eventType(eventType)
                                .message(message)
                                .ticketId(t != null ? t.getId() : null)
                                .ticketTitle(t != null ? t.getTitle() : null)
                                .actorName(h.getActorName() != null ? h.getActorName() : "System")
                                .timestamp(h.getChangedAt() != null ? h.getChangedAt() : LocalDateTime.now())
                                .build();
                    })
                    .limit(50)
                    .collect(Collectors.toList());

            UserDetailsResponse.UserTicketStats stats = UserDetailsResponse.UserTicketStats.builder()
                    .totalAssigned(totalAssigned)
                    .active(active)
                    .resolvedOrClosed(resolvedOrClosed)
                    .build();

            UserDetailsResponse resp = UserDetailsResponse.builder()
                    .user(user)
                    .ticketStats(stats)
                    .recentActivity(activity)
                    .build();

            return ResponseEntity.ok(resp);
        } catch (UnauthorizedTicketActionException e) {
            throw e; // let global handler return 403
        } catch (Exception e) {
            log.error("Unexpected error while fetching user details for {}: {}", userId, e.getMessage(), e);
            UserDetailsResponse resp = UserDetailsResponse.builder()
                    .user(null)
                    .ticketStats(UserDetailsResponse.UserTicketStats.builder().totalAssigned(0L).active(0L).resolvedOrClosed(0L).build())
                    .recentActivity(List.of())
                    .build();
            return ResponseEntity.ok(resp);
        }
    }

    private String formatEventMessage(TicketHistory h, Ticket ticket) {
        var type = h.getEventType();
        String title = ticket != null ? ticket.getTitle() : "the ticket";
        String actor = h.getActorName() != null ? h.getActorName() : "Someone";
        if (type == null) type = TicketHistoryEventType.STATUS_CHANGED;
        return switch (type) {
            case TICKET_CREATED -> actor + " created ticket '" + title + "'";
            case TICKET_ASSIGNED -> actor + " assigned ticket '" + title + "'";
            case TICKET_REASSIGNED -> actor + " reassigned ticket '" + title + "'";
            case STATUS_CHANGED -> {
                String from = h.getOldStatus() != null ? h.getOldStatus().name().toLowerCase().replace('_', ' ') : "none";
                String to = h.getNewStatus() != null ? h.getNewStatus().name().toLowerCase().replace('_', ' ') : "unknown";
                yield actor + " changed status of '" + title + "' from " + from + " to " + to;
            }
            case ESCALATION_REQUESTED -> actor + " requested escalation for '" + title + "'";
            case ESCALATION_ACCEPTED -> actor + " accepted escalation for '" + title + "'";
            case ESCALATION_REJECTED -> actor + " rejected escalation for '" + title + "'";
            case ESCALATION_REASSIGNED -> actor + " reassigned escalation for '" + title + "'";
        };
    }
}
