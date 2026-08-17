package com.ticketmanagement.assignmentservice.controller;

import com.ticketmanagement.assignmentservice.dto.*;
import com.ticketmanagement.assignmentservice.exception.ValidationException;
import com.ticketmanagement.assignmentservice.service.AgentProfileService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/agents")
public class AgentController {

    private final AgentProfileService agentProfileService;

    public AgentController(AgentProfileService agentProfileService) {
        this.agentProfileService = agentProfileService;
    }

    @GetMapping
    public ResponseEntity<List<AgentProfileResponse>> getAllAgents() {
        return ResponseEntity.ok(agentProfileService.getAllAgents());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AgentProfileResponse> getAgentById(@PathVariable UUID id) {
        return ResponseEntity.ok(agentProfileService.getAgentById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<AgentProfileResponse> createAgent(@Valid @RequestBody AssignAgentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(agentProfileService.createAgent(request));
    }

    @PatchMapping("/{id}/team")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<AgentProfileResponse> updateTeam(@PathVariable UUID id,
                                                           @RequestBody UpdateAgentTeamRequest request,
                                                           @RequestHeader("X-User-Role") String currentRole) {
        if (!"ADMIN".equalsIgnoreCase(currentRole)) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Use team endpoints to manage agents. Direct team reassignment is ADMIN only."
            );
        }
        if (request == null) {
            throw new ValidationException("Request body is required");
        }
        return ResponseEntity.ok(agentProfileService.updateAgentTeam(id, request));
    }

   @PutMapping("/{userId}/status")
public ResponseEntity<AgentProfileResponse> updateStatus(
        @PathVariable String userId,  // ← String, pas UUID
        @RequestBody UpdateAgentStatusRequest request) {
    return ResponseEntity.ok(agentProfileService.updateAgentStatus(userId, request.getIsOnline()));
}

    @PostMapping("/{id}/skills")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<AgentProfileResponse> addSkill(@PathVariable UUID id,
                                                                 @Valid @RequestBody AgentSkillRequest request) {
        return ResponseEntity.ok(agentProfileService.addSkill(id, request));
    }

    @DeleteMapping("/{id}/skills/{skillId}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<Void> deleteSkill(@PathVariable UUID id,
                                            @PathVariable UUID skillId) {
        agentProfileService.deleteSkill(id, skillId);
        return ResponseEntity.noContent().build();
    }
}
