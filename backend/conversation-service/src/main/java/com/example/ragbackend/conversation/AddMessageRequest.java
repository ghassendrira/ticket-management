package com.example.ragbackend.conversation;

import jakarta.validation.constraints.NotBlank;

public record AddMessageRequest(@NotBlank String content, String role, Float confidence) {
}
