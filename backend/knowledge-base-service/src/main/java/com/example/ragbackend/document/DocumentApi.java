package com.example.ragbackend.document;

import com.example.ragbackend.category.CategoryEntity;
import com.example.ragbackend.category.CategoryRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/documents")
@Tag(name = "Documents", description = "APIs de gestion des documents d'entraînement RAG")
public class DocumentApi {

    private static final Logger LOGGER = LoggerFactory.getLogger(DocumentApi.class);

    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
        "application/pdf",
        "application/x-pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "text/plain",
        "application/json",
        "text/markdown"
    );

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
        ".pdf", ".docx", ".doc", ".txt", ".md", ".json"
    );

    private final DocumentRepository documentRepository;
    private final CategoryRepository categoryRepository;
    private final DocumentProcessingService documentProcessingService;
    private final String documentsDir;
    private final long maxFileSizeBytes;

    public DocumentApi(
        DocumentRepository documentRepository,
        CategoryRepository categoryRepository,
        DocumentProcessingService documentProcessingService,
        @Value("${app.storage.documents-dir:uploads}") String documentsDir,
        @Value("${app.storage.max-file-size:10485760}") long maxFileSizeBytes
    ) {
        this.documentRepository = documentRepository;
        this.categoryRepository = categoryRepository;
        this.documentProcessingService = documentProcessingService;
        this.documentsDir = documentsDir;
        this.maxFileSizeBytes = maxFileSizeBytes;
    }

    @PostConstruct
    public void initDir() throws IOException {
        Path root = Paths.get(documentsDir).toAbsolutePath().normalize();
        Files.createDirectories(root);
        LOGGER.info("Document storage directory: {} (max file size: {} MB)",
            root, Math.round(maxFileSizeBytes / 1024.0 / 1024.0 * 100.0) / 100.0);
    }

    @GetMapping
    @Operation(summary = "Lister les documents", description = "Retourne la liste de tous les documents, avec filtrage optionnel par catégorie ou statut")
    @ApiResponse(responseCode = "200", description = "Liste des documents", content = @Content(schema = @Schema(implementation = DocumentDto.class)))
    public List<DocumentDto> listDocuments(
        @RequestParam(required = false) UUID category,
        @RequestParam(required = false) String status
    ) {
        List<DocumentEntity> documents;

        if (status == null || status.isBlank()) {
            documents = category == null
                ? documentRepository.findAllByStatusNotOrderByCreatedAtDesc("DELETED")
                : documentRepository.findAllByCategoryIdAndStatusNotOrderByCreatedAtDesc(category, "DELETED");
        } else {
            documents = category == null
                ? documentRepository.findAllByStatusOrderByCreatedAtDesc(status)
                : documentRepository.findAllByCategoryIdAndStatusOrderByCreatedAtDesc(category, status);
        }

        return documents.stream().map(this::toDto).toList();
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Créer un document", description = "Upload un document (PDF, DOCX, TXT, MD, JSON) et l'ajoute à la base de connaissances")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Document créé avec succès", content = @Content(schema = @Schema(implementation = DocumentDto.class))),
        @ApiResponse(responseCode = "400", description = "Fichier invalide ou format non autorisé"),
        @ApiResponse(responseCode = "413", description = "Fichier trop volumineux")
    })
    public DocumentDto createDocument(
        @RequestParam("file") MultipartFile file,
        @RequestParam("categoryId") UUID categoryId
    ) throws IOException {

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le fichier est vide");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nom de fichier invalide");
        }
        String safeFilename = StringUtils.cleanPath(originalFilename);
        if (safeFilename.contains("..")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nom de fichier non autorisé");
        }

        String ext = extractExtension(safeFilename).toLowerCase(Locale.ROOT);
        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Type de fichier non autorisé. Extensions acceptées: " + ALLOWED_EXTENSIONS);
        }

        String mimeType = file.getContentType() == null ? "" : file.getContentType();
        String normalizedMime = mimeType.toLowerCase(Locale.ROOT).trim();
        if (!isAllowedMimeType(normalizedMime, ext)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Type MIME non autorisé (" + mimeType + "). Types acceptés: PDF, DOCX, TXT, MD, JSON");
        }

        long size = file.getSize();
        if (size > maxFileSizeBytes) {
            double sizeMb = Math.round(size / 1024.0 / 1024.0 * 100.0) / 100.0;
            double maxMb = Math.round(maxFileSizeBytes / 1024.0 / 1024.0 * 100.0) / 100.0;
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,
                "Fichier trop volumineux (" + sizeMb + " MB). Taille maximum autorisée: " + maxMb + " MB");
        }

        CategoryEntity category = categoryRepository.findById(categoryId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Catégorie introuvable"));

        Path root = Paths.get(documentsDir).toAbsolutePath().normalize();
        Files.createDirectories(root);

        String storedFilename = UUID.randomUUID() + "-" + safeFilename;
        Path target = root.resolve(storedFilename).normalize();

        if (!target.startsWith(root)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chemin de stockage invalide");
        }

        file.transferTo(target.toFile());
        LOGGER.info("Document stocké: {} -> {} ({} octets, {})",
            safeFilename, target.getFileName(), size, normalizedMime);

        DocumentEntity document = new DocumentEntity();
        document.setCategory(category);
        document.setTitle(safeFilename);
        document.setFilePath(target.toString());
        document.setStatus("PENDING");
        document.setCreatedAt(LocalDateTime.now());

        DocumentEntity saved = documentRepository.save(document);
        LOGGER.info("Document #{} créé en BDD. Déclenchement traitement asynchrone...", saved.getId());
        documentProcessingService.processDocument(saved.getId());

        return toDto(saved);
    }

    @GetMapping("/{id}")
    public DocumentDto getDocument(@PathVariable UUID id) {
        return toDto(findDocument(id));
    }

    @PutMapping("/{id}")
    public DocumentDto updateDocument(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        DocumentEntity document = findDocument(id);

        Object statusValue = body.get("status");
        if (statusValue != null) {
            String newStatus = statusValue.toString().trim().toUpperCase(Locale.ROOT);
            document.setStatus(newStatus);

            if ("INDEXING".equals(newStatus) || "ACTIVE".equals(newStatus)) {
                LOGGER.info("Reprise indexation manuelle document #{}", id);
                documentProcessingService.processDocument(document.getId());
            }
        }

        Object categoryIdValue = body.get("categoryId");
        if (categoryIdValue != null) {
            UUID categoryId = UUID.fromString(categoryIdValue.toString());
            CategoryEntity category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Catégorie introuvable"));
            document.setCategory(category);
        }

        return toDto(documentRepository.save(document));
    }

    @DeleteMapping("/{id}")
    @Transactional
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDocument(@PathVariable UUID id) {
        DocumentEntity document = findDocument(id);
        document.setStatus("DELETED");
        documentRepository.save(document);
        LOGGER.info("Document #{} marqué comme DELETED", id);
    }

    @PostMapping("/{id}/reindex")
    public DocumentDto reindexDocument(@PathVariable UUID id) {
        DocumentEntity document = findDocument(id);
        document.setStatus("INDEXING");
        documentRepository.save(document);
        LOGGER.info("Réindexation manuelle document #{} déclenchée", id);
        documentProcessingService.processDocument(document.getId());
        return toDto(document);
    }

    private DocumentEntity findDocument(UUID id) {
        return documentRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document introuvable"));
    }

    private DocumentDto toDto(DocumentEntity document) {
        CategoryEntity category = document.getCategory();
        return new DocumentDto(
            document.getId(),
            category.getId(),
            document.getTitle(),
            document.getFilePath(),
            document.getStatus(),
            document.getCreatedAt(),
            new CategorySummaryDto(category.getId(), category.getName())
        );
    }

    private boolean isAllowedMimeType(String mime, String extension) {
        if (ALLOWED_MIME_TYPES.contains(mime)) return true;
        if (mime == null || mime.isBlank() || mime.equals("application/octet-stream")) {
            return ALLOWED_EXTENSIONS.contains(extension);
        }
        if (mime.startsWith("text/") && (".txt".equals(extension) || ".md".equals(extension))) {
            return true;
        }
        return false;
    }

    private static String extractExtension(String filename) {
        int i = filename.lastIndexOf('.');
        return i >= 0 ? filename.substring(i) : "";
    }
}

record DocumentDto(
    UUID id,
    UUID categoryId,
    String title,
    String filePath,
    String status,
    LocalDateTime createdAt,
    CategorySummaryDto category
) {
}

record CategorySummaryDto(UUID id, String name) {
}
