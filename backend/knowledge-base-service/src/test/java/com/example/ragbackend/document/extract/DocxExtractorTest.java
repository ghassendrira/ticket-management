package com.example.ragbackend.document.extract;

import org.apache.poi.xwpf.usermodel.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("DocxExtractor Tests")
class DocxExtractorTest {

    private DocxExtractor docxExtractor;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        docxExtractor = new DocxExtractor();
    }

    @Test
    @DisplayName("supports() - DOCX MIME retourne true")
    void supports_docxMime_returnsTrue() {
        assertTrue(docxExtractor.supports("application/vnd.openxmlformats-officedocument.wordprocessingml.document"));
        assertTrue(docxExtractor.supports("application/msword"));
        assertTrue(docxExtractor.supports("application/vnd.oasis.opendocument.text"));
    }

    @Test
    @DisplayName("supports() - text/plain retourne false")
    void supports_plainText_returnsFalse() {
        assertFalse(docxExtractor.supports("text/plain"));
        assertFalse(docxExtractor.supports("application/pdf"));
        assertFalse(docxExtractor.supports(null));
    }

    @Test
    @DisplayName("extract() - DOCX simple retourne fragments non vides")
    void extract_simpleDocx_returnsFragments() throws IOException {
        Path file = tempDir.resolve("simple.docx");
        try (XWPFDocument doc = new XWPFDocument()) {
            XWPFParagraph p1 = doc.createParagraph();
            setHeadingStyle(doc, p1, "Heading1");
            XWPFRun r1 = p1.createRun();
            r1.setText("Mon Titre");

            XWPFParagraph p2 = doc.createParagraph();
            XWPFRun r2 = p2.createRun();
            r2.setText("Contenu du premier paragraphe avec des informations importantes.");

            XWPFParagraph p3 = doc.createParagraph();
            XWPFRun r3 = p3.createRun();
            r3.setText("Deuxième paragraphe ajouté pour compléter le document.");

            try (FileOutputStream fos = new FileOutputStream(file.toFile())) {
                doc.write(fos);
            }
        }

        ExtractedDocument result = docxExtractor.extract(file);

        assertNotNull(result);
        List<ExtractedDocument.DocumentFragment> fragments = result.getNonEmptyFragments();
        assertFalse(fragments.isEmpty(), "Le DOCX doit produire au moins un fragment");
        assertTrue(result.getFullText().contains("Mon Titre"), "Doit contenir le titre");
        assertTrue(result.getFullText().contains("informations importantes"), "Doit contenir le contenu");
    }

    @Test
    @DisplayName("extract() - sections (titres) sont détectées")
    void extract_headings_detectedAsSections() throws IOException {
        Path file = tempDir.resolve("headings.docx");
        try (XWPFDocument doc = new XWPFDocument()) {
            addHeading(doc, "Introduction");
            addParagraph(doc, "Texte de l'introduction.");
            addHeading(doc, "Méthodologie");
            addParagraph(doc, "Description détaillée de la méthode utilisée.");
            try (FileOutputStream fos = new FileOutputStream(file.toFile())) {
                doc.write(fos);
            }
        }

        ExtractedDocument result = docxExtractor.extract(file);

        List<ExtractedDocument.DocumentFragment> fragments = result.getNonEmptyFragments();
        assertTrue(fragments.size() >= 2, "Au moins 2 fragments attendus pour 2 sections, obtenu: " + fragments.size());

        boolean hasSection = fragments.stream()
            .anyMatch(f -> f.section() != null && !f.section().isBlank());
        assertTrue(hasSection, "Au moins un fragment doit avoir une section détectée");
    }

    @Test
    @DisplayName("extract() - DOCX vide (aucun texte) retourne empty")
    void extract_emptyDocx_returnsEmpty() throws IOException {
        Path file = tempDir.resolve("empty.docx");
        try (XWPFDocument doc = new XWPFDocument()) {
            try (FileOutputStream fos = new FileOutputStream(file.toFile())) {
                doc.write(fos);
            }
        }

        ExtractedDocument result = docxExtractor.extract(file);

        assertTrue(result.getNonEmptyFragments().isEmpty(),
            "Un DOCX vide doit retourner des fragments vides");
    }

    private void addHeading(XWPFDocument doc, String title) {
        XWPFParagraph p = doc.createParagraph();
        setHeadingStyle(doc, p, "Heading1");
        XWPFRun r = p.createRun();
        r.setBold(true);
        r.setText(title);
    }

    private void addParagraph(XWPFDocument doc, String text) {
        XWPFParagraph p = doc.createParagraph();
        XWPFRun r = p.createRun();
        r.setText(text);
    }

    private void setHeadingStyle(XWPFDocument doc, XWPFParagraph paragraph, String styleName) {
        XWPFStyles styles = doc.createStyles();
        try {
            paragraph.setStyle(styleName);
        } catch (Exception ignored) {
        }
    }
}
