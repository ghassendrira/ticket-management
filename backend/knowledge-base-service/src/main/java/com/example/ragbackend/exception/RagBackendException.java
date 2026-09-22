package com.example.ragbackend.exception;

public class RagBackendException extends RuntimeException {

    private final String errorCode;

    public RagBackendException(String message) {
        super(message);
        this.errorCode = "RAG_ERROR";
    }

    public RagBackendException(String message, Throwable cause) {
        super(message, cause);
        this.errorCode = "RAG_ERROR";
    }

    public RagBackendException(String message, String errorCode, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
