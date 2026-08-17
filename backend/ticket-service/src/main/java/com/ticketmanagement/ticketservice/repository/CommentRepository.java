package com.ticketmanagement.ticketservice.repository;

import com.ticketmanagement.ticketservice.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface CommentRepository extends JpaRepository<Comment, UUID> {
    List<Comment> findByTicketId(UUID ticketId);
    int countByTicketId(UUID ticketId);
}