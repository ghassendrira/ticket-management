package com.example.ragbackend.document.extract;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

@Component
public class PdfExtractor implements DocumentExtractor {

    private static final Logger LOGGER = LoggerFactory.getLogger(PdfExtractor.class);

    @Override
    public boolean supports(String mimeType) {
        if (mimeType == null) return false;
        String mt = mimeType.toLowerCase();
        return mt.equals("application/pdf")
            || mt.equals("application/x-pdf");
    }

    @Override
    public ExtractedDocument extract(Path filePath) throws IOException {
        List<ExtractedDocument.DocumentFragment> fragments = new ArrayList<>();

        try (PDDocument document = Loader.loadPDF(filePath.toFile())) {
            int totalPages = document.getNumberOfPages();
            LOGGER.info("PDF extraction: {} pages", totalPages);

            for (int pageIdx = 0; pageIdx < totalPages; pageIdx++) {
                int pageNumber = pageIdx + 1;
                PDFTextStripper stripper = new PDFTextStripper();
                stripper.setStartPage(pageNumber);
                stripper.setEndPage(pageNumber);
                String pageText = stripper.getText(document);

                if (pageText != null && !pageText.isBlank()) {
                    fragments.add(new ExtractedDocument.DocumentFragment(
                        pageText,
                        pageNumber,
                        null
                    ));
                }
            }
        }

        return new ExtractedDocument(List.copyOf(fragments));
    }
}
