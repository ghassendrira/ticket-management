package com.example.ragbackend.exception;

public class LlmGenerationException extends RagBackendException {

    public LlmGenerationException(String message) {
        super(message, "LLM_GENERATION_FAILED", null);
    }

    public LlmGenerationException(String message, Throwable cause) {
        super(message, "LLM_GENERATION_FAILED", cause);
    }
}
