package com.example.ragbackend.document.extract;

import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFStyles;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

@Component
public class DocxExtractor implements DocumentExtractor {

    private static final Logger LOGGER = LoggerFactory.getLogger(DocxExtractor.class);

    @Override
    public boolean supports(String mimeType) {
        if (mimeType == null) return false;
        String mt = mimeType.toLowerCase();
        return mt.equals("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
            || mt.equals("application/msword")
            || mt.equals("application/vnd.oasis.opendocument.text");
    }

    @Override
    public ExtractedDocument extract(Path filePath) throws IOException {
        List<ExtractedDocument.DocumentFragment> fragments = new ArrayList<>();
        StringBuilder currentSectionContent = new StringBuilder();
        String currentSection = null;
        int paragraphCount = 0;

        try (FileInputStream fis = new FileInputStream(filePath.toFile());
             XWPFDocument document = new XWPFDocument(fis)) {

            XWPFStyles styles = document.getStyles();
            int sectionPage = 1;

            for (XWPFParagraph paragraph : document.getParagraphs()) {
                String text = paragraph.getText();
                String styleName = paragraph.getStyle() != null ? paragraph.getStyle() : null;

                boolean isHeading = false;
                String headingSection = null;
                if (styleName != null && styles != null && styles.getStyle(styleName) != null) {
                    String styleLower = styleName.toLowerCase();
                    if (styleLower.startsWith("heading") || styleLower.contains("titre") || styleLower.startsWith("title")) {
                        isHeading = true;
                        headingSection = text != null ? text.trim() : null;
                    }
                }

                if (paragraph.getStyleID() != null) {
                    String sid = paragraph.getStyleID().toLowerCase();
                    if (sid.startsWith("heading") || sid.startsWith("titre")) {
                        isHeading = true;
                        if (headingSection == null) {
                            headingSection = text != null ? text.trim() : null;
                        }
                    }
                }

                if (isHeading && headingSection != null && !headingSection.isEmpty()) {
                    if (!currentSectionContent.isEmpty()) {
                        fragments.add(new ExtractedDocument.DocumentFragment(
                            currentSectionContent.toString().trim(),
                            sectionPage,
                            currentSection
                        ));
                        currentSectionContent.setLength(0);
                    }
                    currentSection = headingSection;
                    paragraphCount = 0;
                }

                if (text != null && !text.isBlank()) {
                    if (currentSectionContent.length() > 0) {
                        currentSectionContent.append("\n");
                    }
                    currentSectionContent.append(text.trim());
                    paragraphCount++;
                }
            }

            if (!currentSectionContent.isEmpty()) {
                fragments.add(new ExtractedDocument.DocumentFragment(
                    currentSectionContent.toString().trim(),
                    1,
                    currentSection
                ));
            }
        }

        LOGGER.info("DOCX extraction: {} fragments", fragments.size());
        return new ExtractedDocument(List.copyOf(fragments));
    }
}
