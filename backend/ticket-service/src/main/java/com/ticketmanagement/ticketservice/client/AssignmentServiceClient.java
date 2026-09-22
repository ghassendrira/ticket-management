package com.ticketmanagement.ticketservice.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.Set;
import java.util.HashSet;
import java.net.http.HttpClient;
import java.time.Duration;
/**
 * Client for communicating with the assignment-service via its internal API.
 * Used by ticket-service to look up team manager, team membership, and agent lists.
 */
@Component
@Slf4j
public class AssignmentServiceClient {
    private final RestClient restClient;
    private final String internalServiceSecret;

    public AssignmentServiceClient(
            @Value("${assignment.service.url}") String assignmentServiceUrl,
            @Value("${internal.service-secret}") String internalServiceSecret
    ) {
        this.internalServiceSecret = internalServiceSecret;
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(
            HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build());
        requestFactory.setReadTimeout(Duration.ofSeconds(3));
        this.restClient = RestClient.builder()
                .baseUrl(assignmentServiceUrl)
                .defaultHeader("X-Internal-Service-Key", internalServiceSecret)
            .requestFactory(requestFactory)
                .build();
    }

    /**
     * Get the team managed by the given manager ID (first one, if the manager has several).
     * Calls GET /internal/teams/by-manager/{managerId} and returns the first team.
     *
     * @param managerId the manager's user ID
     * @return a map with team fields (id, name, managerId) or null if no team found
     */
    public Map<String, Object> getTeamByManagerId(String managerId) {
        List<Map<String, Object>> all = getAllTeamsByManagerId(managerId);
        if (all.isEmpty()) return null;
        return all.get(0);
    }

    /**
     * Get ALL teams managed by the given manager ID.
     * Calls GET /internal/teams/by-manager/{managerId} and returns the full list.
     *
     * @param managerId the manager's user ID
     * @return list of team maps (id, name, managerId), never null
     */
    public List<Map<String, Object>> getAllTeamsByManagerId(String managerId) {
        try {
            List<Map<String, Object>> teams = restClient.get()
                    .uri("/internal/teams/by-manager/{managerId}", managerId)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
            return teams != null ? teams : List.of();
        } catch (Exception e) {
            log.error("Failed to get teams for manager {}: {}", managerId, e.getMessage(), e);
            return List.of();
        }
    }

    /**
     * Get the team that a given agent (userId) belongs to.
     * Calls GET /internal/agents/by-user/{userId}/team.
     *
     * @param userId the agent's user ID as a string
     * @return a map with team fields (id, name, managerId) or null if no team
     */
    public Map<String, Object> getAgentTeamByUserId(String userId) {
        try {
            Map<String, Object> team = restClient.get()
                    .uri("/internal/agents/by-user/{userId}/team", userId)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});

