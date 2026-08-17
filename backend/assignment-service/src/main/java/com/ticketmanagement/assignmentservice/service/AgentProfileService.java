package com.ticketmanagement.assignmentservice.service;

import com.ticketmanagement.assignmentservice.dto.*;
import com.ticketmanagement.assignmentservice.entity.AgentProfile;
import com.ticketmanagement.assignmentservice.entity.AgentSkill;
import com.ticketmanagement.assignmentservice.entity.Team;
import com.ticketmanagement.assignmentservice.exception.ConflictException;
import com.ticketmanagement.assignmentservice.exception.NotFoundException;
import com.ticketmanagement.assignmentservice.exception.ValidationException;
import com.ticketmanagement.assignmentservice.repository.AgentProfileRepository;
import com.ticketmanagement.assignmentservice.repository.AgentSkillRepository;
import com.ticketmanagement.assignmentservice.repository.TeamRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class AgentProfileService {

    private final AgentProfileRepository agentProfileRepository;
    private final TeamRepository teamRepository;
    private final AgentSkillRepository agentSkillRepository;

    public AgentProfileService(AgentProfileRepository agentProfileRepository,
                               TeamRepository teamRepository,
                               AgentSkillRepository agentSkillRepository) {
        this.agentProfileRepository = agentProfileRepository;
        this.teamRepository = teamRepository;
        this.agentSkillRepository = agentSkillRepository;
    }

    @Transactional(readOnly = true)
    public List<AgentProfileResponse> getAllAgents() {
        return agentProfileRepository.findAllWithTeamAndSkills().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AgentProfileResponse getAgentById(UUID id) {
        return toResponse(agentProfileRepository.findByIdWithTeamAndSkills(id)
                .orElseThrow(() -> new NotFoundException("Agent not found: " + id)));
    }

    public AgentProfileResponse createAgent(AssignAgentRequest request) {
        String userId = request.getUserId().trim();
        if (userId.isBlank()) {
            throw new ValidationException("userId is required");
        }
        if (agentProfileRepository.existsByUserId(userId)) {
            throw new ConflictException("Agent profile already exists for userId: " + userId);
        }
        int maxTickets = request.getMaxConcurrentTickets() == null ? 5 : request.getMaxConcurrentTickets();
        validateMaxConcurrentTickets(maxTickets);
        AgentProfile agent = AgentProfile.builder()
                .userId(userId)
                .maxConcurrentTickets(maxTickets)
                .isOnline(false)
                .build();
        agent = agentProfileRepository.save(agent);
        return toResponse(agent);
    }

    public AgentProfileResponse updateAgentTeam(UUID agentId, UpdateAgentTeamRequest request) {
        AgentProfile agent = agentProfileRepository.findById(agentId)
                .orElseThrow(() -> new NotFoundException("Agent not found: " + agentId));
        if (request.getTeamId() == null) {
            agent.setTeam(null);
        } else {
            Team team = teamRepository.findById(request.getTeamId())
                    .orElseThrow(() -> new NotFoundException("Team not found: " + request.getTeamId()));
            agent.setTeam(team);
        }
        agent = agentProfileRepository.save(agent);
        return getAgentById(agent.getId());
    }

    public AgentProfileResponse updateAgentStatus(String userId, boolean isOnline) {
    AgentProfile agent = agentProfileRepository.findByUserId(userId)
        .orElseThrow(() -> new RuntimeException("Agent profile not found for user: " + userId));
    
    agent.setIsOnline(isOnline);
    AgentProfile saved = agentProfileRepository.save(agent);
    return mapToResponse(saved);
}

public AgentProfileResponse addSkill(UUID agentId, AgentSkillRequest request) {
    AgentProfile agent = agentProfileRepository.findById(agentId)
            .orElseThrow(() -> new NotFoundException("Agent not found: " + agentId));
    
    Optional<AgentSkill> existing = agent.getSkills().stream()
            .filter(s -> s.getSkillName().equalsIgnoreCase(request.getSkillName()))
            .findFirst();
    
    if (existing.isPresent()) {
        existing.get().setLevel(request.getLevel());
    } else {
        AgentSkill skill = AgentSkill.builder()
                .agentProfile(agent)
                .skillName(request.getSkillName().toUpperCase())
                .level(request.getLevel())
                .build();
        agent.getSkills().add(skill);
    }
    
    agentProfileRepository.save(agent);
    return getAgentById(agent.getId());
}


    private AgentProfileResponse mapToResponse(AgentProfile agent) {
    return AgentProfileResponse.builder()
        .id(agent.getId())
        .userId(agent.getUserId())
        .teamId(agent.getTeam() != null ? agent.getTeam().getId() : null)
        .teamName(agent.getTeam() != null ? agent.getTeam().getName() : null)
        .isOnline(agent.getIsOnline() != null ? agent.getIsOnline() : false)
        .maxConcurrentTickets(agent.getMaxConcurrentTickets() != null ? agent.getMaxConcurrentTickets() : 5)
        .skills(agent.getSkills() != null ? agent.getSkills().stream()
            .map(s -> AgentSkillResponse.builder()
                .id(s.getId())
                .skillName(s.getSkillName())
                .level(s.getLevel())
                .build())
            .toList() : List.of())
        .build();
}

    public void deleteSkill(UUID agentId, UUID skillId) {
        AgentProfile agent = agentProfileRepository.findById(agentId)
                .orElseThrow(() -> new NotFoundException("Agent not found: " + agentId));
        AgentSkill skill = agentSkillRepository.findById(skillId)
                .orElseThrow(() -> new NotFoundException("Skill not found: " + skillId));
        if (!skill.getAgentProfile().getId().equals(agent.getId())) {
            throw new NotFoundException("Skill not found for this agent");
        }
        agent.getSkills().remove(skill);
        skill.setAgentProfile(null);
        agentSkillRepository.delete(skill);
    }

    public boolean isCurrentUser(UUID agentProfileId, String currentUserId) {
        if (currentUserId == null) return false;
        return agentProfileRepository.findById(agentProfileId)
                .map(ap -> ap.getUserId().equalsIgnoreCase(currentUserId))
                .orElse(false);
    }

    private void validateMaxConcurrentTickets(int value) {
        if (value < 1 || value > 20) {
            throw new ValidationException("maxConcurrentTickets must be between 1 and 20");
        }
    }

    private AgentProfileResponse toResponse(AgentProfile a) {
        return AgentProfileResponse.builder()
                .id(a.getId())
                .userId(a.getUserId())
                .teamId(a.getTeam() == null ? null : a.getTeam().getId())
                .teamName(a.getTeam() == null ? null : a.getTeam().getName())
                .isOnline(a.getIsOnline())
                .maxConcurrentTickets(a.getMaxConcurrentTickets())
                .skills(a.getSkills().stream()
                        .map(s -> AgentSkillResponse.builder()
                                .id(s.getId())
                                .skillName(s.getSkillName())
                                .level(s.getLevel())
                                .build())
                        .collect(Collectors.toList()))
                .build();
    }
}
