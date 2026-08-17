package com.ticketmanagement.assignmentservice.repository;

import com.ticketmanagement.assignmentservice.entity.AgentSkill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AgentSkillRepository extends JpaRepository<AgentSkill, UUID> {
}
