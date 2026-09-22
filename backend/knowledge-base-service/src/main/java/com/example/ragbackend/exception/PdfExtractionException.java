package com.example.ragbackend.exception;

public class PdfExtractionException extends RagBackendException {

    public PdfExtractionException(String message) {
        super(message, "PDF_EXTRACTION_FAILED", null);
    }

    public PdfExtractionException(String message, Throwable cause) {
        super(message, "PDF_EXTRACTION_FAILED", cause);
    }
}
