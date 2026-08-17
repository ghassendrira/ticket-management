package com.ticketmanagement.ticketservice.controller;

import com.ticketmanagement.ticketservice.client.AssignmentServiceClient;
import com.ticketmanagement.ticketservice.client.AuthServiceClient;
import com.ticketmanagement.ticketservice.dto.TeamActivityResponse;
import com.ticketmanagement.ticketservice.dto.TeamMemberWorkloadResponse;
import com.ticketmanagement.ticketservice.dto.UserSummaryDTO;
import com.ticketmanagement.ticketservice.entity.Role;
import com.ticketmanagement.ticketservice.entity.Ticket;
import com.ticketmanagement.ticketservice.entity.TicketHistory;
import com.ticketmanagement.ticketservice.entity.TicketHistoryEventType;
import com.ticketmanagement.ticketservice.entity.TicketStatus;
import com.ticketmanagement.ticketservice.exception.UnauthorizedTicketActionException;
import com.ticketmanagement.ticketservice.repository.TicketHistoryRepository;
import com.ticketmanagement.ticketservice.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
@Slf4j
public class TeamStatsController {

    private static final Set<Role> ALLOWED_ROLES = Set.of(Role.ADMIN, Role.MANAGER, Role.AGENT);
    private static final Set<TicketStatus> ACTIVE_STATUSES = Set.of(
            TicketStatus.NEW, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS,
            TicketStatus.PENDING, TicketStatus.REOPENED
    );

    private final AssignmentServiceClient assignmentServiceClient;
    private final AuthServiceClient authServiceClient;
    private final TicketRepository ticketRepository;
    private final TicketHistoryRepository ticketHistoryRepository;

