package com.ticketmanagement.assignmentservice.service;

import com.ticketmanagement.assignmentservice.client.AuthServiceClient;
import com.ticketmanagement.assignmentservice.dto.*;
import com.ticketmanagement.assignmentservice.entity.AgentProfile;
import com.ticketmanagement.assignmentservice.entity.AgentSkill;
import com.ticketmanagement.assignmentservice.entity.Team;
import com.ticketmanagement.assignmentservice.repository.AgentProfileRepository;
import com.ticketmanagement.assignmentservice.repository.TeamAgentMembershipRepository;
import com.ticketmanagement.assignmentservice.repository.TeamRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AssignmentRecommendationService {

    private final TeamRepository teamRepository;
    private final AgentProfileRepository agentProfileRepository;
    private final TeamAgentMembershipRepository teamAgentMembershipRepository;
    private final RestTemplate restTemplate;
    private final AuthServiceClient authServiceClient;

    public AssignmentRecommendationResponse recommend(AssignmentRecommendationRequest request) {
        return recommend(request, null, null);
    }

    public AssignmentRecommendationResponse recommend(AssignmentRecommendationRequest request,
                                                      UUID callerUserId,
                                                      String callerRole) {
        String category = request.getCategory();
        if (category == null || category.isBlank()) {
            throw new com.ticketmanagement.assignmentservice.exception.ValidationException(
                    "No agent available for this category");
        }

        List<Team> allCategoryTeams = teamRepository.findAll().stream()
                .filter(t -> t.getManagedCategories() != null && t.getManagedCategories().stream()
                        .anyMatch(cat -> cat.equalsIgnoreCase(category)))
                .toList();

        if (allCategoryTeams.isEmpty()) {
            throw new com.ticketmanagement.assignmentservice.exception.ValidationException(
                    "No agent available for this category");
        }

        List<Team> candidateTeams;
        boolean isManager = callerRole != null && "MANAGER".equalsIgnoreCase(callerRole);

        if (isManager && callerUserId != null) {
            List<Team> managerTeams = teamRepository.findAllByManagerId(callerUserId.toString());
            if (managerTeams == null || managerTeams.isEmpty()) {
                throw new com.ticketmanagement.assignmentservice.exception.ValidationException(
                        "Cannot recommend agents: you do not belong to any team. Please contact an administrator.");
            }
            Set<UUID> managerTeamIds = managerTeams.stream()
                    .map(Team::getId)
                    .collect(Collectors.toSet());
            candidateTeams = allCategoryTeams.stream()
                    .filter(t -> managerTeamIds.contains(t.getId()))
                    .toList();

            if (candidateTeams.isEmpty()) {
                throw new com.ticketmanagement.assignmentservice.exception.ValidationException(
                        "No agent available for this category");
            }
        } else {
            UUID explicitTeamId = request.getTeamId();
            if (explicitTeamId != null) {
                Optional<Team> explicit = allCategoryTeams.stream()
                        .filter(t -> t.getId().equals(explicitTeamId))
                        .findFirst();
                if (explicit.isEmpty()) {
                    throw new com.ticketmanagement.assignmentservice.exception.ValidationException(
                            "No agent available for this category");
                }
                candidateTeams = List.of(explicit.get());
            } else {
                candidateTeams = allCategoryTeams;
            }
        }

        Set<UUID> candidateTeamIds = candidateTeams.stream()
                .map(Team::getId)
                .collect(Collectors.toSet());

        // Unique agents: legacy team FK + multi-team memberships
        Map<UUID, AgentProfile> uniqueAgents = new LinkedHashMap<>();

        agentProfileRepository.findAllWithTeamAndSkills().stream()
                .filter(a -> a.getTeam() != null && candidateTeamIds.contains(a.getTeam().getId()))
                .forEach(a -> uniqueAgents.put(a.getId(), a));

        for (UUID teamId : candidateTeamIds) {
            for (AgentProfile member : teamAgentMembershipRepository.findAgentsByTeamId(teamId)) {
                uniqueAgents.putIfAbsent(member.getId(), member);
            }
        }

        List<AgentProfile> agents = new ArrayList<>(uniqueAgents.values());

        if (agents.isEmpty()) {
            throw new com.ticketmanagement.assignmentservice.exception.ValidationException(
                    "No agent available for this category");
        }

        List<ScoredAgent> scored = agents.stream()
                .map(a -> scoreAgent(a, category))
                .sorted(Comparator.comparingInt(ScoredAgent::score).reversed())
                .toList();

        ScoredAgent best = scored.get(0);

        // ALL other team agents as alternatives (no limit)
        List<AlternativeAgentResponse> alternatives = scored.stream()
                .skip(1)
                .map(sa -> AlternativeAgentResponse.builder()
                        .agentId(UUID.fromString(sa.agent().getUserId()))
                        .userId(sa.agent().getUserId())
                        .agentName(resolveAgentName(sa.agent().getUserId()))
                        .score(sa.score())
                        .build())
                .collect(Collectors.toList());

        return AssignmentRecommendationResponse.builder()
                .recommendedAgentId(UUID.fromString(best.agent().getUserId()))
                .userId(best.agent().getUserId())
                .agentName(resolveAgentName(best.agent().getUserId()))
                .score(best.score())
                .factors(best.factors())
                .alternatives(alternatives)
                .build();
    }

    private String resolveAgentName(String userId) {
        try {
            UserSummaryDTO user = authServiceClient.getUserById(userId);
            return (user != null && user.getFullName() != null) ? user.getFullName() : "Unknown agent";
        } catch (Exception e) {
            log.warn("Could not resolve agent name for {}: {}", userId, e.getMessage());
            return "Unknown agent";
        }
    }

    private int calculateSkillScore(AgentProfile agent, String category) {
        if (agent.getSkills() == null || agent.getSkills().isEmpty()) return 0;
        Optional<AgentSkill> match = agent.getSkills().stream()
                .filter(s -> s.getSkillName().equalsIgnoreCase(category))
                .findFirst();
        if (match.isPresent()) return match.get().getLevel() * 6;
        return agent.getSkills().stream().mapToInt(AgentSkill::getLevel).max().orElse(0) * 4;
    }

    private ScoredAgent scoreAgent(AgentProfile agent, String category) {
        List<ScoringFactor> factors = new ArrayList<>();

        int skillScore = calculateSkillScore(agent, category);
        factors.add(ScoringFactor.builder().criterion("SKILL_MATCH").weight(30).contribution(skillScore).build());

        int workloadScore = calculateWorkloadScore(agent);
        factors.add(ScoringFactor.builder().criterion("WORKLOAD").weight(25).contribution(workloadScore).build());

        int availScore = (agent.getIsOnline() != null && agent.getIsOnline()) ? 20 : 0;
        factors.add(ScoringFactor.builder().criterion("AVAILABILITY").weight(20).contribution(availScore).build());

        factors.add(ScoringFactor.builder().criterion("PERFORMANCE").weight(15).contribution(15).build());
        factors.add(ScoringFactor.builder().criterion("ROUND_ROBIN").weight(10).contribution(10).build());

        return new ScoredAgent(agent, skillScore + workloadScore + availScore + 15 + 10, factors);
    }

    private int calculateWorkloadScore(AgentProfile agent) {
        try {
            String url = UriComponentsBuilder.fromUriString("http://localhost:8080/api/tickets/count")
                    .queryParam("assignedAgentId", agent.getUserId())
                    .queryParam("status", "IN_PROGRESS")
                    .toUriString();
            Integer count = restTemplate.getForObject(url, Integer.class);
            if (count == null) count = 0;
            if (count == 0) return 25;
            if (count <= 2) return 20;
            if (count <= 4) return 15;
            if (count < agent.getMaxConcurrentTickets()) return 10;
            return 0;
        } catch (Exception e) {
            return 15;
        }
    }

    private record ScoredAgent(AgentProfile agent, int score, List<ScoringFactor> factors) {}
}