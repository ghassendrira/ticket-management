package com.example.ragbackend.document.extract;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

@Component
public class DocumentExtractorFactory {

    private static final Logger LOGGER = LoggerFactory.getLogger(DocumentExtractorFactory.class);

    private final List<DocumentExtractor> extractors;

    public DocumentExtractorFactory(
        PdfExtractor pdfExtractor,
        DocxExtractor docxExtractor,
        TxtExtractor txtExtractor
    ) {
        this.extractors = List.of(pdfExtractor, docxExtractor, txtExtractor);
    }

    public ExtractedDocument extract(Path filePath) throws IOException {
        String mimeType = detectMimeType(filePath);
        LOGGER.info("Detected MIME type for {}: {}", filePath.getFileName(), mimeType);

        Optional<DocumentExtractor> extractor = extractors.stream()
            .filter(e -> e.supports(mimeType))
            .findFirst();

        if (extractor.isEmpty()) {
            throw new IOException(
                "Aucun extracteur disponible pour le type MIME: " + mimeType
                    + " (fichier: " + filePath.getFileName() + ")"
            );
        }

        return extractor.get().extract(filePath);
    }

    public String detectMimeType(Path filePath) throws IOException {
        String fileName = filePath.getFileName() != null ? filePath.getFileName().toString().toLowerCase() : "";

        String detected = Files.probeContentType(filePath);
        if (detected != null && !detected.isBlank()) {
            return normalizeMimeType(detected, fileName);
        }

        return guessFromExtension(fileName);
    }

    private String normalizeMimeType(String raw, String fileName) {
        String mt = raw.trim().toLowerCase();
        if (mt.equals("application/octet-stream") || mt.equals("application/zip") || mt.isBlank()) {
            String guessed = guessFromExtension(fileName);
            if (!guessed.equals("application/octet-stream")) {
                return guessed;
            }
        }
        return mt;
    }

    private String guessFromExtension(String fileName) {
        if (fileName.endsWith(".pdf")) return "application/pdf";
        if (fileName.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        if (fileName.endsWith(".doc")) return "application/msword";
        if (fileName.endsWith(".txt")) return "text/plain";
        if (fileName.endsWith(".md")) return "text/markdown";
        if (fileName.endsWith(".json")) return "application/json";
        if (fileName.endsWith(".html") || fileName.endsWith(".htm")) return "text/html";
        return "application/octet-stream";
    }
}
