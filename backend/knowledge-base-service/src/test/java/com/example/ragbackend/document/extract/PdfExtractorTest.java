package com.example.ragbackend.document.extract;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("PdfExtractor Tests")
class PdfExtractorTest {

    private PdfExtractor pdfExtractor;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        pdfExtractor = new PdfExtractor();
    }

    @Test
    @DisplayName("supports() - application/pdf retourne true")
    void supports_pdfMimeType_returnsTrue() {
        assertTrue(pdfExtractor.supports("application/pdf"));
        assertTrue(pdfExtractor.supports("application/x-pdf"));
        assertTrue(pdfExtractor.supports("APPLICATION/PDF"));
    }

    @Test
    @DisplayName("supports() - autres MIME retournent false")
    void supports_nonPdfMime_returnsFalse() {
        assertFalse(pdfExtractor.supports("text/plain"));
        assertFalse(pdfExtractor.supports("application/vnd.openxmlformats-officedocument.wordprocessingml.document"));
        assertFalse(pdfExtractor.supports(null));
    }

    @Test
    @DisplayName("extract() - PDF multi-pages retourne fragments par page")
    void extract_multiPagePdf_returnsOneFragmentPerPage() throws IOException {
        Path pdfFile = tempDir.resolve("multi-page.pdf");
        createPdfWithPages(pdfFile, 3, "Texte de la page %d");

        ExtractedDocument result = pdfExtractor.extract(pdfFile);

        assertNotNull(result);
        List<ExtractedDocument.DocumentFragment> fragments = result.getNonEmptyFragments();
        assertEquals(3, fragments.size(), "3 pages = 3 fragments");

        for (int i = 0; i < 3; i++) {
            ExtractedDocument.DocumentFragment frag = fragments.get(i);
            assertEquals(Integer.valueOf(i + 1), frag.pageNumber());
            assertNotNull(frag.content());
            assertFalse(frag.content().isBlank());
        }
    }

    @Test
    @DisplayName("extract() - PDF avec contenu récupérable")
    void extract_pdfContent_readable() throws IOException {
        Path pdfFile = tempDir.resolve("content.pdf");
        String uniqueKeyword = "MOT_CLE_UNIQUE_12345_XYZ";
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                cs.newLineAtOffset(50, 700);
                cs.showText(uniqueKeyword);
                cs.endText();
            }
            doc.save(pdfFile.toFile());
        }

        ExtractedDocument result = pdfExtractor.extract(pdfFile);

        assertTrue(result.getFullText().contains(uniqueKeyword),
            "Le texte extrait doit contenir le mot-clé unique");
    }

    @Test
    @DisplayName("extract() - PDF 1 page avec pageNumber = 1")
    void extract_singlePage_pageNumberIs1() throws IOException {
        Path pdfFile = tempDir.resolve("single.pdf");
        createPdfWithPages(pdfFile, 1, "Single page content");

        ExtractedDocument result = pdfExtractor.extract(pdfFile);

        List<ExtractedDocument.DocumentFragment> fragments = result.getNonEmptyFragments();
        assertEquals(1, fragments.size());
        assertEquals(Integer.valueOf(1), fragments.get(0).pageNumber());
    }

    private void createPdfWithPages(Path file, int pages, String contentTemplate) throws IOException {
        try (PDDocument doc = new PDDocument()) {
            for (int i = 0; i < pages; i++) {
                PDPage page = new PDPage(PDRectangle.A4);
                doc.addPage(page);
                try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                    cs.beginText();
                    cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 14);
                    cs.newLineAtOffset(50, 750);
                    cs.showText(String.format(contentTemplate, (i + 1)));
                    cs.newLineAtOffset(0, -30);
                    cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 11);
                    cs.showText("Paragraphe supplémentaire sur la page " + (i + 1));
                    cs.endText();
                }
            }
            doc.save(file.toFile());
        }
        assertTrue(Files.exists(file));
    }
}
