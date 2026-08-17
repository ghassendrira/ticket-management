package com.ticketmanagement.assignmentservice.repository;

import com.ticketmanagement.assignmentservice.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TeamRepository extends JpaRepository<Team, UUID> {

    // ⬇️ NEW: Find teams by manager
    List<Team> findAllByManagerId(String managerId);
}