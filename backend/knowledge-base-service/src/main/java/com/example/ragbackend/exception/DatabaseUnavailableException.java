package com.example.ragbackend.exception;

public class DatabaseUnavailableException extends RagBackendException {

    public DatabaseUnavailableException(String message) {
        super(message, "DATABASE_UNAVAILABLE", null);
    }

    public DatabaseUnavailableException(String message, Throwable cause) {
        super(message, "DATABASE_UNAVAILABLE", cause);
    }
}
