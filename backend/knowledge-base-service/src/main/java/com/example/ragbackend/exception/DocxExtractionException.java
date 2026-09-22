package com.example.ragbackend.exception;

public class DocxExtractionException extends RagBackendException {

    public DocxExtractionException(String message) {
        super(message, "DOCX_EXTRACTION_FAILED", null);
    }

    public DocxExtractionException(String message, Throwable cause) {
        super(message, "DOCX_EXTRACTION_FAILED", cause);
    }
}
