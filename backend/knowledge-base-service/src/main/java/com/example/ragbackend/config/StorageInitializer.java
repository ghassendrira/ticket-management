package com.example.ragbackend.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Component
public class StorageInitializer {

    private final String documentsDir;

    public StorageInitializer(@Value("${app.storage.documents-dir:uploads}") String documentsDir) {
        this.documentsDir = documentsDir;
    }

    @PostConstruct
    public void init() throws IOException {
        Path root = Paths.get(documentsDir).toAbsolutePath().normalize();
        Files.createDirectories(root);
    }
}
