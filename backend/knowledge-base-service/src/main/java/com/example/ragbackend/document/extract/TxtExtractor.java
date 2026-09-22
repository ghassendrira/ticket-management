package com.example.ragbackend.document.extract;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

@Component
public class TxtExtractor implements DocumentExtractor {

    private static final Logger LOGGER = LoggerFactory.getLogger(TxtExtractor.class);

    @Override
    public boolean supports(String mimeType) {
        if (mimeType == null) return false;
        String mt = mimeType.toLowerCase();
        return mt.startsWith("text/")
            || mt.equals("application/json")
            || mt.equals("application/x-empty");
    }

    @Override
    public ExtractedDocument extract(Path filePath) throws IOException {
        String raw = Files.readString(filePath, StandardCharsets.UTF_8);
        if (raw == null || raw.isBlank()) {
            LOGGER.warn("TXT extraction: file is empty");
            return ExtractedDocument.empty();
        }

        String normalized = raw.replace("\r\n", "\n").replace("\r", "\n").trim();
        String[] paragraphs = normalized.split("\\n\\n+");

        List<ExtractedDocument.DocumentFragment> fragments = new ArrayList<>();
        StringBuilder currentChunk = new StringBuilder();
        int approxPageLines = 0;
        int pageNumber = 1;

        for (String paragraph : paragraphs) {
            String trimmed = paragraph.trim();
            if (trimmed.isEmpty()) continue;

            if (currentChunk.length() > 0) {
                currentChunk.append("\n\n");
            }
            currentChunk.append(trimmed);
            approxPageLines += trimmed.split("\\n").length;

            if (approxPageLines >= 60) {
                fragments.add(new ExtractedDocument.DocumentFragment(
                    currentChunk.toString(),
                    pageNumber,
                    null
                ));
                currentChunk.setLength(0);
                approxPageLines = 0;
                pageNumber++;
            }
        }

        if (currentChunk.length() > 0) {
            fragments.add(new ExtractedDocument.DocumentFragment(
                currentChunk.toString(),
                pageNumber,
                null
            ));
        }

        LOGGER.info("TXT extraction: {} fragments", fragments.size());
        return new ExtractedDocument(List.copyOf(fragments));
    }
}
