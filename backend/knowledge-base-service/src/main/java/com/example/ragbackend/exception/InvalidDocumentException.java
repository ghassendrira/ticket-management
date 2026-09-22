package com.example.ragbackend.exception;

public class InvalidDocumentException extends RagBackendException {

    public InvalidDocumentException(String message) {
        super(message, "INVALID_DOCUMENT", null);
    }

    public InvalidDocumentException(String message, Throwable cause) {
        super(message, "INVALID_DOCUMENT", cause);
    }
}
