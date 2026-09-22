package com.example.ragbackend.exception;

public class EmptyDocumentException extends RagBackendException {

    public EmptyDocumentException(String message) {
        super(message, "EMPTY_DOCUMENT", null);
    }

    public EmptyDocumentException(String message, Throwable cause) {
        super(message, "EMPTY_DOCUMENT", cause);
    }
}
