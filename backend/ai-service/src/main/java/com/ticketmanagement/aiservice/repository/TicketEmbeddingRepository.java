package com.ticketmanagement.aiservice.repository;

import com.ticketmanagement.aiservice.entity.TicketEmbedding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TicketEmbeddingRepository extends JpaRepository<TicketEmbedding, UUID> {

    List<TicketEmbedding> findAllByStatusIn(List<String> statuses);
}