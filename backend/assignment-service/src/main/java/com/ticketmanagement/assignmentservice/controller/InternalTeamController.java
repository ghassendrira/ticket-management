package com.ticketmanagement.assignmentservice.controller;

import com.ticketmanagement.assignmentservice.dto.TeamResponse;
import com.ticketmanagement.assignmentservice.entity.AgentProfile;
import com.ticketmanagement.assignmentservice.entity.Team;
import com.ticketmanagement.assignmentservice.repository.AgentProfileRepository;
import com.ticketmanagement.assignmentservice.repository.TeamAgentMembershipRepository;
import com.ticketmanagement.assignmentservice.service.TeamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Internal endpoints for service-to-service communication.
 * These endpoints are accessed by other microservices (e.g., ticket-service)
 * using the X-Internal-Service-Key header.
 */
@RestController
@RequestMapping("/internal")
@RequiredArgsConstructor
public class InternalTeamController {

    private final TeamService teamService;
    private final AgentProfileRepository agentProfileRepository;
    private final TeamAgentMembershipRepository teamAgentMembershipRepository;

    /**
     * Get teams managed by a given manager ID.
     */
    @GetMapping("/teams/by-manager/{managerId}")
    public ResponseEntity<List<Map<String, Object>>> getTeamsByManager(@PathVariable String managerId) {
        try {
            List<TeamResponse> teams = teamService.getTeamsByManagerId(managerId);
            List<Map<String, Object>> result = teams.stream()
                    .map(t -> Map.<String, Object>of(
                            "id", t.getId().toString(),
                            "name", t.getName(),
                            "managerId", t.getManagerId() != null ? t.getManagerId() : ""
                    ))
                    .collect(Collectors.toList());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.ok(List.of());
        }
    }

    /**
     * Get a team by ID (internal use).
     */
    @GetMapping("/teams/{teamId}")
    public ResponseEntity<Map<String, Object>> getTeamById(@PathVariable UUID teamId) {
        try {
            TeamResponse team = teamService.getTeamByIdInternal(teamId);
            if (team == null) {
                return ResponseEntity.ok(Map.of());
            }
            return ResponseEntity.ok(Map.of(
                    "id", team.getId().toString(),
                    "name", team.getName(),
                    "managerId", team.getManagerId() != null ? team.getManagerId() : ""
            ));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of());
        }
    }

    /**
     * Get agent user IDs belonging to a team.
     */
    @GetMapping("/teams/{teamId}/agent-user-ids")
    public ResponseEntity<List<Map<String, Object>>> getAgentUserIdsByTeam(@PathVariable UUID teamId) {
        try {
            List<AgentProfile> agents = agentProfileRepository.findByTeamId(teamId);
            List<Map<String, Object>> result = agents.stream()
                    .map(a -> Map.<String, Object>of("userId", a.getUserId()))
                    .collect(Collectors.toList());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.ok(List.of());
        }
    }

    /**
     * Get agent profile info by user ID.
     */
    @GetMapping("/agents/by-user/{userId}")
    public ResponseEntity<Map<String, Object>> getAgentProfileByUserId(@PathVariable String userId) {
        try {
            Optional<AgentProfile> profileOpt = agentProfileRepository.findByUserId(userId);
            if (profileOpt.isEmpty()) {
                return ResponseEntity.ok(Map.of());
            }
            AgentProfile agent = profileOpt.get();
            List<Team> teams = teamAgentMembershipRepository.findTeamsByAgentUserId(userId);
            List<String> teamIds = teams.stream()
                    .map(team -> team.getId().toString())
                    .toList();

            Map<String, Object> result = new HashMap<>();
            result.put("userId", agent.getUserId());
            result.put("isOnline", agent.getIsOnline() != null ? agent.getIsOnline() : false);
            result.put("maxConcurrentTickets", agent.getMaxConcurrentTickets() != null ? agent.getMaxConcurrentTickets() : 5);
            if (agent.getTeam() != null) {
                result.put("teamId", agent.getTeam().getId().toString());
            }
            result.put("teamIds", teamIds);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of());
        }
    }

    /**
     * Get the team of an agent by user ID.
     * Returns the team map or an empty map if the agent has no team.
     */
    @GetMapping("/agents/by-user/{userId}/team")
    public ResponseEntity<Map<String, Object>> getAgentTeamByUserId(@PathVariable String userId) {
        try {
            Optional<AgentProfile> profileOpt = agentProfileRepository.findByUserId(userId);
            if (profileOpt.isEmpty()) {
                return ResponseEntity.ok(Map.of());
            }
            AgentProfile profile = profileOpt.get();
            Team primaryTeam = profile.getTeam();
            if (primaryTeam == null) {
                List<Team> teams = teamAgentMembershipRepository.findTeamsByAgentUserId(userId);
                if (!teams.isEmpty()) {
                    primaryTeam = teams.get(0);
                }
            }
            if (primaryTeam == null) {
                return ResponseEntity.ok(Map.of());
            }
            return ResponseEntity.ok(Map.<String, Object>of(
                    "id", primaryTeam.getId().toString(),
                    "name", primaryTeam.getName(),
                    "managerId", primaryTeam.getManagerId() != null ? primaryTeam.getManagerId() : ""
            ));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of());
        }
    }
}