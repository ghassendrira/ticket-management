package com.example.ragbackend.document.extract;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@DisplayName("DocumentExtractorFactory Tests")
class DocumentExtractorFactoryTest {

    @TempDir
    Path tempDir;

    @Test
    @DisplayName("Factory choisit TxtExtractor pour .txt")
    void factory_txt_extractorSelected() throws IOException {
        PdfExtractor pdf = mock(PdfExtractor.class);
        DocxExtractor docx = mock(DocxExtractor.class);
        TxtExtractor txt = new TxtExtractor();
        when(pdf.supports(anyString())).thenReturn(false);
        when(docx.supports(anyString())).thenReturn(false);

        DocumentExtractorFactory factory = new DocumentExtractorFactory(pdf, docx, txt);

        Path f = tempDir.resolve("notes.txt");
        Files.writeString(f, "Bonjour TXT", StandardCharsets.UTF_8);

        ExtractedDocument result = factory.extract(f);
        assertNotNull(result);
        assertTrue(result.getFullText().contains("Bonjour TXT"));
    }

    @Test
    @DisplayName("Factory lance IOException pour type MIME non supporté")
    void factory_unsupportedMime_throws() {
        PdfExtractor pdf = mock(PdfExtractor.class);
        DocxExtractor docx = mock(DocxExtractor.class);
        TxtExtractor txt = mock(TxtExtractor.class);
        when(pdf.supports(anyString())).thenReturn(false);
        when(docx.supports(anyString())).thenReturn(false);
        when(txt.supports(anyString())).thenReturn(false);

        DocumentExtractorFactory factory = new DocumentExtractorFactory(pdf, docx, txt);

        assertThrows(IOException.class, () -> {
            Path f = tempDir.resolve("fichier.xyz123");
            Files.writeString(f, "du contenu");
            factory.extract(f);
        });
    }
}
