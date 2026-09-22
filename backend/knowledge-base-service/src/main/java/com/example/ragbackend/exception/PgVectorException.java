package com.example.ragbackend.exception;

public class PgVectorException extends RagBackendException {

    public PgVectorException(String message) {
        super(message, "PGVECTOR_ERROR", null);
    }

    public PgVectorException(String message, Throwable cause) {
        super(message, "PGVECTOR_ERROR", cause);
    }
}
