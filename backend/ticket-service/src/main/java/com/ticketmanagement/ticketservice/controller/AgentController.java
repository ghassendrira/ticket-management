package com.ticketmanagement.ticketservice.controller;

import com.ticketmanagement.ticketservice.client.AssignmentServiceClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/agents")
@RequiredArgsConstructor
@Slf4j
public class AgentController {

    private final AssignmentServiceClient assignmentServiceClient;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAgents() {
        return ResponseEntity.ok(assignmentServiceClient.getAllAgents());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getAgent(@PathVariable String id) {
        Map<String, Object> agent = assignmentServiceClient.getAgentById(id);
        if (agent.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(agent);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createAgentProfile(
            @RequestBody Map<String, Object> request,
            @RequestHeader("X-Internal-Service-Key") String internalKey
    ) {
        return ResponseEntity.ok(Map.of(
                "id", UUID.randomUUID().toString(),
                "userId", request.get("userId"),
                "teamId", null,
                "isOnline", false,
                "maxConcurrentTickets", request.getOrDefault("maxConcurrentTickets", 5),
                "skills", List.of()
        ));
    }

    @PatchMapping("/{id}/team")
    public ResponseEntity<Map<String, Object>> updateAgentTeam(
            @PathVariable String id,
            @RequestBody Map<String, Object> request
    ) {
        return ResponseEntity.ok(Map.of("id", id, "teamId", request.get("teamId")));
    }

    @PostMapping("/{id}/skills")
    public ResponseEntity<Map<String, Object>> addSkill(
            @PathVariable String id,
            @RequestBody Map<String, Object> request
    ) {
        return ResponseEntity.ok(Map.of("id", id, "skills", List.of(request)));
    }

    @DeleteMapping("/{id}/skills/{skillId}")
    public ResponseEntity<Void> deleteSkill(@PathVariable String id, @PathVariable String skillId) {
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Void> updateAgentStatus(@PathVariable String id, @RequestBody Map<String, Object> request) {
        return ResponseEntity.ok().build();
    }
}
