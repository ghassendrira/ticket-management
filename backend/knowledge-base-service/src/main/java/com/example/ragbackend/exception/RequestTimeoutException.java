package com.example.ragbackend.exception;

public class RequestTimeoutException extends RagBackendException {

    public RequestTimeoutException(String message) {
        super(message, "REQUEST_TIMEOUT", null);
    }

    public RequestTimeoutException(String message, Throwable cause) {
        super(message, "REQUEST_TIMEOUT", cause);
    }
}
