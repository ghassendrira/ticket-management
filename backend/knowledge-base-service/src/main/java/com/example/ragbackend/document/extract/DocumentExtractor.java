package com.example.ragbackend.document.extract;

import java.io.IOException;
import java.nio.file.Path;

public interface DocumentExtractor {

    boolean supports(String mimeType);

    ExtractedDocument extract(Path filePath) throws IOException;
}
