package com.ticketmanagement.assignmentservice.service;

import com.ticketmanagement.assignmentservice.client.AuthServiceClient;
import com.ticketmanagement.assignmentservice.client.NotificationClient;
import com.ticketmanagement.assignmentservice.dto.AgentProfileResponse;
import com.ticketmanagement.assignmentservice.dto.AgentSkillResponse;
import com.ticketmanagement.assignmentservice.dto.CreateNotificationRequestDTO;
import com.ticketmanagement.assignmentservice.dto.MyTeamResponse;
import com.ticketmanagement.assignmentservice.dto.NotificationType;
import com.ticketmanagement.assignmentservice.dto.SendEmailRequestDTO;
import com.ticketmanagement.assignmentservice.dto.TeamMemberWorkloadDTO;
import com.ticketmanagement.assignmentservice.dto.TeamRequest;
import com.ticketmanagement.assignmentservice.dto.TeamResponse;
import com.ticketmanagement.assignmentservice.dto.UserSummaryDTO;
import com.ticketmanagement.assignmentservice.entity.AgentProfile;
import com.ticketmanagement.assignmentservice.entity.Team;
import com.ticketmanagement.assignmentservice.entity.TeamAgentMembership;
import com.ticketmanagement.assignmentservice.exception.NotFoundException;
import com.ticketmanagement.assignmentservice.exception.ValidationException;
import com.ticketmanagement.assignmentservice.repository.AgentProfileRepository;
import com.ticketmanagement.assignmentservice.repository.TeamAgentMembershipRepository;
import com.ticketmanagement.assignmentservice.repository.TeamRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TeamService {

    private final TeamRepository teamRepository;
    private final AgentProfileRepository agentProfileRepository;
    private final TeamAgentMembershipRepository teamAgentMembershipRepository;
    private final AuthServiceClient authServiceClient;
    private final NotificationClient notificationClient;

    // -------------------------------------------------------------------------
    // CRUD teams
    // -------------------------------------------------------------------------

    @Transactional
    public TeamResponse createTeam(TeamRequest request, String currentUserId, String currentRole) {
        ensureAdmin(currentRole, "Only ADMIN can create teams");

        UserSummaryDTO manager = validateManager(request.getManagerId());
        Team team = Team.builder()
                .name(request.getName().trim())
                .description(request.getDescription())
                .managedCategories(request.getManagedCategories())
                .managerId(request.getManagerId().trim())
                .build();

        Team savedTeam = teamRepository.save(team);
        notifyNewManagerAssignment(savedTeam, manager, true, currentUserId);
        return mapToResponse(savedTeam);
    }

    @Transactional(readOnly = true)
    public List<TeamResponse> getAllTeams(String currentUserId, String currentRole) {
        List<Team> teams;
        if ("ADMIN".equals(currentRole)) {
            teams = teamRepository.findAll();
        } else if ("MANAGER".equals(currentRole)) {
            teams = teamRepository.findAllByManagerId(currentUserId);
        } else {
            throw new AccessDeniedException("Unauthorized");
        }
        return teams.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TeamResponse getTeamById(UUID teamId, String currentUserId, String currentRole) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found"));

        if ("MANAGER".equals(currentRole) && !Objects.equals(team.getManagerId(), currentUserId)) {
            throw new AccessDeniedException("You don't manage this team");
        }
        if ("AGENT".equals(currentRole) && !isAgentMemberOfTeam(teamId, currentUserId)) {
            throw new AccessDeniedException("You are not a member of this team");
        }
        return mapToResponse(team);
    }

    @Transactional
    public TeamResponse updateTeam(UUID teamId, TeamRequest request, String currentUserId, String currentRole) {
        ensureAdmin(currentRole, "Only ADMIN can update teams");

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found"));

        String previousManagerId = trimToNull(team.getManagerId());
        String requestedManagerId = trimToNull(request.getManagerId());
        UserSummaryDTO oldManager = getUserSafely(previousManagerId);
        UserSummaryDTO newManager = null;
        boolean managerChanged = !Objects.equals(previousManagerId, requestedManagerId);

        if (managerChanged) {
            newManager = validateManager(requestedManagerId);
        }

        team.setName(request.getName().trim());
        team.setDescription(request.getDescription());
        team.setManagedCategories(request.getManagedCategories());
        team.setManagerId(requestedManagerId);

        Team savedTeam = teamRepository.save(team);
        if (managerChanged) {
            notifyManagerChange(savedTeam, oldManager, newManager, currentUserId);
        }
        return mapToResponse(savedTeam);
    }

    @Transactional
    public void deleteTeam(UUID teamId, String currentRole) {
        ensureAdmin(currentRole, "Only ADMIN can delete teams");

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found"));

        List<AgentProfile> legacyAgents = agentProfileRepository.findByTeamId(teamId);
        legacyAgents.forEach(a -> a.setTeam(null));
        agentProfileRepository.saveAll(legacyAgents);

        List<AgentProfile> multiAgents = teamAgentMembershipRepository.findAgentsByTeamId(teamId);
        List<TeamAgentMembership> memberships = new ArrayList<>();
        for (AgentProfile a : multiAgents) {
            teamAgentMembershipRepository.findByTeamIdAndAgentId(teamId, a.getId())
                    .ifPresent(memberships::add);
        }
        teamAgentMembershipRepository.deleteAll(memberships);
        teamRepository.delete(team);
    }

    @Transactional
    public TeamResponse reassignManager(UUID teamId, String newManagerId, String currentUserId, String currentRole) {
        ensureAdmin(currentRole, "Only ADMIN can reassign team manager");

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found"));

        String normalizedManagerId = trimToNull(newManagerId);
        if (normalizedManagerId == null) {
            throw new ValidationException("Manager is required");
        }

        String previousManagerId = team.getManagerId();
        if (Objects.equals(previousManagerId, normalizedManagerId)) {
            return mapToResponse(team);
        }

        UserSummaryDTO oldManager = getUserSafely(previousManagerId);
        UserSummaryDTO newManager = validateManager(normalizedManagerId);

        team.setManagerId(normalizedManagerId);
        Team savedTeam = teamRepository.save(team);
        notifyManagerChange(savedTeam, oldManager, newManager, currentUserId);
        return mapToResponse(savedTeam);
    }

    // -------------------------------------------------------------------------
    // Agents membership
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<AgentProfileResponse> getTeamAgents(UUID teamId, String currentUserId, String currentRole) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found"));
        checkTeamPermission(team, currentUserId, currentRole);

        List<AgentProfile> agents = teamAgentMembershipRepository.findAgentsByTeamId(teamId);
        List<AgentProfile> legacyAgents = agentProfileRepository.findByTeamId(teamId).stream()
                .filter(legacy -> agents.stream().noneMatch(a -> Objects.equals(a.getId(), legacy.getId())))
                .toList();

        List<AgentProfile> combined = new ArrayList<>(agents);
        combined.addAll(legacyAgents);

        return combined.stream().map(this::mapAgentToResponse).collect(Collectors.toList());
    }

    @Transactional
    public void addAgentToTeam(UUID teamId, String agentUserId, String currentUserId, String currentRole) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found"));
        checkTeamPermission(team, currentUserId, currentRole);

        AgentProfile agent = agentProfileRepository.findByUserId(agentUserId)
                .orElseGet(() -> createAgentProfileForUser(agentUserId));

        if (teamAgentMembershipRepository.existsByTeamIdAndAgentId(teamId, agent.getId())) {
            return; // already member
        }

        if (agent.getTeam() == null) {
            agent.setTeam(team);
            agentProfileRepository.save(agent);
        }

        teamAgentMembershipRepository.save(TeamAgentMembership.builder()
                .team(team)
                .agent(agent)
                .build());

        // notify manager + agent
        notifyAgentAddedToTeam(team, agentUserId, currentUserId);
        notifyAgentAssignedToTeam(team, agentUserId, currentUserId);
    }

    @Transactional
    public void removeAgentFromTeam(UUID teamId, String agentUserId, String currentUserId, String currentRole) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found"));
        checkTeamPermission(team, currentUserId, currentRole);

        AgentProfile agent = agentProfileRepository.findByUserId(agentUserId)
                .orElseThrow(() -> new NotFoundException("Agent not found"));

        boolean removed = false;

        var membership = teamAgentMembershipRepository.findByTeamIdAndAgentId(teamId, agent.getId());
        if (membership.isPresent()) {
            teamAgentMembershipRepository.delete(membership.get());
            removed = true;
        }

        if (agent.getTeam() != null && Objects.equals(agent.getTeam().getId(), teamId)) {
            agent.setTeam(null);
            agentProfileRepository.save(agent);
            removed = true;
        }

        if (!removed) {
            throw new ValidationException("Agent is not in this team");
        }

        notifyAgentRemovedFromTeam(team, agentUserId, currentUserId);
        notifyAgentRemovalToManager(team, agentUserId, currentUserId);
    }

    private AgentProfile createAgentProfileForUser(String userId) {
        UserSummaryDTO user = authServiceClient.getUserById(userId);
        if (user == null) {
            throw new NotFoundException("Agent not found");
        }
        if (!"AGENT".equalsIgnoreCase(user.getRole())) {
            throw new ValidationException("User is not an agent");
        }
        return agentProfileRepository.save(AgentProfile.builder()
                .userId(userId)
                .isOnline(false)
                .maxConcurrentTickets(5)
                .build());
    }

    // -------------------------------------------------------------------------
    // Queries
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<TeamResponse> getTeamsByManagerId(String managerId) {
        return teamRepository.findAllByManagerId(managerId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TeamResponse getTeamByIdInternal(UUID teamId) {
        return teamRepository.findById(teamId).map(this::mapToResponse).orElse(null);
    }

    @Transactional(readOnly = true)
    public List<UserSummaryDTO> getAvailableManagers(String currentRole) {
        ensureAdmin(currentRole, "Only ADMIN can list managers");
        return authServiceClient.getUsersByRole("MANAGER");
    }

    @Transactional(readOnly = true)
    public List<TeamResponse> getTeamsForAgent(String userId, String currentRole) {
        List<Team> teams = new ArrayList<>();

        if ("ADMIN".equals(currentRole)) {
            teams.addAll(teamRepository.findAll());
        } else if ("MANAGER".equals(currentRole)) {
            teams.addAll(teamRepository.findAllByManagerId(userId));
        } else if ("AGENT".equalsIgnoreCase(currentRole != null ? currentRole.trim() : "")) {
            agentProfileRepository.findByUserId(userId).ifPresent(profile -> {
                if (profile.getTeam() != null) {
                    teams.add(profile.getTeam());
                }
            });
            List<Team> membershipTeams = teamAgentMembershipRepository.findTeamsByAgentUserId(userId);
            for (Team t : membershipTeams) {
                boolean already = teams.stream().anyMatch(e -> Objects.equals(e.getId(), t.getId()));
                if (!already) {
                    teams.add(t);
                }
            }
        }

        return teams.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public MyTeamResponse getMyTeam(String currentUserId, String currentRole) {
        Team team = null;

        AgentProfile profile = agentProfileRepository.findByUserId(currentUserId).orElse(null);
        if (profile != null && profile.getTeam() != null) {
            team = profile.getTeam();
        }
        if (team == null) {
            List<Team> membershipTeams = teamAgentMembershipRepository.findTeamsByAgentUserId(currentUserId);
            if (!membershipTeams.isEmpty()) {
                team = membershipTeams.get(0);
            }
        }
        if (team == null && "MANAGER".equalsIgnoreCase(currentRole)) {
            List<Team> managerTeams = teamRepository.findAllByManagerId(currentUserId);
            if (!managerTeams.isEmpty()) {
                team = managerTeams.get(0);
            }
        }
        if (team == null) {
            return null;
        }

        String managerId = trimToNull(team.getManagerId());
        String managerName = null;
        if (managerId != null) {
            UserSummaryDTO manager = getUserSafely(managerId);
            if (manager != null) {
                managerName = manager.getFullName();
            }
        }

        Set<UUID> seen = new HashSet<>();
        for (AgentProfile a : teamAgentMembershipRepository.findAgentsByTeamId(team.getId())) {
            seen.add(a.getId());
        }
        for (AgentProfile a : agentProfileRepository.findByTeamId(team.getId())) {
            seen.add(a.getId());
        }

        return MyTeamResponse.builder()
                .teamId(team.getId())
                .teamName(team.getName())
                .managerId(managerId)
                .managerName(managerName)
                .agentCount(seen.size())
                .build();
    }

    @Transactional(readOnly = true)
    public List<TeamMemberWorkloadDTO> getTeamMembersWorkload(UUID teamId, String currentUserId, String currentRole) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found"));
        checkTeamPermission(team, currentUserId, currentRole);

        Map<UUID, AgentProfile> unique = new LinkedHashMap<>();
        for (AgentProfile a : teamAgentMembershipRepository.findAgentsByTeamId(teamId)) {
            unique.put(a.getId(), a);
        }
        for (AgentProfile a : agentProfileRepository.findByTeamId(teamId)) {
            unique.putIfAbsent(a.getId(), a);
        }

        List<TeamMemberWorkloadDTO> result = new ArrayList<>();
        for (AgentProfile agent : unique.values()) {
            String userId = agent.getUserId();
            UserSummaryDTO user = getUserSafely(userId);
            String fullName = user != null && user.getFullName() != null ? user.getFullName()
                    : (userId != null ? userId : "Unknown");
            String role = user != null && user.getRole() != null ? user.getRole() : "AGENT";

            result.add(TeamMemberWorkloadDTO.builder()
                    .userId(userId)
                    .fullName(fullName)
                    .role(role)
                    .activeTicketsCount(0) // wire ticket-service later
                    .currentUser(Objects.equals(userId, currentUserId))
                    .build());
        }

        result.sort((a, b) -> {
            int cmp = Integer.compare(b.getActiveTicketsCount(), a.getActiveTicketsCount());
            return cmp != 0 ? cmp : a.getFullName().compareToIgnoreCase(b.getFullName());
        });
        return result;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getTeamActivity(UUID teamId, int hours, String currentUserId, String currentRole) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found"));
        checkTeamPermission(team, currentUserId, currentRole);
        return List.of();
    }

    // -------------------------------------------------------------------------
    // Notifications
    // -------------------------------------------------------------------------

    private void notifyNewManagerAssignment(Team team, UserSummaryDTO manager, boolean includeCategories, String currentUserId) {
        if (manager == null || manager.getId() == null) return;

        String title = "You've been assigned as team manager";
        String message = includeCategories
                ? "You are now the manager of team '%s', managing categories: %s."
                .formatted(team.getName(), formatManagedCategories(team))
                : "You are now the manager of team '%s'.".formatted(team.getName());

        sendManagerNotification(team, manager, title, message, currentUserId);
    }

    private void notifyFormerManagerRemoval(Team team, UserSummaryDTO manager, String currentUserId) {
        if (manager == null || manager.getId() == null) return;
        sendManagerNotification(
                team,
                manager,
                "Team manager changed",
                "You are no longer the manager of team '%s'.".formatted(team.getName()),
                currentUserId
        );
    }

    private void notifyManagerChange(Team team, UserSummaryDTO oldManager, UserSummaryDTO newManager, String currentUserId) {
        try {
            notifyNewManagerAssignment(team, newManager, false, currentUserId);
            if (oldManager != null && (newManager == null || !Objects.equals(idStr(oldManager), idStr(newManager)))) {
                notifyFormerManagerRemoval(team, oldManager, currentUserId);
            }
        } catch (Exception e) {
            log.warn("Manager notification flow failed for team {}", team.getId(), e);
        }
    }

    private void notifyAgentAddedToTeam(Team team, String agentUserId, String currentUserId) {
        try {
            String managerId = trimToNull(team.getManagerId());
            if (managerId == null) return;

            UserSummaryDTO manager = getUserSafely(managerId);
            if (manager == null || manager.getId() == null) return;
            if (isSameUser(currentUserId, manager)) return;

            UserSummaryDTO agent = getUserSafely(agentUserId);
            String agentName = agent != null && agent.getFullName() != null ? agent.getFullName() : "Unknown Agent";

            notificationClient.createNotification(new CreateNotificationRequestDTO(
                    manager.getId(),
                    "New agent added to your team",
                    "👤 Team Update\n%s was added to your team '%s'.".formatted(agentName, team.getName()),
                    NotificationType.TEAM_UPDATE,
                    null,
                    team.getId()
            ));
        } catch (Exception e) {
            log.warn("Failed to notify manager about agent addition to team {}", team.getId(), e);
        }
    }

    private void notifyAgentAssignedToTeam(Team team, String agentUserId, String currentUserId) {
        try {
            UserSummaryDTO agent = getUserSafely(agentUserId);
            if (agent == null || agent.getId() == null) return;
            if (isSameUser(currentUserId, agent)) return;

            String title = "You've been added to a team";
            String message = "👤 Team Update\nYou have been added to team '%s'.".formatted(team.getName());

            notificationClient.createNotification(new CreateNotificationRequestDTO(
                    agent.getId(),
                    title,
                    message,
                    NotificationType.TEAM_UPDATE,
                    null,
                    team.getId()
            ));
        } catch (Exception e) {
            log.warn("Failed to notify agent {} about team assignment {}", agentUserId, team.getId(), e);
        }
    }

    private void notifyAgentRemovedFromTeam(Team team, String agentUserId, String currentUserId) {
        try {
            UserSummaryDTO agent = getUserSafely(agentUserId);
            if (agent == null || agent.getId() == null) return;
            if (isSameUser(currentUserId, agent)) return;

            notificationClient.createNotification(new CreateNotificationRequestDTO(
                    agent.getId(),
                    "You've been removed from a team",
                    "👤 Team Update\nYou have been removed from team '%s'.".formatted(team.getName()),
                    NotificationType.TEAM_UPDATE,
                    null,
                    team.getId()
            ));
        } catch (Exception e) {
            log.warn("Failed to notify agent {} about team removal {}", agentUserId, team.getId(), e);
        }
    }

    private void notifyAgentRemovalToManager(Team team, String agentUserId, String currentUserId) {
        try {
            String managerId = trimToNull(team.getManagerId());
            if (managerId == null) return;

            UserSummaryDTO manager = getUserSafely(managerId);
            if (manager == null || manager.getId() == null) return;
            if (isSameUser(currentUserId, manager)) return;

            UserSummaryDTO agent = getUserSafely(agentUserId);
            String agentName = agent != null && agent.getFullName() != null ? agent.getFullName() : "Unknown Agent";

            notificationClient.createNotification(new CreateNotificationRequestDTO(
                    manager.getId(),
                    "Agent removed from your team",
                    "👤 Team Update\n%s was removed from team '%s'.".formatted(agentName, team.getName()),
                    NotificationType.TEAM_UPDATE,
                    null,
                    team.getId()
            ));
        } catch (Exception e) {
            log.warn("Failed to notify manager about agent removal from team {}", team.getId(), e);
        }
    }

    private void sendManagerNotification(Team team, UserSummaryDTO manager, String title, String message, String currentUserId) {
        try {
            if (isSameUser(currentUserId, manager)) return;

            notificationClient.createNotification(new CreateNotificationRequestDTO(
                    manager.getId(),
                    title,
                    message,
                    NotificationType.TEAM_UPDATE,
                    null,
                    team.getId()
            ));

            if (manager.getEmail() != null && !manager.getEmail().isBlank()) {
                notificationClient.sendEmail(new SendEmailRequestDTO(
                        manager.getEmail(),
                        title,
                        buildSimpleEmailHtml(manager.getFullName(), title, message)
                ));
            }
        } catch (Exception e) {
            log.warn("Failed to notify manager {}", manager.getId(), e);
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private UserSummaryDTO validateManager(String managerId) {
        String normalized = trimToNull(managerId);
        if (normalized == null) {
            throw new ValidationException("Manager is required");
        }
        UserSummaryDTO user = authServiceClient.getUserById(normalized);
        if (user == null) {
            throw new ValidationException("Manager not found");
        }
        if (user.getRole() == null || !"MANAGER".equalsIgnoreCase(user.getRole())) {
            throw new AccessDeniedException("Selected user must have MANAGER role");
        }
        return user;
    }

    private void checkTeamPermission(Team team, String currentUserId, String currentRole) {
        if ("ADMIN".equals(currentRole)) return;
        if ("MANAGER".equals(currentRole) && Objects.equals(team.getManagerId(), currentUserId)) return;
        if ("AGENT".equals(currentRole) && isAgentMemberOfTeam(team.getId(), currentUserId)) return;
        throw new AccessDeniedException("You don't have permission to manage this team's agents");
    }

    private boolean isAgentMemberOfTeam(UUID teamId, String agentUserId) {
        if (teamAgentMembershipRepository.existsByAgentUserIdAndTeamId(agentUserId, teamId)) {
            return true;
        }
        return agentProfileRepository.findByUserId(agentUserId)
                .map(p -> p.getTeam() != null && Objects.equals(p.getTeam().getId(), teamId))
                .orElse(false);
    }

    private void ensureAdmin(String currentRole, String message) {
        if (!"ADMIN".equals(currentRole)) {
            throw new AccessDeniedException(message);
        }
    }

    private UserSummaryDTO getUserSafely(String userId) {
        try {
            return authServiceClient.getUserById(userId);
        } catch (Exception e) {
            log.warn("Could not fetch user {}", userId, e);
            return null;
        }
    }

    private boolean isSameUser(String currentUserId, UserSummaryDTO user) {
        if (currentUserId == null || user == null || user.getId() == null) return false;
        return currentUserId.equals(idStr(user));
    }

    private String idStr(UserSummaryDTO user) {
        return user.getId() == null ? null : user.getId().toString();
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }

    private String formatManagedCategories(Team team) {
        if (team.getManagedCategories() == null || team.getManagedCategories().isEmpty()) {
            return "none";
        }
        return String.join(", ", team.getManagedCategories());
    }

    private String buildSimpleEmailHtml(String name, String title, String message) {
        String recipient = (name == null || name.isBlank()) ? "there" : name;
        return """
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2>Hi %s,</h2>
                  <h3>%s</h3>
                  <p>%s</p>
                </div>
                """.formatted(recipient, title, message);
    }

    private AgentProfileResponse mapAgentToResponse(AgentProfile agent) {
        String fullName = null;
        String email = null;
        if (agent.getUserId() != null) {
            UserSummaryDTO user = getUserSafely(agent.getUserId());
            if (user != null) {
                fullName = user.getFullName();
                email = user.getEmail();
            }
        }
        return AgentProfileResponse.builder()
                .id(agent.getId())
                .userId(agent.getUserId())
                .fullName(fullName)
                .email(email)
                .teamId(agent.getTeam() != null ? agent.getTeam().getId() : null)
                .teamName(agent.getTeam() != null ? agent.getTeam().getName() : null)
                .isOnline(agent.getIsOnline())
                .maxConcurrentTickets(agent.getMaxConcurrentTickets())
                .skills(agent.getSkills() == null ? List.of() : agent.getSkills().stream()
                        .map(s -> AgentSkillResponse.builder()
                                .id(s.getId())
                                .skillName(s.getSkillName())
                                .level(s.getLevel())
                                .build())
                        .collect(Collectors.toList()))
                .build();
    }

    private TeamResponse mapToResponse(Team team) {
        String managerId = trimToNull(team.getManagerId());
        String managerName = null;
        if (managerId != null) {
            UserSummaryDTO manager = getUserSafely(managerId);
            if (manager != null) managerName = manager.getFullName();
        }

        Set<UUID> unique = new HashSet<>();
        for (AgentProfile a : teamAgentMembershipRepository.findAgentsByTeamId(team.getId())) {
            unique.add(a.getId());
        }
        for (AgentProfile a : agentProfileRepository.findByTeamId(team.getId())) {
            unique.add(a.getId());
        }

        return TeamResponse.builder()
                .id(team.getId())
                .name(team.getName())
                .description(team.getDescription())
                .managedCategories(team.getManagedCategories())
                .managerId(managerId)
                .managerName(managerName)
                .agentCount(unique.size())
                .createdAt(team.getCreatedAt())
                .updatedAt(team.getUpdatedAt())
                .build();
    }
}