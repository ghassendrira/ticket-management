package com.example.ragbackend.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.sql.SQLException;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(OllamaUnavailableException.class)
    public ResponseEntity<ErrorResponse> handleOllamaUnavailable(
        OllamaUnavailableException ex, HttpServletRequest request
    ) {
        LOGGER.warn("Ollama indisponible: {}", ex.getMessage());
        return buildResponse(HttpStatus.SERVICE_UNAVAILABLE,
            "Service Ollama indisponible", ex.getMessage(), ex.getErrorCode(), request);
    }

    @ExceptionHandler(EmbeddingGenerationException.class)
    public ResponseEntity<ErrorResponse> handleEmbeddingFailure(
        EmbeddingGenerationException ex, HttpServletRequest request
    ) {
        LOGGER.error("Échec génération embedding: {}", ex.getMessage());
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR,
            "Erreur génération du vecteur sémantique",
            "Le service d'embedding a rencontré une erreur. Réessayez ultérieurement.",
            ex.getErrorCode(), request);
    }

    @ExceptionHandler(LlmGenerationException.class)
    public ResponseEntity<ErrorResponse> handleLlmFailure(
        LlmGenerationException ex, HttpServletRequest request
    ) {
        LOGGER.error("Échec génération LLM: {}", ex.getMessage());
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR,
            "Erreur génération de réponse IA",
            "Le modèle de langage n'a pas pu générer une réponse. Réessayez ultérieurement.",
            ex.getErrorCode(), request);
    }

    @ExceptionHandler(InvalidDocumentException.class)
    public ResponseEntity<ErrorResponse> handleInvalidDocument(
        InvalidDocumentException ex, HttpServletRequest request
    ) {
        LOGGER.warn("Document invalide: {}", ex.getMessage());
        return buildResponse(HttpStatus.BAD_REQUEST,
            "Document invalide", ex.getMessage(), ex.getErrorCode(), request);
    }

    @ExceptionHandler(PdfExtractionException.class)
    public ResponseEntity<ErrorResponse> handlePdfExtractionFailure(
        PdfExtractionException ex, HttpServletRequest request
    ) {
        LOGGER.error("Échec extraction PDF: {}", ex.getMessage());
        return buildResponse(HttpStatus.UNPROCESSABLE_ENTITY,
            "Extraction PDF impossible",
            "Impossible d'extraire le texte du fichier PDF. Vérifiez qu'il n'est pas corrompu ou protégé par mot de passe.",
            ex.getErrorCode(), request);
    }

    @ExceptionHandler(DocxExtractionException.class)
    public ResponseEntity<ErrorResponse> handleDocxExtractionFailure(
        DocxExtractionException ex, HttpServletRequest request
    ) {
        LOGGER.error("Échec extraction DOCX: {}", ex.getMessage());
        return buildResponse(HttpStatus.UNPROCESSABLE_ENTITY,
            "Extraction DOCX impossible",
            "Impossible d'extraire le texte du fichier DOCX. Vérifiez qu'il n'est pas corrompu.",
            ex.getErrorCode(), request);
    }

    @ExceptionHandler(EmptyDocumentException.class)
    public ResponseEntity<ErrorResponse> handleEmptyDocument(
        EmptyDocumentException ex, HttpServletRequest request
    ) {
        LOGGER.warn("Document vide: {}", ex.getMessage());
        return buildResponse(HttpStatus.BAD_REQUEST,
            "Document vide",
            "Le document fourni est vide ou ne contient aucun texte extractible.",
            ex.getErrorCode(), request);
    }

    @ExceptionHandler(NoRelevantChunksException.class)
    public ResponseEntity<ErrorResponse> handleNoRelevantChunks(
        NoRelevantChunksException ex, HttpServletRequest request
    ) {
        LOGGER.info("Aucun chunk pertinent: {}", ex.getMessage());
        return buildResponse(HttpStatus.OK,
            "Aucun résultat pertinent",
            ex.getMessage(),
            ex.getErrorCode(), request);
    }

    @ExceptionHandler(DatabaseUnavailableException.class)
    public ResponseEntity<ErrorResponse> handleDatabaseUnavailable(
        DatabaseUnavailableException ex, HttpServletRequest request
    ) {
        LOGGER.error("PostgreSQL indisponible: {}", ex.getMessage());
        return buildResponse(HttpStatus.SERVICE_UNAVAILABLE,
            "Base de données indisponible",
            "La base de données PostgreSQL est inaccessible. Contactez l'administrateur système.",
            ex.getErrorCode(), request);
    }

    @ExceptionHandler(PgVectorException.class)
    public ResponseEntity<ErrorResponse> handlePgVectorError(
        PgVectorException ex, HttpServletRequest request
    ) {
        LOGGER.error("Erreur pgvector: {}", ex.getMessage());
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR,
            "Erreur de recherche vectorielle",
            "Une erreur est survenue lors de la recherche sémantique (pgvector). Réessayez ultérieurement.",
            ex.getErrorCode(), request);
    }

    @ExceptionHandler(RequestTimeoutException.class)
    public ResponseEntity<ErrorResponse> handleTimeout(
        RequestTimeoutException ex, HttpServletRequest request
    ) {
        LOGGER.warn("Timeout: {}", ex.getMessage());
        return buildResponse(HttpStatus.GATEWAY_TIMEOUT,
            "Délai d'attente dépassé",
            "La requête a pris trop de temps à s'exécuter. Réessayez avec une question plus courte.",
            ex.getErrorCode(), request);
    }

    @ExceptionHandler(CannotCreateTransactionException.class)
    public ResponseEntity<ErrorResponse> handleCannotCreateTransaction(
        CannotCreateTransactionException ex, HttpServletRequest request
    ) {
        LOGGER.error("Impossible de créer transaction DB: {}", ex.getMessage());
        String msg = "La base de données est inaccessible. Vérifiez que PostgreSQL est démarré et accessible.";
        return buildResponse(HttpStatus.SERVICE_UNAVAILABLE,
            "Base de données indisponible", msg, "DATABASE_UNAVAILABLE", request);
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<ErrorResponse> handleDataAccessException(
        DataAccessException ex, HttpServletRequest request
    ) {
        LOGGER.error("DataAccessException: {}", ex.getMessage());
        String msg = ex.getMessage() != null ? ex.getMessage().toLowerCase() : "";
        if (msg.contains("vector") || msg.contains("pgvector") || msg.contains("embedding")) {
            return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                "Erreur de recherche vectorielle",
                "Une erreur pgvector est survenue. Vérifiez l'extension pgvector et les dimensions des vecteurs.",
                "PGVECTOR_ERROR", request);
        }
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR,
            "Erreur d'accès aux données",
            "Une erreur est survenue lors de l'accès aux données. Réessayez ultérieurement.",
            "DATA_ACCESS_ERROR", request);
    }

    @ExceptionHandler(SQLException.class)
    public ResponseEntity<ErrorResponse> handleSQLException(
        SQLException ex, HttpServletRequest request
    ) {
        LOGGER.error("SQLException: état={}, code={}, msg={}",
            ex.getSQLState(), ex.getErrorCode(), ex.getMessage());
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR,
            "Erreur base de données",
            "Une erreur SQL est survenue. Contactez le support si le problème persiste.",
            "SQL_ERROR", request);
    }

    @ExceptionHandler(ResourceAccessException.class)
    public ResponseEntity<ErrorResponse> handleResourceAccess(
        ResourceAccessException ex, HttpServletRequest request
    ) {
        LOGGER.error("ResourceAccessException (probablement Ollama): {}", ex.getMessage());
        return buildResponse(HttpStatus.SERVICE_UNAVAILABLE,
            "Service externe indisponible",
            "Ollama est inaccessible. Vérifiez qu'il est démarré sur le port configuré.",
            "OLLAMA_UNAVAILABLE", request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationErrors(
        MethodArgumentNotValidException ex, HttpServletRequest request
    ) {
        String details = ex.getBindingResult().getFieldErrors().stream()
            .map(FieldError::getDefaultMessage)
            .collect(Collectors.joining(" ; "));
        LOGGER.warn("Validation failed: {}", details);
        return buildResponse(HttpStatus.BAD_REQUEST,
            "Données de requête invalides",
            details, "VALIDATION_ERROR", request);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleUnreadableBody(
        HttpMessageNotReadableException ex, HttpServletRequest request
    ) {
        LOGGER.warn("Corps requête illisible: {}", ex.getMessage());
        return buildResponse(HttpStatus.BAD_REQUEST,
            "Corps de requête invalide",
            "Le corps de la requête JSON est malformé ou absent.",
            "MALFORMED_REQUEST", request);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(
        MethodArgumentTypeMismatchException ex, HttpServletRequest request
    ) {
        LOGGER.warn("Type mismatch sur paramètre: {}", ex.getMessage());
        return buildResponse(HttpStatus.BAD_REQUEST,
            "Paramètre invalide",
            "Le paramètre '" + ex.getName() + "' a un format incorrect.",
            "PARAMETER_TYPE_MISMATCH", request);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxUploadSize(
        MaxUploadSizeExceededException ex, HttpServletRequest request
    ) {
        LOGGER.warn("Fichier trop volumineux: {}", ex.getMessage());
        return buildResponse(HttpStatus.PAYLOAD_TOO_LARGE,
            "Fichier trop volumineux",
            "La taille maximale autorisée est de 10 Mo.",
            "FILE_TOO_LARGE", request);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ErrorResponse> handleResponseStatus(
        ResponseStatusException ex, HttpServletRequest request
    ) {
        LOGGER.warn("ResponseStatusException: {} - {}", ex.getStatusCode(), ex.getReason());
        HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());
        return buildResponse(status,
            status.getReasonPhrase(),
            ex.getReason() != null ? ex.getReason() : status.getReasonPhrase(),
            "HTTP_" + status.value(), request);
    }

    @ExceptionHandler(IOException.class)
    public ResponseEntity<ErrorResponse> handleIOException(
        IOException ex, HttpServletRequest request
    ) {
        LOGGER.error("IOException: {}", ex.getMessage());
        String lc = ex.getMessage() != null ? ex.getMessage().toLowerCase() : "";
        if (lc.contains("pdf") || request.getRequestURI().contains("upload")) {
            return buildResponse(HttpStatus.UNPROCESSABLE_ENTITY,
                "Traitement fichier impossible",
                "Impossible de lire ou traiter le fichier fourni.",
                "FILE_PROCESSING_ERROR", request);
        }
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR,
            "Erreur d'entrée/sortie",
            "Une erreur d'E/S est survenue.",
            "IO_ERROR", request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(
        IllegalArgumentException ex, HttpServletRequest request
    ) {
        LOGGER.warn("IllegalArgumentException: {}", ex.getMessage());
        return buildResponse(HttpStatus.BAD_REQUEST,
            "Paramètre invalide",
            ex.getMessage(),
            "ILLEGAL_ARGUMENT", request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(
        Exception ex, HttpServletRequest request
    ) {
        LOGGER.error("Exception inattendue: {} - {}", ex.getClass().getSimpleName(), ex.getMessage(), ex);
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR,
            "Erreur interne du serveur",
            "Une erreur inattendue est survenue. Si le problème persiste, contactez le support.",
            "INTERNAL_ERROR", request);
    }

    private ResponseEntity<ErrorResponse> buildResponse(
        HttpStatus status,
        String error,
        String message,
        String errorCode,
        HttpServletRequest request
    ) {
        String path = request.getRequestURI();
        if (request.getQueryString() != null && !request.getQueryString().isBlank()) {
            path += "?" + request.getQueryString();
        }
        ErrorResponse body = ErrorResponse.of(status.value(), error, message, errorCode, path);
        return ResponseEntity.status(status).body(body);
    }
}
