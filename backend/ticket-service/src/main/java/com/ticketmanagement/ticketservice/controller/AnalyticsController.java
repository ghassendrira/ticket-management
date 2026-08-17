package com.ticketmanagement.ticketservice.controller;

import com.ticketmanagement.ticketservice.dto.CategoryStatsDTO;
import com.ticketmanagement.ticketservice.dto.DailyTicketStatsDTO;
import com.ticketmanagement.ticketservice.entity.Role;
import com.ticketmanagement.ticketservice.exception.UnauthorizedTicketActionException;
import com.ticketmanagement.ticketservice.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

/**
 * Public analytics endpoints for the dashboard.
 * Protected by gateway-auth headers and role-based filtering.
 */
@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private static final Set<Role> ALLOWED_ROLES = Set.of(Role.ADMIN, Role.MANAGER, Role.AGENT);

    private final AnalyticsService analyticsService;

    @GetMapping("/tickets-created-vs-resolved")
    public ResponseEntity<List<DailyTicketStatsDTO>> getTicketsCreatedVsResolved(
            @RequestParam(value = "period", defaultValue = "7") int period,
            @RequestHeader("X-User-Id") String userIdHeader,
            @RequestHeader("X-User-Role") String roleHeader) {

        Role role = Role.valueOf(roleHeader);
        if (!ALLOWED_ROLES.contains(role)) {
            throw new UnauthorizedTicketActionException("Not authorized to access analytics");
        }

        List<DailyTicketStatsDTO> stats = analyticsService.getCreatedVsResolved(period, role, userIdHeader);
        return ResponseEntity.ok(stats);
    }

    /**
     * Count tickets grouped by category, scoped to role.
     *  - ADMIN: global counts
     *  - MANAGER: team-scoped
     *  - AGENT: assigned-agent scoped (optional; UI may hide the card for this role)
     */
    @GetMapping("/tickets-by-category")
    public ResponseEntity<List<CategoryStatsDTO>> getTicketsByCategory(
            @RequestHeader("X-User-Id") String userIdHeader,
            @RequestHeader("X-User-Role") String roleHeader) {

        Role role = Role.valueOf(roleHeader);
        if (!ALLOWED_ROLES.contains(role)) {
            throw new UnauthorizedTicketActionException("Not authorized to access analytics");
        }

        return ResponseEntity.ok(analyticsService.getTicketsByCategory(role, userIdHeader));
    }
}
