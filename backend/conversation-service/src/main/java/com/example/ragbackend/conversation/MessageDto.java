package com.example.ragbackend.conversation;

import java.util.UUID;
import java.time.LocalDateTime;

public record MessageDto(
	UUID id,
	String role,
	String content,
	Float confidence,
	Boolean isFallbackGeneral,
	LocalDateTime createdAt
) {
}
