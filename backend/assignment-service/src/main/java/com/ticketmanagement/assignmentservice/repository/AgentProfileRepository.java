package com.ticketmanagement.assignmentservice.repository;

import com.ticketmanagement.assignmentservice.entity.AgentProfile;
import com.ticketmanagement.assignmentservice.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AgentProfileRepository extends JpaRepository<AgentProfile, UUID> {

    boolean existsByUserId(String userId);

    Optional<AgentProfile> findByUserId(String userId);

    @Query("SELECT a FROM AgentProfile a " +
            "LEFT JOIN FETCH a.team " +
            "LEFT JOIN FETCH a.skills")
    List<AgentProfile> findAllWithTeamAndSkills();

    @Query("SELECT a FROM AgentProfile a " +
            "LEFT JOIN FETCH a.team " +
            "LEFT JOIN FETCH a.skills " +
            "WHERE a.id = :id")
    Optional<AgentProfile> findByIdWithTeamAndSkills(UUID id);

    long countByTeam(Team team);

    @Query("SELECT a FROM AgentProfile a " +
            "LEFT JOIN FETCH a.team " +
            "LEFT JOIN FETCH a.skills " +
            "WHERE a.team.id = :teamId")
    List<AgentProfile> findAllByTeamIdWithSkills(UUID teamId);
List<AgentProfile> findByTeamId(UUID teamId);
}
