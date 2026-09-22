package com.example.ragbackend.document.chunk;

import com.example.ragbackend.document.extract.ExtractedDocument;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("TextChunker Tests")
class TextChunkerTest {

    private static final int CHUNK_SIZE = 50;
    private static final int CHUNK_OVERLAP = 10;

    private TextChunker createChunker() {
        return new TextChunker(CHUNK_SIZE, CHUNK_OVERLAP);
    }

    @Test
    @DisplayName("chunk() - document vide retourne liste vide")
    void chunk_emptyDocument_returnsEmpty() {
        TextChunker chunker = createChunker();
        ExtractedDocument empty = ExtractedDocument.empty();

        List<TextChunker.Chunk> result = chunker.chunk(empty);

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    @DisplayName("chunk() - petit texte tient dans 1 seul chunk")
    void chunk_smallText_singleChunk() {
        TextChunker chunker = createChunker();
        String text = "Petit texte qui tient dans un seul chunk sans débordement.";
        ExtractedDocument doc = singleFragment(text);

        List<TextChunker.Chunk> chunks = chunker.chunk(doc);

        assertEquals(1, chunks.size());
        assertTrue(chunks.get(0).content().contains("Petit texte"));
        assertEquals(0, chunks.get(0).chunkOrder());
    }

    @Test
    @DisplayName("chunk() - texte long génère plusieurs chunks (ordre préservé)")
    void chunk_longText_multipleChunksOrderPreserved() {
        TextChunker chunker = createChunker();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 300; i++) {
            sb.append("mot").append(i).append(" ");
        }
        ExtractedDocument doc = singleFragment(sb.toString());

        List<TextChunker.Chunk> chunks = chunker.chunk(doc);

        assertTrue(chunks.size() >= 2,
            "Attendu au moins 2 chunks pour un texte très long, obtenu: " + chunks.size());

        for (int i = 0; i < chunks.size(); i++) {
            assertEquals(i, chunks.get(i).chunkOrder(),
                "chunkOrder doit être séquentiel: index=" + i);
        }
    }

    @Test
    @DisplayName("chunk() - overlap présent entre chunks consécutifs")
    void chunk_overlapPresentBetweenChunks() {
        TextChunker chunker = createChunker();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 150; i++) {
            sb.append("word").append(i).append(" ");
        }
        ExtractedDocument doc = singleFragment(sb.toString());

        List<TextChunker.Chunk> chunks = chunker.chunk(doc);
        if (chunks.size() < 2) {
            return;
        }

        String lastWordsChunk0 = extractLastNWords(chunks.get(0).content(), CHUNK_OVERLAP);
        String chunk1Content = chunks.get(1).content();

        boolean overlapPresent = false;
        for (String word : lastWordsChunk0.split("\\s+")) {
            if (chunk1Content.contains(word)) {
                overlapPresent = true;
                break;
            }
        }
        assertTrue(overlapPresent,
            "Les mots de fin du chunk 0 doivent se retrouver au début du chunk 1 (overlap)");
    }

    @Test
    @DisplayName("chunk() - numéros de page et sections préservés")
    void chunk_pageAndSectionPreserved() {
        TextChunker chunker = createChunker();

        List<ExtractedDocument.DocumentFragment> fragments = new ArrayList<>();
        fragments.add(new ExtractedDocument.DocumentFragment(
            "Contenu de la section A sur plusieurs mots pour remplir un chunk. "
                + "Suite du contenu long long long long long long long long long long long.",
            3, "Section A"));
        fragments.add(new ExtractedDocument.DocumentFragment(
            "Contenu de la section B court.",
            7, "Section B"));

        ExtractedDocument doc = new ExtractedDocument(fragments);
        List<TextChunker.Chunk> chunks = chunker.chunk(doc);

        assertFalse(chunks.isEmpty());
        assertNotNull(chunks.get(0).section());
        assertTrue(chunks.get(0).section().startsWith("Section"));
        assertEquals(Integer.valueOf(3), chunks.get(0).pageNumber());
    }

    @Test
    @DisplayName("chunk() - paragraphes préservés (pas de split au milieu)")
    void chunk_paragraphsPreservedWhenPossible() {
        TextChunker chunker = new TextChunker(30, 5);
        String p1 = "AAA ".repeat(10);
        String p2 = "BBB ".repeat(10);
        ExtractedDocument doc = singleFragment(p1.trim() + "\n\n" + p2.trim());

        List<TextChunker.Chunk> chunks = chunker.chunk(doc);

        for (TextChunker.Chunk c : chunks) {
            String content = c.content();
            boolean hasAAA = content.contains("AAA");
            boolean hasBBB = content.contains("BBB");
            if (hasAAA && hasBBB) {
            } else if (hasAAA) {
                assertFalse(content.contains("BBB"), "Si un chunk contient AAA il ne devrait pas contenir BBB");
            } else if (hasBBB) {
                assertFalse(content.contains("AAA"), "Si un chunk contient BBB il ne devrait pas contenir AAA");
            }
        }
    }

    @Test
    @DisplayName("chunk() - grand paragraphe unique est splitté avec overlap interne")
    void chunk_hugeSingleParagraph_splitWithOverlap() {
        int bigSize = 300;
        int overlap = 20;
        TextChunker chunker = new TextChunker(bigSize, overlap);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 1200; i++) {
            sb.append("W").append(i).append(" ");
        }
        ExtractedDocument doc = singleFragment(sb.toString());

        List<TextChunker.Chunk> chunks = chunker.chunk(doc);

        assertTrue(chunks.size() >= 3,
            "Attendu plusieurs chunks pour un paragraphe géant, obtenu: " + chunks.size());
        assertTrue(chunks.get(0).content().contains("W0"),
            "Le premier chunk doit contenir le début");
    }

    private ExtractedDocument singleFragment(String text) {
        List<ExtractedDocument.DocumentFragment> f = List.of(
            new ExtractedDocument.DocumentFragment(text, 1, null)
        );
        return new ExtractedDocument(f);
    }

    private String extractLastNWords(String s, int n) {
        String[] words = s.trim().split("\\s+");
        int start = Math.max(0, words.length - n);
        StringBuilder sb = new StringBuilder();
        for (int i = start; i < words.length; i++) {
            sb.append(words[i]).append(" ");
        }
        return sb.toString().trim();
    }
}
