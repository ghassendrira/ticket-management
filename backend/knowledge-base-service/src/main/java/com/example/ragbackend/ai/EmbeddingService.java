package com.example.ragbackend.ai;

import com.example.ragbackend.exception.EmbeddingGenerationException;
import com.example.ragbackend.exception.OllamaUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
public class EmbeddingService {

    private static final Logger LOGGER = LoggerFactory.getLogger(EmbeddingService.class);
    private static final int EXPECTED_DIMENSION = 768;

    private final RestTemplate restTemplate;
    private final String ollamaBaseUrl;
    private final String embeddingModel;

    public EmbeddingService(
        RestTemplate restTemplate,
        @Value("${rag.ollama.base-url:http://localhost:11434}") String ollamaBaseUrl,
        @Value("${rag.ollama.embedding-model:nomic-embed-text}") String embeddingModel
    ) {
        this.restTemplate = restTemplate;
        this.ollamaBaseUrl = ollamaBaseUrl.endsWith("/")
            ? ollamaBaseUrl.substring(0, ollamaBaseUrl.length() - 1)
            : ollamaBaseUrl;
        this.embeddingModel = embeddingModel;
        LOGGER.info("EmbeddingService: baseUrl={}, model={}", this.ollamaBaseUrl, this.embeddingModel);
    }

    public float[] embed(String text) {
        if (text == null || text.isBlank()) {
            throw new IllegalArgumentException("Cannot embed empty text");
        }
        List<float[]> result = embedBatch(List.of(text));
        if (result.isEmpty()) {
            throw new EmbeddingGenerationException("Ollama returned empty embedding list");
        }
        return result.get(0);
    }

    public List<float[]> embedBatch(List<String> texts) {
        if (texts == null || texts.isEmpty()) {
            return List.of();
        }

        String endpoint = ollamaBaseUrl + "/api/embed";

        List<float[]> allEmbeddings = new ArrayList<>(texts.size());
        int batchSize = 32;

        for (int i = 0; i < texts.size(); i += batchSize) {
            int end = Math.min(i + batchSize, texts.size());
            List<String> batch = texts.subList(i, end);
            allEmbeddings.addAll(doEmbedBatch(batch, endpoint));
            LOGGER.info("Embedded batch {}-{} / {} texts", i, end - 1, texts.size());
        }

        return Collections.unmodifiableList(allEmbeddings);
    }

    private List<float[]> doEmbedBatch(List<String> batch, String endpoint) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> body = Map.of(
                "model", embeddingModel,
                "input", batch
            );

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(endpoint, request, Map.class);

            if (response == null) {
                throw new EmbeddingGenerationException("Réponse nulle d'Ollama sur " + endpoint);
            }

            Object rawEmbeddings = response.get("embeddings");
            if (!(rawEmbeddings instanceof List<?>)) {
                throw new EmbeddingGenerationException(
                    "Format de réponse invalide: champ 'embeddings' absent ou non liste"
                );
            }

            List<?> embeddingsList = (List<?>) rawEmbeddings;
            if (embeddingsList.size() != batch.size()) {
                LOGGER.warn("Embedding count mismatch: requested={}, received={}",
                    batch.size(), embeddingsList.size());
            }

            List<float[]> result = new ArrayList<>(embeddingsList.size());
            for (int idx = 0; idx < embeddingsList.size(); idx++) {
                Object item = embeddingsList.get(idx);
                float[] vec = convertToVector(item);
                if (vec.length != EXPECTED_DIMENSION) {
                    throw new EmbeddingGenerationException(
                        "Dimension d'embedding invalide: attendu " + EXPECTED_DIMENSION
                            + ", obtenu " + vec.length
                            + " pour le modèle '" + embeddingModel + "'"
                    );
                }
                result.add(vec);
            }

            return result;

        } catch (ResourceAccessException e) {
            throw new OllamaUnavailableException(
                "Ollama est inaccessible sur " + ollamaBaseUrl
                    + ". Vérifiez qu'Ollama est démarré et que le modèle '" + embeddingModel + "' est installé."
                    + " Commande: ollama pull " + embeddingModel,
                e
            );
        } catch (RestClientException e) {
            throw new EmbeddingGenerationException(
                "Erreur réseau lors de l'appel à Ollama: " + e.getMessage(), e
            );
        }
    }

    private float[] convertToVector(Object item) {
        if (!(item instanceof List<?>)) {
            throw new EmbeddingGenerationException("Embedding n'est pas une liste: " + item);
        }
        List<?> values = (List<?>) item;
        float[] vec = new float[values.size()];
        for (int i = 0; i < values.size(); i++) {
            Object v = values.get(i);
            if (!(v instanceof Number)) {
                throw new EmbeddingGenerationException(
                    "Valeur non-numérique dans l'embedding à l'index " + i + ": " + v
                );
            }
            vec[i] = ((Number) v).floatValue();
        }
        return vec;
    }

    public int getExpectedDimension() {
        return EXPECTED_DIMENSION;
    }

    public String getModelName() {
        return embeddingModel;
    }
}
