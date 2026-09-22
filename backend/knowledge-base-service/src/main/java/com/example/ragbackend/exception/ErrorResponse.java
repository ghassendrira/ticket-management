package com.example.ragbackend.exception;

import java.time.LocalDateTime;

public record ErrorResponse(
    int status,
    String error,
    String message,
    String errorCode,
    String path,
    LocalDateTime timestamp
) {
    public static ErrorResponse of(int status, String error, String message, String errorCode, String path) {
        return new ErrorResponse(status, error, message, errorCode, path, LocalDateTime.now());
    }
}