    @GetMapping("/{teamId}/members-workload")
    public ResponseEntity<List<TeamMemberWorkloadResponse>> getMembersWorkload(
            @PathVariable UUID teamId,
            @RequestHeader("X-User-Id") String userIdHeader,
            @RequestHeader("X-User-Role") String roleHeader) {

        Role role = Role.valueOf(roleHeader);
        if (!ALLOWED_ROLES.contains(role)) {
            throw new UnauthorizedTicketActionException("Not authorized to access team data");
        }
        validateTeamAccess(teamId, userIdHeader, role);

        List<Map<String, Object>> agentMaps = assignmentServiceClient.getAgentsInTeam(teamId);
        String managerId = assignmentServiceClient.getManagerIdByTeamId(teamId);
        List<TeamMemberWorkloadResponse> result = new ArrayList<>();
        Map<String, Long> activeTicketCounts = getActiveTicketCountsForTeam(teamId);

        if (managerId != null && !managerId.isBlank()) {
            UserSummaryDTO manager = getUserByIdString(managerId);
                long managerTickets = agentMaps.stream()
                    .map(a -> {
                    Object v = a.get("userId");
                    return v == null ? null : v.toString();
                    })
                    .filter(Objects::nonNull)
                    .filter(managerId::equals)
                    .mapToLong(id -> activeTicketCounts.getOrDefault(id, 0L))
                    .sum();
            if (managerTickets == 0) {
                managerTickets = getAgentActiveTickets(UUID.fromString(managerId));
            }
            if (manager != null) {
                result.add(TeamMemberWorkloadResponse.builder()
                    .userId(manager.getId() != null ? manager.getId().toString() : null)
                        .fullName(manager.getFullName())
                        .role(manager.getRole() != null ? manager.getRole() : "MANAGER")
                        .activeTicketsCount((int) managerTickets)
                        .isOnline(null)
                        .maxConcurrentTickets(null)
                        .build());
            }
        }

        for (Map<String, Object> agentMap : agentMaps) {
            String agentUserId = (String) agentMap.get("userId");
            if (agentUserId == null || agentUserId.isBlank()) continue;

            UserSummaryDTO user;
            try {
                user = getUserByIdString(agentUserId);
            } catch (Exception e) {
                log.warn("Could not fetch user {}: {}", agentUserId, e.getMessage());
                continue;
            }
            if (user == null) continue;

            Map<String, Object> agentProfile = assignmentServiceClient.getAgentProfileByUserId(agentUserId);
            Boolean isOnline = agentProfile.get("isOnline") instanceof Boolean bo ? bo : null;
            Integer maxTickets = agentProfile.get("maxConcurrentTickets") instanceof Number num
                    ? num.intValue() : null;

            long count;
            try {
                UUID agentUuid = UUID.fromString(agentUserId);
                count = activeTicketCounts.getOrDefault(agentUserId,
                        ticketRepository.countByAssignedAgentIdAndStatusIn(agentUuid, ACTIVE_STATUSES));
            } catch (Exception e) {
                count = 0;
            }

            result.add(TeamMemberWorkloadResponse.builder()
                    .userId(agentUserId)
                    .fullName(user.getFullName())
                    .role(user.getRole() != null ? user.getRole() : "AGENT")
                    .activeTicketsCount((int) count)
                    .isOnline(isOnline)
                    .maxConcurrentTickets(maxTickets)
                    .build());
        }

        result.sort((a, b) -> Integer.compare(b.getActiveTicketsCount(), a.getActiveTicketsCount()));
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{teamId}/activity")
    public ResponseEntity<List<TeamActivityResponse>> getTeamActivity(
            @PathVariable UUID teamId,
            @RequestParam(value = "hours", defaultValue = "24") int hours,
            @RequestHeader("X-User-Id") String userIdHeader,
            @RequestHeader("X-User-Role") String roleHeader) {

        Role role = Role.valueOf(roleHeader);
        if (!ALLOWED_ROLES.contains(role)) {
            throw new UnauthorizedTicketActionException("Not authorized to access team data");
        }
        validateTeamAccess(teamId, userIdHeader, role);

        LocalDateTime since = LocalDateTime.now().minusHours(Math.max(1, hours));
        List<TicketHistory> history = ticketHistoryRepository.findTeamActivitySince(teamId, since);

        if (history.isEmpty()) {
            history = ticketHistoryRepository.findRecentTeamActivity(teamId);
        }

        List<TeamActivityResponse> result = history.stream()
                .limit(50)
                .map(h -> {
                    Ticket ticket = h.getTicket();
                    String eventType = formatEventType(h.getEventType());
                    String message = formatEventMessage(h, ticket);
                    return TeamActivityResponse.builder()
                            .id(h.getId())
                            .eventType(eventType)
                            .message(message)
                            .ticketId(ticket != null ? ticket.getId() : null)
                            .ticketTitle(ticket != null ? ticket.getTitle() : null)
                            .actorName(h.getActorName() != null ? h.getActorName() : "System")
                            .timestamp(h.getChangedAt() != null ? h.getChangedAt() : LocalDateTime.now())
                            .build();
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    private Map<String, Long> getActiveTicketCountsForTeam(UUID teamId) {
        Map<String, Long> counts = new HashMap<>();
        try {
            List<Ticket> teamTickets = ticketRepository.findByTeamIdOrderByCreatedAtDesc(teamId);
            for (Ticket ticket : teamTickets) {
                if (!ACTIVE_STATUSES.contains(ticket.getStatus())) continue;
                UUID agentId = ticket.getAssignedAgentId();
                if (agentId == null) continue;
                String key = agentId.toString();
                counts.put(key, counts.getOrDefault(key, 0L) + 1);
            }
        } catch (Exception e) {
            log.warn("Failed to compute active ticket counts for team {}: {}", teamId, e.getMessage());
        }
        return counts;
    }

    private long getAgentActiveTickets(UUID agentId) {
        try {
            return ticketRepository.countByAssignedAgentIdAndStatusIn(agentId, ACTIVE_STATUSES);
        } catch (Exception e) {
            return 0;
        }
    }

    private UserSummaryDTO getUserByIdString(String userId) {
        try {
            UUID uuid = UUID.fromString(userId);
            return authServiceClient.getUserById(uuid);
        } catch (Exception e) {
            log.warn("Could not parse user id {}: {}", userId, e.getMessage());
            return null;
        }
    }

    private void validateTeamAccess(UUID teamId, String userIdHeader, Role role) {
        if (role == Role.ADMIN) return;

        if (role == Role.MANAGER) {
            String managerId = assignmentServiceClient.getManagerIdByTeamId(teamId);
            if (managerId == null || !managerId.equals(userIdHeader)) {
                throw new UnauthorizedTicketActionException("You do not manage this team");
            }
            return;
        }

        if (role == Role.AGENT) {
            if (!assignmentServiceClient.isAgentInTeam(userIdHeader, teamId)) {
                throw new UnauthorizedTicketActionException("You are not a member of this team");
            }
        }
    }

    private String formatEventType(TicketHistoryEventType type) {
        if (type == null) return "STATUS_CHANGED";
        return type.name();
    }

    private String formatEventMessage(TicketHistory h, Ticket ticket) {
        TicketHistoryEventType type = h.getEventType();
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
