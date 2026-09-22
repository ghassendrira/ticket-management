package com.example.ragbackend.document.chunk;

import com.example.ragbackend.document.extract.ExtractedDocument;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class TextChunker {

    private static final Logger LOGGER = LoggerFactory.getLogger(TextChunker.class);

    private final int chunkSizeWords;
    private final int chunkOverlapWords;

    public TextChunker(
        @Value("${rag.chunk.size:500}") int chunkSizeWords,
        @Value("${rag.chunk.overlap:100}") int chunkOverlapWords
    ) {
        this.chunkSizeWords = chunkSizeWords;
        this.chunkOverlapWords = Math.max(0, Math.min(chunkOverlapWords, chunkSizeWords / 2));
        LOGGER.info("TextChunker configured: size={} words, overlap={} words", this.chunkSizeWords, this.chunkOverlapWords);
    }

    public List<Chunk> chunk(ExtractedDocument extracted) {
        List<Chunk> allChunks = new ArrayList<>();
        int chunkOrder = 0;

        List<ExtractedDocument.DocumentFragment> fragments = extracted.getNonEmptyFragments();
        if (fragments.isEmpty()) {
            LOGGER.warn("TextChunker: no fragments to chunk");
            return List.of();
        }

        for (ExtractedDocument.DocumentFragment fragment : fragments) {
            String section = fragment.section();
            Integer pageNumber = fragment.pageNumber();
            String content = fragment.content();

            List<String> paragraphChunks = splitIntoParagraphPreservingChunks(content);

            StringBuilder buffer = new StringBuilder();
            int bufferWords = 0;
            String lastOverlapText = "";
            int lastOverlapWordCount = 0;

            for (String paragraph : paragraphChunks) {
                int paragraphWords = countWords(paragraph);
                if (paragraphWords == 0) continue;

                if (bufferWords + paragraphWords <= chunkSizeWords) {
                    if (buffer.length() > 0) buffer.append("\n\n");
                    buffer.append(paragraph);
                    bufferWords += paragraphWords;
                } else {
                    if (bufferWords > 0) {
                        allChunks.add(new Chunk(
                            buffer.toString().trim(),
                            chunkOrder++,
                            section,
                            pageNumber
                        ));

                        lastOverlapText = extractTrailingWords(buffer.toString(), chunkOverlapWords);
                        lastOverlapWordCount = countWords(lastOverlapText);

                        buffer.setLength(0);
                        if (lastOverlapWordCount > 0) {
                            buffer.append(lastOverlapText);
                            bufferWords = lastOverlapWordCount;
                        } else {
                            bufferWords = 0;
                        }
                    }

                    if (paragraphWords > chunkSizeWords) {
                        List<Chunk> bigParagraphChunks = splitLargeParagraph(
                            paragraph, chunkOrder, section, pageNumber
                        );
                        for (Chunk c : bigParagraphChunks) {
                            allChunks.add(c);
                            chunkOrder++;
                        }
                        buffer.setLength(0);
                        bufferWords = 0;
                    } else {
                        if (buffer.length() > 0) buffer.append("\n\n");
                        buffer.append(paragraph);
                        bufferWords += paragraphWords;
                    }
                }
            }

            if (bufferWords > 0) {
                allChunks.add(new Chunk(
                    buffer.toString().trim(),
                    chunkOrder++,
                    section,
                    pageNumber
                ));
            }
        }

        LOGGER.info("TextChunker produced {} chunks from {} fragments", allChunks.size(), fragments.size());
        return List.copyOf(allChunks);
    }

    private List<String> splitIntoParagraphPreservingChunks(String text) {
        if (text == null || text.isBlank()) return List.of();
        String normalized = text.replace("\r\n", "\n").replace("\r", "\n").trim();
        String[] parts = normalized.split("\\n\\n+");
        List<String> result = new ArrayList<>();
        for (String p : parts) {
            String trimmed = p.trim();
            if (!trimmed.isEmpty()) result.add(trimmed);
        }
        return result;
    }

    private List<Chunk> splitLargeParagraph(String paragraph, int startOrder, String section, Integer page) {
        List<Chunk> result = new ArrayList<>();
        String[] words = paragraph.split("\\s+");
        int totalWords = words.length;
        int order = startOrder;
        int cursor = 0;

        while (cursor < totalWords) {
            int effectiveSize = chunkSizeWords;
            int effectiveOverlap = (cursor > 0) ? Math.min(chunkOverlapWords, cursor) : 0;
            int startIdx = cursor - effectiveOverlap;
            if (startIdx < 0) startIdx = 0;
            int endIdx = Math.min(startIdx + effectiveSize, totalWords);

            StringBuilder sb = new StringBuilder();
            for (int i = startIdx; i < endIdx; i++) {
                if (sb.length() > 0) sb.append(" ");
                sb.append(words[i]);
            }

            result.add(new Chunk(sb.toString().trim(), order++, section, page));

            if (endIdx == totalWords) break;
            cursor = startIdx + effectiveSize;
            if (cursor >= totalWords) break;
        }

        return result;
    }

    private int countWords(String text) {
        if (text == null || text.isBlank()) return 0;
        return text.trim().split("\\s+").length;
    }

    private String extractTrailingWords(String text, int wordCount) {
        if (text == null || text.isBlank() || wordCount <= 0) return "";
        String trimmed = text.trim();
        String[] words = trimmed.split("\\s+");
        if (words.length <= wordCount) return trimmed;
        int start = words.length - wordCount;
        StringBuilder sb = new StringBuilder();
        for (int i = start; i < words.length; i++) {
            if (sb.length() > 0) sb.append(" ");
            sb.append(words[i]);
        }
        return sb.toString();
    }

    public record Chunk(
        String content,
        int chunkOrder,
        String section,
        Integer pageNumber
    ) {}
}
