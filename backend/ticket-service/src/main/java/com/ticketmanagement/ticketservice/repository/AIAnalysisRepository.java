package com.ticketmanagement.ticketservice.repository;

import com.ticketmanagement.ticketservice.entity.AIAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface AIAnalysisRepository extends JpaRepository<AIAnalysis, UUID> {
}