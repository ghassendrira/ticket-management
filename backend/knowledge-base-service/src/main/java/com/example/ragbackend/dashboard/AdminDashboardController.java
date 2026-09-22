package com.example.ragbackend.dashboard;

import com.example.ragbackend.conversation.ConversationEntity;
import com.example.ragbackend.conversation.ConversationRepository;
import com.example.ragbackend.conversation.MessageRepository;
import com.example.ragbackend.escalation.EscalationRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/admin/dashboard")
public class AdminDashboardController {

    private final ConversationRepository conversationRepository;
    private final EscalationRepository escalationRepository;
    private final MessageRepository messageRepository;

    public AdminDashboardController(
        ConversationRepository conversationRepository,
        EscalationRepository escalationRepository,
        MessageRepository messageRepository
    ) {
        this.conversationRepository = conversationRepository;
        this.escalationRepository = escalationRepository;
        this.messageRepository = messageRepository;
    }

    @GetMapping
    public DashboardDataDto getDashboardData() {
        List<ConversationEntity> conversations = conversationRepository.findAllByOrderByCreatedAtDesc();
        long totalConversations = conversations.size();
        long resolvedConversations = conversationRepository.countByStatus("RESOLVED");
        long escalationsCount = escalationRepository.count();
        double autoResolutionRate = totalConversations == 0
            ? 0
            : Math.round((resolvedConversations * 10000.0) / totalConversations) / 100.0;

        Double averageConfidence = messageRepository.findAverageAssistantConfidence();
        double averageSatisfaction = averageConfidence == null ? 0 : Math.round(averageConfidence * 5 * 100.0) / 100.0;

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM", Locale.FRANCE);
        List<DailyQuestionStatDto> dailyQuestions = conversations.stream()
            .limit(7)
            .map(conversation -> new DailyQuestionStatDto(formatter.format(conversation.getCreatedAt()), 1L))
            .toList();

        List<String> unresolvedQuestions = escalationRepository.findTop5ByOrderByIdDesc().stream()
            .map(escalation -> escalation.getTitle())
            .toList();

        return new DashboardDataDto(
            totalConversations,
            autoResolutionRate,
            escalationsCount,
            averageSatisfaction,
            dailyQuestions,
            unresolvedQuestions
        );
    }
}

record DashboardDataDto(
    long totalConversations,
    double autoResolutionRate,
    long escalationsCount,
    double averageSatisfaction,
    List<DailyQuestionStatDto> dailyQuestions,
    List<String> unresolvedQuestions
) {
}

record DailyQuestionStatDto(String day, long count) {
}
