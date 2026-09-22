package com.example.ragbackend.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("GlobalExceptionHandler Tests")
class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;

    @Mock
    private HttpServletRequest request;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
        when(request.getRequestURI()).thenReturn("/api/ai/ask");
        when(request.getQueryString()).thenReturn(null);
    }

    @Test
    @DisplayName("OllamaUnavailableException → 503, errorCode=OLLAMA_UNAVAILABLE, NO stack trace")
    void handleOllamaUnavailable_503NoStackTrace() {
        OllamaUnavailableException ex = new OllamaUnavailableException("port 11434 KO");

        ResponseEntity<ErrorResponse> r = handler.handleOllamaUnavailable(ex, request);

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, r.getStatusCode());
        assertNotNull(r.getBody());
        assertEquals("OLLAMA_UNAVAILABLE", r.getBody().errorCode());
        assertEquals(503, r.getBody().status());
        assertNotNull(r.getBody().message());
        assertNotNull(r.getBody().path());
        assertNotNull(r.getBody().timestamp());
    }

    @Test
    @DisplayName("LlmGenerationException → 500, message safe (sans stack)")
    void handleLlmGeneration_500SafeMessage() {
        LlmGenerationException ex = new LlmGenerationException("internal stack info here");

        ResponseEntity<ErrorResponse> r = handler.handleLlmFailure(ex, request);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, r.getStatusCode());
        ErrorResponse b = r.getBody();
        assertNotNull(b);
        assertEquals("LLM_GENERATION_FAILED", b.errorCode());
        assertFalse(b.message().contains("internal stack"),
            "Le message exposé ne doit pas contenir de détails internes");
    }

    @Test
    @DisplayName("EmbeddingGenerationException → 500")
    void handleEmbeddingFailure_500() {
        EmbeddingGenerationException ex = new EmbeddingGenerationException("dim mismatch");

        ResponseEntity<ErrorResponse> r = handler.handleEmbeddingFailure(ex, request);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, r.getStatusCode());
        assertEquals("EMBEDDING_GENERATION_FAILED", r.getBody().errorCode());
    }

    @Test
    @DisplayName("InvalidDocumentException → 400")
    void handleInvalidDocument_400() {
        InvalidDocumentException ex = new InvalidDocumentException("Taille > 10Mo");
        ResponseEntity<ErrorResponse> r = handler.handleInvalidDocument(ex, request);
        assertEquals(HttpStatus.BAD_REQUEST, r.getStatusCode());
        assertEquals("INVALID_DOCUMENT", r.getBody().errorCode());
    }

    @Test
    @DisplayName("PdfExtractionException → 422 UNPROCESSABLE_ENTITY")
    void handlePdfExtraction_422() {
        PdfExtractionException ex = new PdfExtractionException("PDF corrompu");
        ResponseEntity<ErrorResponse> r = handler.handlePdfExtractionFailure(ex, request);
        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, r.getStatusCode());
        assertEquals("PDF_EXTRACTION_FAILED", r.getBody().errorCode());
    }

    @Test
    @DisplayName("DocxExtractionException → 422")
    void handleDocxExtraction_422() {
        DocxExtractionException ex = new DocxExtractionException("DOCX KO");
        ResponseEntity<ErrorResponse> r = handler.handleDocxExtractionFailure(ex, request);
        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, r.getStatusCode());
    }

    @Test
    @DisplayName("EmptyDocumentException → 400")
    void handleEmptyDocument_400() {
        EmptyDocumentException ex = new EmptyDocumentException("Rien à extraire");
        ResponseEntity<ErrorResponse> r = handler.handleEmptyDocument(ex, request);
        assertEquals(HttpStatus.BAD_REQUEST, r.getStatusCode());
        assertEquals("EMPTY_DOCUMENT", r.getBody().errorCode());
    }

    @Test
    @DisplayName("DatabaseUnavailableException → 503")
    void handleDatabaseUnavailable_503() {
        DatabaseUnavailableException ex = new DatabaseUnavailableException("PG down");
        ResponseEntity<ErrorResponse> r = handler.handleDatabaseUnavailable(ex, request);
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, r.getStatusCode());
        assertEquals("DATABASE_UNAVAILABLE", r.getBody().errorCode());
    }

    @Test
    @DisplayName("PgVectorException → 500")
    void handlePgVector_500() {
        PgVectorException ex = new PgVectorException("vector operator error");
        ResponseEntity<ErrorResponse> r = handler.handlePgVectorError(ex, request);
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, r.getStatusCode());
        assertEquals("PGVECTOR_ERROR", r.getBody().errorCode());
    }

    @Test
    @DisplayName("RequestTimeoutException → 504")
    void handleTimeout_504() {
        RequestTimeoutException ex = new RequestTimeoutException("LLM lent");
        ResponseEntity<ErrorResponse> r = handler.handleTimeout(ex, request);
        assertEquals(HttpStatus.GATEWAY_TIMEOUT, r.getStatusCode());
        assertEquals("REQUEST_TIMEOUT", r.getBody().errorCode());
    }

    @Test
    @DisplayName("ResourceAccessException (ex: Ollama down) → 503 OLLAMA_UNAVAILABLE")
    void handleResourceAccess_503() {
        ResourceAccessException ex = new ResourceAccessException("Connection refused localhost:11434");
        ResponseEntity<ErrorResponse> r = handler.handleResourceAccess(ex, request);
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, r.getStatusCode());
        assertEquals("OLLAMA_UNAVAILABLE", r.getBody().errorCode());
    }

    @Test
    @DisplayName("ResponseStatusException (404) → 404 + message utilisateur")
    void handleResponseStatus_preserves404() {
        ResponseStatusException ex = new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation introuvable");
        ResponseEntity<ErrorResponse> r = handler.handleResponseStatus(ex, request);
        assertEquals(HttpStatus.NOT_FOUND, r.getStatusCode());
        assertTrue(r.getBody().message().contains("Conversation introuvable"));
    }

    @Test
    @DisplayName("Exception générique → 500, message safe (pas de fuite stack)")
    void handleGeneric_safe500() {
        RuntimeException ex = new RuntimeException("fuite de données sensibles user=X pwd=Y");
        ResponseEntity<ErrorResponse> r = handler.handleGenericException(ex, request);
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, r.getStatusCode());
        assertFalse(r.getBody().message().contains("user=X"), "pas de fuite infos sensibles");
        assertFalse(r.getBody().message().contains("pwd=Y"));
    }
}