            if (team == null || team.isEmpty()) return null;
            Object id = team.get("id");
            if (id == null || id.toString().isBlank()) return null;
            return team;
        } catch (Exception e) {
            log.error("Failed to get agent team for user {}: {}", userId, e.getMessage(), e);
            return null;
        }
    }

    public Map<String, Object> getAgentProfileByUserId(String userId) {
        try {
            Map<String, Object> profile = restClient.get()
                    .uri("/internal/agents/by-user/{userId}", userId)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
            return profile != null ? profile : Map.of();
        } catch (Exception e) {
            log.error("Failed to get agent profile for {}: {}", userId, e.getMessage(), e);
            return Map.of();
        }
    }

    public Set<UUID> getAgentTeamIdsByUserId(String userId) {
        Map<String, Object> profile = getAgentProfileByUserId(userId);
        if (profile == null || profile.isEmpty()) {
            return Set.of();
        }

        Set<UUID> teamIds = new HashSet<>();
        if (profile.get("teamId") instanceof String teamIdStr) {
            try {
                teamIds.add(UUID.fromString(teamIdStr));
            } catch (IllegalArgumentException ignored) {
            }
        }

        Object rawTeamIds = profile.get("teamIds");
        if (rawTeamIds instanceof List<?> rawList) {
            for (Object item : rawList) {
                if (item instanceof String idStr) {
                    try {
                        teamIds.add(UUID.fromString(idStr));
                    } catch (IllegalArgumentException ignored) {
                    }
                }
            }
        }

        return teamIds;
    }

    /**
     * Check if an agent belongs to a specific team.
     * Calls GET /internal/teams/{teamId}/agent-user-ids and checks membership.
     *
     * @param agentId the agent's user ID as a string
     * @param teamId  the team's UUID
     * @return true if the agent is in the team, false otherwise
     */
    public boolean isAgentInTeam(String agentId, UUID teamId) {
        try {
            List<Map<String, Object>> agents = restClient.get()
                    .uri("/internal/teams/{teamId}/agent-user-ids", teamId)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});

            if (agents == null) return false;

            return agents.stream()
                    .anyMatch(a -> {
                        Object userId = a.get("userId");
                        return userId != null && agentId.equals(userId.toString());
                    });
        } catch (Exception e) {
            log.error("Failed to check agent team membership for agent {} in team {}: {}",
                    agentId, teamId, e.getMessage(), e);
            return false;
        }
    }

    /**
     * Get the manager ID for a given team.
     * Calls GET /internal/teams/{teamId} and extracts the managerId field.
     *
     * @param teamId the team's UUID
     * @return the manager's user ID as a string, or null if not set
     */
    public String getManagerIdByTeamId(UUID teamId) {
        try {
            Map<String, Object> team = restClient.get()
                    .uri("/internal/teams/{teamId}", teamId)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});

            if (team != null) {
                Object managerId = team.get("managerId");
                if (managerId != null && !managerId.toString().isEmpty() && !managerId.toString().isBlank()) {
                    return managerId.toString();
                }
            }
            return null;
        } catch (Exception e) {
            log.error("Failed to get manager ID by team ID {}: {}", teamId, e.getMessage(), e);
            return null;
        }
    }

    /**
     * Get all agent user IDs belonging to a specific team.
     * Calls GET /internal/teams/{teamId}/agent-user-ids.
     *
     * @param teamId the team's UUID
     * @return a list of maps containing user/agent details, or empty list if failed/none
     */
    public List<Map<String, Object>> getAgentsInTeam(UUID teamId) {
        try {
            List<Map<String, Object>> agents = restClient.get()
                    .uri("/internal/teams/{teamId}/agent-user-ids", teamId)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
            return agents != null ? agents : List.of();
        } catch (Exception e) {
            log.error("Failed to get agents for team {}: {}", teamId, e.getMessage(), e);
            return List.of();
        }
    }

    public List<Map<String, Object>> getAllAgents() {
        try {
            List<Map<String, Object>> agents = restClient.get()
                    .uri("/api/agents")
                    .header("X-Internal-Service-Key", internalServiceSecret)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
            return agents != null ? agents : List.of();
        } catch (Exception e) {
            log.error("Failed to get all agents: {}", e.getMessage(), e);
            return List.of();
        }
    }

    public Map<String, Object> getAgentById(String id) {
        try {
            Map<String, Object> agent = restClient.get()
                    .uri("/api/agents/{id}", id)
                    .header("X-Internal-Service-Key", internalServiceSecret)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
            return agent != null ? agent : Map.of();
        } catch (Exception e) {
            log.error("Failed to get agent {}: {}", id, e.getMessage(), e);
            return Map.of();
        }
    }

    public List<Map<String, Object>> getAllTeams(String userId, String userRole) {
        try {
            List<Map<String, Object>> teams = restClient.get()
                    .uri("/api/teams")
                    .header("X-User-Id", userId)
                    .header("X-User-Role", userRole)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
            return teams != null ? teams : List.of();
        } catch (Exception e) {
            log.error("Failed to get all teams: {}", e.getMessage(), e);
            return List.of();
        }
    }

    public List<Map<String, Object>> getMyTeams(String userId, String userRole) {
        try {
            List<Map<String, Object>> teams = restClient.get()
                    .uri("/api/teams/my-teams")
                    .header("X-User-Id", userId)
                    .header("X-User-Role", userRole)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
            return teams != null ? teams : List.of();
        } catch (Exception e) {
            log.error("Failed to get my teams: {}", e.getMessage(), e);
            return List.of();
        }
    }

    public List<Map<String, Object>> getAvailableManagers(String userRole) {
        try {
            List<Map<String, Object>> managers = restClient.get()
                    .uri("/api/teams/managers/available")
                    .header("X-User-Role", userRole)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
            return managers != null ? managers : List.of();
        } catch (Exception e) {
            log.error("Failed to get available managers: {}", e.getMessage(), e);
            return List.of();
        }
    }

    public Map<String, Object> createTeam(Map<String, Object> teamRequest, String userId, String userRole) {
        try {
            Map<String, Object> team = restClient.post()
                    .uri("/api/teams")
                    .header("X-User-Id", userId)
                    .header("X-User-Role", userRole)
                    .body(teamRequest)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
            return team != null ? team : Map.of();
        } catch (Exception e) {
            log.error("Failed to create team: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create team: " + e.getMessage(), e);
        }
    }

    public List<Map<String, Object>> getTeamAgents(String teamId, String userId, String userRole) {
        try {
            List<Map<String, Object>> agents = restClient.get()
                    .uri("/api/teams/{teamId}/agents", teamId)
                    .header("X-User-Id", userId)
                    .header("X-User-Role", userRole)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
            return agents != null ? agents : List.of();
        } catch (Exception e) {
            log.error("Failed to get team agents: {}", e.getMessage(), e);
            return List.of();
        }
    }

    public void addAgentToTeam(String teamId, String agentUserId, String userId, String userRole) {
        try {
            restClient.post()
                    .uri("/api/teams/{teamId}/agents/{agentUserId}", teamId, agentUserId)
                    .header("X-User-Id", userId)
                    .header("X-User-Role", userRole)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.error("Failed to add agent to team: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to add agent to team: " + e.getMessage(), e);
        }
    }

    public void removeAgentFromTeam(String teamId, String agentUserId, String userId, String userRole) {
        try {
            restClient.delete()
                    .uri("/api/teams/{teamId}/agents/{agentUserId}", teamId, agentUserId)
                    .header("X-User-Id", userId)
                    .header("X-User-Role", userRole)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.error("Failed to remove agent from team: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to remove agent from team: " + e.getMessage(), e);
        }
    }
}