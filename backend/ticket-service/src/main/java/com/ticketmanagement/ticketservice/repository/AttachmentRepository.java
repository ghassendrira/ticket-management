package com.ticketmanagement.ticketservice.repository;

import com.ticketmanagement.ticketservice.entity.Attachment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface AttachmentRepository extends JpaRepository<Attachment, UUID> {
    List<Attachment> findByTicketId(UUID ticketId);
}