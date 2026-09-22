package com.example.ragbackend.exception;

public class EmbeddingGenerationException extends RagBackendException {

    public EmbeddingGenerationException(String message) {
        super(message, "EMBEDDING_GENERATION_FAILED", null);
    }

    public EmbeddingGenerationException(String message, Throwable cause) {
        super(message, "EMBEDDING_GENERATION_FAILED", cause);
    }
}
