package com.example.ragbackend.ai;

import com.example.ragbackend.ai.dto.*;
import com.example.ragbackend.exception.ErrorResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/ai")
@Tag(
    name = "IA RAG Engine",
    description = "Endpoints principaux du moteur Retrieval-Augmented Generation: recherche sémantique, questions/réponses et synthèse d'escalade"
)
public class AiController {

    private static final Logger LOGGER = LoggerFactory.getLogger(AiController.class);

    private final RagService ragService;

    public AiController(RagService ragService) {
        this.ragService = ragService;
    }

    @PostMapping("/ask")
    @Operation(
        summary = "Poser une question (pipeline RAG complet)",
        description = "Pipeline complet en 4 étapes: (1) Génération de l'embedding de la question, (2) Recherche vectorielle top-K dans pgvector avec seuil de similarité, (3) Calcul du score de confiance pondéré, (4) Génération de la réponse par le LLM avec contexte documentaire. Retourne answered=false si l'information n'est pas présente de manière fiable.",
        operationId = "askAiRag"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Réponse générée (answered=true) ou refus poli (answered=false)",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = AskResponse.class),
                examples = {
                    @ExampleObject(
                        name = "Réponse trouvée",
                        value = """
                        {
                          "answer": "Pour réinitialiser votre mot de passe, cliquez sur 'Mot de passe oublié' sur la page de connexion, saisissez votre email. Un lien valide 15 minutes vous sera envoyé.",
                          "confidence": 0.88,
                          "sources": [
                            {"documentId": "a1b2c3d4-1234-5678-90ab-cdef01234567", "title": "Guide MDP", "section": "Procédure", "page": 1}
                          ],
                          "answered": true
                        }
                        """
                    ),
                    @ExampleObject(
                        name = "Information absente",
                        value = """
                        {
                          "answer": "Je ne trouve pas de réponse dans la base documentaire. Veuillez reformuler votre question ou demander à être transféré vers un agent humain.",
                          "confidence": 0.0,
                          "sources": [],
                          "answered": false
                        }
                        """
                    )
                }
            )
        ),
        @ApiResponse(responseCode = "400", description = "Question vide ou mal formée",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(responseCode = "503", description = "Ollama indisponible (embedding ou LLM)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(responseCode = "504", description = "Timeout LLM",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(responseCode = "500", description = "Erreur interne",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public AskResponse ask(
        @Valid @RequestBody
        @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Question à poser au système RAG",
            required = true,
            content = @Content(examples = {
                @ExampleObject(value = "{\"question\": \"Comment réinitialiser mon mot de passe ?\"}")
            })
        )
        AiAskRequest request
    ) {
        LOGGER.info("[AiController] POST /api/ai/ask - question length={}",
            request.question() == null ? 0 : request.question().length());

        RagAnswer answer = ragService.ask(request.question());

        AskResponse response = new AskResponse(
            answer.answer(),
            answer.confidence(),
            answer.sources(),
            answer.answered()
        );

        LOGGER.info("[AiController] POST /api/ai/ask - answered={}, confidence={:.3f}, sources={}",
            response.answered(), response.confidence(), response.sources().size());

        return response;
    }

    @PostMapping("/search")
    @Operation(
        summary = "Recherche sémantique uniquement",
        description = "Retourne la liste des chunks les plus similaires sans appeler le LLM. Utile pour déboguer la pertinence de la recherche vectorielle avant génération de réponse. Les résultats sont classés par similarité décroissante.",
        operationId = "semanticSearchOnly"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Liste des chunks pertinents (peut être vide)",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = SemanticSearchResponse.class),
                examples = @ExampleObject(
                    value = """
                    {
                      "results": [
                        {
                          "documentId": "a1b2c3d4-1234-5678-90ab-cdef01234567",
                          "documentTitle": "Guide réinitialisation MDP",
                          "page": 1,
                          "section": "Étapes",
                          "content": "Cliquez sur mot de passe oublié puis saisissez votre email...",
                          "similarity": 0.92
                        }
                      ]
                    }
                    """
                )
            )
        ),
        @ApiResponse(responseCode = "400", description = "Question vide",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(responseCode = "503", description = "Ollama indisponible (embedding)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(responseCode = "500", description = "Erreur interne",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public SemanticSearchResponse search(
        @Valid @RequestBody
        @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Question pour la recherche sémantique",
            required = true,
            content = @Content(examples = {
                @ExampleObject(value = "{\"question\": \"mot de passe oublié\"}")
            })
        )
        AiAskRequest request
    ) {
        LOGGER.info("[AiController] POST /api/ai/search - question length={}",
            request.question() == null ? 0 : request.question().length());

        List<SearchResultDto> results = ragService.search(request.question());

        List<ChunkResult> mapped = results.stream()
            .map(r -> new ChunkResult(
                r.documentId(),
                r.documentTitle(),
                r.page(),
                r.content(),
                r.similarity()
            ))
            .toList();

        LOGGER.info("[AiController] POST /api/ai/search - {} résultats", mapped.size());
        return new SemanticSearchResponse(mapped);
    }

    @PostMapping("/summarize-escalation")
    @Operation(
        summary = "Résumer une conversation pour escalade",
        description = "Récupère l'historique d'une conversation par son UUID et demande au LLM de produire un résumé structuré destiné à créer un ticket de support. Retourne un résumé textuel multi-parties.",
        operationId = "summarizeEscalation"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Résumé généré avec succès",
            content = @Content(
                mediaType = "application/json",
                examples = @ExampleObject(
                    value = """
                    {
                      "summary": "1. Problème principal: Client n'a pas reçu l'email de réinitialisation MDP\\n2. Tentatives: Vérification adresse, dossier spam\\n3. Sentiment: Client frustré, bloqué sur connexion"
                    }
                    """
                )
            )
        ),
        @ApiResponse(responseCode = "400", description = "conversationId absent ou UUID invalide",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(responseCode = "404", description = "Conversation introuvable",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(responseCode = "503", description = "Ollama indisponible",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(responseCode = "500", description = "Erreur interne",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public Map<String, String> summarizeEscalation(
        @Valid @RequestBody
        @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "ID de la conversation (UUID)",
            required = true,
            content = @Content(examples = {
                @ExampleObject(value = "{\"conversationId\": \"b2c3d4e5-2345-6789-0bcd-efa123456789\"}")
            })
        )
        EscalationSummaryRequest request
    ) {
        UUID conversationId = request.conversationId();
        LOGGER.info("[AiController] POST /api/ai/summarize-escalation - conversationId={}", conversationId);

        String summary;
        try {
            summary = ragService.summarizeForEscalation(conversationId);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }

        if (summary == null || summary.isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Impossible de générer le résumé d'escalade");
        }

        return Map.of("summary", summary);
    }

    public record AiAskRequest(
        @jakarta.validation.constraints.NotBlank(message = "La question est obligatoire")
        String question
    ) {}

    public record ChunkResult(
        UUID documentId,
        String title,
        Integer page,
        String content,
        double score
    ) {}

    public record SemanticSearchResponse(
        List<ChunkResult> results
    ) {}
}
