package com.example.ragbackend.document.extract;

import java.util.ArrayList;
import java.util.List;

public record ExtractedDocument(
    List<DocumentFragment> fragments
) {
    public static ExtractedDocument empty() {
        return new ExtractedDocument(List.of());
    }

    public String getFullText() {
        return fragments.stream()
            .map(DocumentFragment::content)
            .filter(s -> s != null && !s.isBlank())
            .reduce((a, b) -> a + "\n\n" + b)
            .orElse("");
    }

    public List<DocumentFragment> getNonEmptyFragments() {
        List<DocumentFragment> nonEmpty = new ArrayList<>();
        for (DocumentFragment f : fragments) {
            if (f.content() != null && !f.content().trim().isBlank()) {
                nonEmpty.add(new DocumentFragment(
                    f.content().trim(),
                    f.pageNumber(),
                    f.section()
                ));
            }
        }
        return List.copyOf(nonEmpty);
    }

    public record DocumentFragment(
        String content,
        Integer pageNumber,
        String section
    ) {}
}
