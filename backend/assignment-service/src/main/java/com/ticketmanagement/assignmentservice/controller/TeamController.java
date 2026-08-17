package com.ticketmanagement.assignmentservice.controller;

import com.ticketmanagement.assignmentservice.dto.AgentProfileResponse;
import com.ticketmanagement.assignmentservice.dto.MyTeamResponse;
import com.ticketmanagement.assignmentservice.dto.TeamMemberWorkloadDTO;
import com.ticketmanagement.assignmentservice.dto.TeamRequest;
import com.ticketmanagement.assignmentservice.dto.TeamResponse;
import com.ticketmanagement.assignmentservice.dto.UserSummaryDTO;
import com.ticketmanagement.assignmentservice.exception.ValidationException;
import com.ticketmanagement.assignmentservice.service.TeamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
public class TeamController {

    private final TeamService teamService;

    @PostMapping
    public ResponseEntity<TeamResponse> createTeam(
            @Valid @RequestBody TeamRequest request,
            @RequestHeader("X-User-Id") String currentUserId,
            @RequestHeader("X-User-Role") String currentRole) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(teamService.createTeam(request, currentUserId, currentRole));
    }

    @GetMapping
    public ResponseEntity<List<TeamResponse>> getAllTeams(
            @RequestHeader("X-User-Id") String currentUserId,
            @RequestHeader("X-User-Role") String currentRole) {
        return ResponseEntity.ok(teamService.getAllTeams(currentUserId, currentRole));
    }

    @GetMapping("/my-team")
    public ResponseEntity<MyTeamResponse> getMyTeam(
            @RequestHeader("X-User-Id") String currentUserId,
            @RequestHeader("X-User-Role") String currentRole) {
        return ResponseEntity.ok(teamService.getMyTeam(currentUserId, currentRole));
    }

    @GetMapping("/my-teams")
    public ResponseEntity<List<TeamResponse>> getMyTeams(
            @RequestHeader("X-User-Id") String currentUserId,
            @RequestHeader("X-User-Role") String currentRole) {
        return ResponseEntity.ok(teamService.getTeamsForAgent(currentUserId, currentRole));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TeamResponse> getTeamById(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String currentUserId,
            @RequestHeader("X-User-Role") String currentRole) {
        return ResponseEntity.ok(teamService.getTeamById(id, currentUserId, currentRole));
    }

    @GetMapping("/{teamId}/agents")
    public ResponseEntity<List<AgentProfileResponse>> getTeamAgents(
            @PathVariable UUID teamId,
            @RequestHeader("X-User-Id") String currentUserId,
            @RequestHeader("X-User-Role") String currentRole) {
        return ResponseEntity.ok(teamService.getTeamAgents(teamId, currentUserId, currentRole));
    }

    /** NEW: members + workload for Agent Team page */
    @GetMapping("/{teamId}/members-workload")
    public ResponseEntity<List<TeamMemberWorkloadDTO>> getMembersWorkload(
            @PathVariable UUID teamId,
            @RequestHeader("X-User-Id") String currentUserId,
            @RequestHeader("X-User-Role") String currentRole) {
        return ResponseEntity.ok(
                teamService.getTeamMembersWorkload(teamId, currentUserId, currentRole)
        );
    }

    /** NEW: activity feed (empty list for now) */
    @GetMapping("/{teamId}/activity")
    public ResponseEntity<List<Map<String, Object>>> getTeamActivity(
            @PathVariable UUID teamId,
            @RequestParam(defaultValue = "24") int hours,
            @RequestHeader("X-User-Id") String currentUserId,
            @RequestHeader("X-User-Role") String currentRole) {
        return ResponseEntity.ok(
                teamService.getTeamActivity(teamId, hours, currentUserId, currentRole)
        );
    }

    @PutMapping("/{id}")
    public ResponseEntity<TeamResponse> updateTeam(
            @PathVariable UUID id,
            @Valid @RequestBody TeamRequest request,
            @RequestHeader("X-User-Id") String currentUserId,
            @RequestHeader("X-User-Role") String currentRole) {
        return ResponseEntity.ok(teamService.updateTeam(id, request, currentUserId, currentRole));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTeam(
            @PathVariable UUID id,
            @RequestHeader("X-User-Role") String currentRole) {
        teamService.deleteTeam(id, currentRole);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/manager")
    public ResponseEntity<TeamResponse> reassignManager(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            @RequestHeader("X-User-Id") String currentUserId,
            @RequestHeader("X-User-Role") String currentRole) {
        String newManagerId = body.get("managerId");
        if (newManagerId == null || newManagerId.isBlank()) {
            throw new ValidationException("managerId is required");
        }
        return ResponseEntity.ok(teamService.reassignManager(id, newManagerId, currentUserId, currentRole));
    }

    @PostMapping("/{teamId}/agents/{agentUserId}")
    public ResponseEntity<Void> addAgent(
            @PathVariable UUID teamId,
            @PathVariable String agentUserId,
            @RequestHeader("X-User-Id") String currentUserId,
            @RequestHeader("X-User-Role") String currentRole) {
        teamService.addAgentToTeam(teamId, agentUserId, currentUserId, currentRole);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{teamId}/agents/{agentUserId}")
    public ResponseEntity<Void> removeAgent(
            @PathVariable UUID teamId,
            @PathVariable String agentUserId,
            @RequestHeader("X-User-Id") String currentUserId,
            @RequestHeader("X-User-Role") String currentRole) {
        teamService.removeAgentFromTeam(teamId, agentUserId, currentUserId, currentRole);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/managers/available")
    public ResponseEntity<List<UserSummaryDTO>> getAvailableManagers(
            @RequestHeader("X-User-Role") String currentRole) {
        return ResponseEntity.ok(teamService.getAvailableManagers(currentRole));
    }
}