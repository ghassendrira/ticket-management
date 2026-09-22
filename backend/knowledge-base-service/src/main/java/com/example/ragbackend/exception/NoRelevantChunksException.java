package com.example.ragbackend.exception;

public class NoRelevantChunksException extends RagBackendException {

    public NoRelevantChunksException(String message) {
        super(message, "NO_RELEVANT_CHUNKS", null);
    }

    public NoRelevantChunksException(String message, Throwable cause) {
        super(message, "NO_RELEVANT_CHUNKS", cause);
    }
}
