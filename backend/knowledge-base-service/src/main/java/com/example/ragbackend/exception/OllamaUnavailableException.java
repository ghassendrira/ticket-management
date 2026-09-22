package com.example.ragbackend.exception;

public class OllamaUnavailableException extends RagBackendException {

    public OllamaUnavailableException(String message) {
        super(message, "OLLAMA_UNAVAILABLE", null);
    }

    public OllamaUnavailableException(String message, Throwable cause) {
        super(message, "OLLAMA_UNAVAILABLE", cause);
    }
}
