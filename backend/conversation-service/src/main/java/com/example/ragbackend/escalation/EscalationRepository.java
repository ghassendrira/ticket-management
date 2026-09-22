package com.example.ragbackend.escalation;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EscalationRepository extends JpaRepository<EscalationEntity, UUID> {
    List<EscalationEntity> findAllByOrderByIdDesc();
}
