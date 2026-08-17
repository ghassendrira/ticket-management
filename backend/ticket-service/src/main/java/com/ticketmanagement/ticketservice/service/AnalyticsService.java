package com.ticketmanagement.ticketservice.service;

import com.ticketmanagement.ticketservice.client.AssignmentServiceClient;
import com.ticketmanagement.ticketservice.dto.CategoryStatsDTO;
import com.ticketmanagement.ticketservice.dto.DailyTicketStatsDTO;
import com.ticketmanagement.ticketservice.entity.Category;
import com.ticketmanagement.ticketservice.entity.Role;
import com.ticketmanagement.ticketservice.entity.Ticket;
import com.ticketmanagement.ticketservice.entity.TicketStatus;
import com.ticketmanagement.ticketservice.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnalyticsService {

    private static final Set<TicketStatus> TERMINAL_STATUSES = Set.of(TicketStatus.RESOLVED, TicketStatus.CLOSED);
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;

    private final TicketRepository ticketRepository;
    private final AssignmentServiceClient assignmentServiceClient;

    public List<DailyTicketStatsDTO> getCreatedVsResolved(int days, Role role, String userId) {
        if (days <= 0) days = 7;
        if (days > 365) days = 365;

        List<Ticket> scoped = findScopedTickets(role, userId);

        LocalDate today = LocalDate.now();
        LocalDate startDate = today.minusDays(days - 1);

        return IntStream.range(0, days)
                .mapToObj(startDate::plusDays)
                .map(day -> {
                    LocalDateTime from = day.atStartOfDay();
                    LocalDateTime to = day.plusDays(1).atStartOfDay();

                    long created = scoped.stream()
                            .filter(t -> t.getCreatedAt() != null
                                    && !t.getCreatedAt().isBefore(from)
                                    && t.getCreatedAt().isBefore(to))
                            .count();

                    long resolved = scoped.stream()
                            .filter(t -> t.getStatus() != null
                                    && TERMINAL_STATUSES.contains(t.getStatus())
                                    && t.getUpdatedAt() != null
                                    && !t.getUpdatedAt().isBefore(from)
                                    && t.getUpdatedAt().isBefore(to))
                            .count();

                    return new DailyTicketStatsDTO(day.format(DATE_FORMATTER), created, resolved);
                })
                .collect(Collectors.toList());
    }

    public List<CategoryStatsDTO> getTicketsByCategory(Role role, String userId) {
        List<Ticket> scoped = findScopedTickets(role, userId);

        Map<Category, Long> counts = Arrays.stream(Category.values())
                .collect(Collectors.toMap(c -> c, c -> 0L, (a, b) -> a, LinkedHashMap::new));

        for (Ticket t : scoped) {
            if (t.getCategory() != null) {
                counts.put(t.getCategory(), counts.getOrDefault(t.getCategory(), 0L) + 1);
            }
        }

        long total = counts.values().stream().mapToLong(Long::longValue).sum();

        return counts.entrySet().stream()
                .map(e -> {
                    long c = e.getValue();
                    int pct = total == 0 ? 0 : (int) Math.round((c * 100.0) / total);
                    return new CategoryStatsDTO(e.getKey().name(), c, pct);
                })
                .sorted(Comparator.comparingLong((CategoryStatsDTO s) -> s.getCount()).reversed()
                        .thenComparing(CategoryStatsDTO::getCategory))
                .collect(Collectors.toList());
    }

    /**
     * Resolve tickets visible for the caller role.
     * MANAGER = all tickets from ALL his teams (+ tickets assigned to agents of those teams)
     */
    private List<Ticket> findScopedTickets(Role role, String userId) {
        if (role == Role.AGENT) {
            try {
                UUID agentId = UUID.fromString(userId);
                return ticketRepository.findByAssignedAgentIdOrderByCreatedAtDesc(agentId);
            } catch (Exception e) {
                log.warn("Invalid agent id for analytics: {}", userId);
                return List.of();
            }
        }

        if (role == Role.MANAGER) {
            List<UUID> teamIds = resolveManagerTeamIds(userId);
            if (teamIds.isEmpty()) {
                return List.of();
            }

            Set<UUID> agentIds = new HashSet<>();
            for (UUID teamId : teamIds) {
                List<Map<String, Object>> agents = assignmentServiceClient.getAgentsInTeam(teamId);
                if (agents != null) {
                    for (Map<String, Object> a : agents) {
                        Object uid = a.get("userId");
                        if (uid != null) {
                            try {
                                agentIds.add(UUID.fromString(uid.toString()));
                            } catch (Exception ignored) {
                            }
                        }
                    }
                }
            }

            List<Ticket> all = ticketRepository.findAll();
            Map<UUID, Ticket> unique = new LinkedHashMap<>();

            for (Ticket t : all) {
                boolean inTeam = t.getTeamId() != null && teamIds.contains(t.getTeamId());
                boolean assignedToTeamAgent = t.getAssignedAgentId() != null && agentIds.contains(t.getAssignedAgentId());
                if (inTeam || assignedToTeamAgent) {
                    unique.put(t.getId(), t);
                }
            }
            return new ArrayList<>(unique.values());
        }

        // ADMIN (or other) → global
        return ticketRepository.findAllByOrderByCreatedAtDesc();
    }

    private List<UUID> resolveManagerTeamIds(String userId) {
        List<UUID> result = new ArrayList<>();
        try {
            List<Map<String, Object>> teams = assignmentServiceClient.getAllTeamsByManagerId(userId);
            if (teams != null) {
                for (Map<String, Object> team : teams) {
                    Object id = team.get("id");
                    if (id != null) {
                        result.add(UUID.fromString(id.toString()));
                    }
                }
            }
        } catch (Exception e) {
            log.warn("getAllTeamsByManagerId failed for {}: {}", userId, e.getMessage());
        }

        // fallback: single team method
        if (result.isEmpty()) {
            try {
                Map<String, Object> team = assignmentServiceClient.getTeamByManagerId(userId);
                if (team != null && team.get("id") != null) {
                    result.add(UUID.fromString(team.get("id").toString()));
                }
            } catch (Exception e) {
                log.warn("getTeamByManagerId failed for {}: {}", userId, e.getMessage());
            }
        }
        return result;
    }
}