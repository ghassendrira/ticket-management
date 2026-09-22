package com.example.ragbackend.dashboard;

import com.example.ragbackend.conversation.ConversationRepository;
import com.example.ragbackend.document.DocumentRepository;
import com.example.ragbackend.escalation.EscalationRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/dashboard")
public class DashboardController {

    private final ConversationRepository conversationRepository;
    private final EscalationRepository escalationRepository;
    private final DocumentRepository documentRepository;

    public DashboardController(
        ConversationRepository conversationRepository,
        EscalationRepository escalationRepository,
        DocumentRepository documentRepository
    ) {
        this.conversationRepository = conversationRepository;
        this.escalationRepository = escalationRepository;
        this.documentRepository = documentRepository;
    }

    @GetMapping
    public ResponseEntity<?> getDashboard() {
        long totalConversations = conversationRepository.count();
        long totalEscalations = escalationRepository.count();
        long totalDocuments = documentRepository.count();
        long indexedDocuments = documentRepository.countByStatus("INDEXED");
        long pendingIndexations = documentRepository.countByStatus("PENDING");
        long failedIndexations = documentRepository.countByStatus("FAILED");

        return ResponseEntity.ok(Map.of(
            "totalConversations", totalConversations,
            "totalEscalations", totalEscalations,
            "totalDocuments", totalDocuments,
            "indexedDocuments", indexedDocuments,
            "pendingIndexations", pendingIndexations,
            "failedIndexations", failedIndexations,
            "dailyQuestions", java.util.List.of(),
            "unresolvedQuestions", java.util.List.of()
        ));
    }
}
