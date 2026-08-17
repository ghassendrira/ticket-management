package com.ticketmanagement.assignmentservice.repository;

import com.ticketmanagement.assignmentservice.entity.AgentProfile;
import com.ticketmanagement.assignmentservice.entity.Team;
import com.ticketmanagement.assignmentservice.entity.TeamAgentMembership;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TeamAgentMembershipRepository extends JpaRepository<TeamAgentMembership, UUID> {

    boolean existsByTeamIdAndAgentId(UUID teamId, UUID agentProfileId);

    Optional<TeamAgentMembership> findByTeamIdAndAgentId(UUID teamId, UUID agentProfileId);

    @Query("SELECT m.agent FROM TeamAgentMembership m WHERE m.team.id = :teamId")
    List<AgentProfile> findAgentsByTeamId(UUID teamId);

    @Query("SELECT m.team FROM TeamAgentMembership m WHERE m.agent.id = :agentProfileId")
    List<Team> findTeamsByAgentProfileId(UUID agentProfileId);

    @Query("SELECT m.team FROM TeamAgentMembership m JOIN m.agent a WHERE a.userId = :userId")
    List<Team> findTeamsByAgentUserId(String userId);

    @Query("SELECT CASE WHEN COUNT(m) > 0 THEN true ELSE false END " +
           "FROM TeamAgentMembership m JOIN m.agent a " +
           "WHERE a.userId = :userId AND m.team.id = :teamId")
    boolean existsByAgentUserIdAndTeamId(String userId, UUID teamId);

    void deleteByTeamIdAndAgentId(UUID teamId, UUID agentProfileId);
}
