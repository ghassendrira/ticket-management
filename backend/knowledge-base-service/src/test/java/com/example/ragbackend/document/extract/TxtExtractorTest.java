package com.example.ragbackend.document.extract;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("TxtExtractor Tests")
class TxtExtractorTest {

    private TxtExtractor txtExtractor;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        txtExtractor = new TxtExtractor();
    }

    @Test
    @DisplayName("supports() - text/plain retourne true")
    void supports_textPlain_returnsTrue() {
        assertTrue(txtExtractor.supports("text/plain"));
        assertTrue(txtExtractor.supports("TEXT/PLAIN"));
        assertTrue(txtExtractor.supports("text/markdown"));
        assertTrue(txtExtractor.supports("application/json"));
    }

    @Test
    @DisplayName("supports() - application/pdf retourne false")
    void supports_pdf_returnsFalse() {
        assertFalse(txtExtractor.supports("application/pdf"));
        assertFalse(txtExtractor.supports(null));
    }

    @Test
    @DisplayName("extract() - fichier simple retourne fragments")
    void extract_simpleFile_returnsFragments() throws IOException {
        Path file = tempDir.resolve("simple.txt");
        String content = "Bonjour le monde\n\nCeci est un test.\n\nTroisième paragraphe.";
        Files.writeString(file, content, StandardCharsets.UTF_8);

        ExtractedDocument result = txtExtractor.extract(file);

        assertNotNull(result);
        List<ExtractedDocument.DocumentFragment> fragments = result.getNonEmptyFragments();
        assertFalse(fragments.isEmpty());
        assertTrue(result.getFullText().contains("Bonjour le monde"));
    }

    @Test
    @DisplayName("extract() - fichier vide retourne empty()")
    void extract_emptyFile_returnsEmpty() throws IOException {
        Path file = tempDir.resolve("empty.txt");
        Files.writeString(file, "   \n\n  \n  ", StandardCharsets.UTF_8);

        ExtractedDocument result = txtExtractor.extract(file);

        assertNotNull(result);
        assertTrue(result.getNonEmptyFragments().isEmpty());
    }

    @Test
    @DisplayName("extract() - normalise les retours à la ligne CRLF")
    void extract_crlfNormalization() throws IOException {
        Path file = tempDir.resolve("crlf.txt");
        String crlfContent = "Ligne 1\r\n\r\nLigne 2\r\n\r\nLigne 3";
        Files.writeString(file, crlfContent, StandardCharsets.UTF_8);

        ExtractedDocument result = txtExtractor.extract(file);

        String full = result.getFullText();
        assertFalse(full.contains("\r"));
        assertTrue(full.contains("Ligne 1"));
        assertTrue(full.contains("Ligne 3"));
    }

    @Test
    @DisplayName("extract() - contenu long crée plusieurs fragments (pagination)")
    void extract_longContent_multipleFragments() throws IOException {
        Path file = tempDir.resolve("long.txt");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 200; i++) {
            sb.append("Paragraphe numéro ").append(i).append(" contenant plusieurs mots pour tester.\n\n");
        }
        Files.writeString(file, sb.toString(), StandardCharsets.UTF_8);

        ExtractedDocument result = txtExtractor.extract(file);

        List<ExtractedDocument.DocumentFragment> fragments = result.getNonEmptyFragments();
        assertTrue(fragments.size() >= 2,
            "Attendu au moins 2 fragments pour un long contenu, obtenu: " + fragments.size());

        for (int i = 0; i < fragments.size(); i++) {
            assertNotNull(fragments.get(i).pageNumber());
            assertEquals(i + 1, fragments.get(i).pageNumber(),
                "Les numéros de page doivent être séquentiels à partir de 1");
        }
    }

    @Test
    @DisplayName("getFullText() - concatene tous les fragments")
    void getFullText_concatenatesAllFragments() throws IOException {
        Path file = tempDir.resolve("fulltext.txt");
        String part1 = "PREMIERE_PARTIE";
        String part2 = "DEUXIEME_PARTIE";
        Files.writeString(file, part1 + "\n\n" + part2, StandardCharsets.UTF_8);

        ExtractedDocument result = txtExtractor.extract(file);

        String full = result.getFullText();
        assertTrue(full.contains("PREMIERE_PARTIE"));
        assertTrue(full.contains("DEUXIEME_PARTIE"));
    }
}
