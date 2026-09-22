package com.example.ragbackend.conversation;

import jakarta.validation.constraints.NotBlank;

public record FeedbackRequest(@NotBlank String value) {
}