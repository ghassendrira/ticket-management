package com.ticketmanagement.ticketservice.service;

import com.ticketmanagement.ticketservice.exception.FileTooLargeException;
import com.ticketmanagement.ticketservice.exception.InvalidFileTypeException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final long MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB in bytes
    private static final List<String> ALLOWED_MIME_TYPES = List.of(
            "application/pdf",
            "image/png",
            "image/jpeg",
            "image/jpg",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/plain"
    );

    private final Path baseUploadDir;

    public FileStorageService(@Value("${app.upload.base-dir:./uploads}") String baseUploadDirPath) {
        this.baseUploadDir = Paths.get(baseUploadDirPath).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.baseUploadDir);
        } catch (IOException e) {
            throw new RuntimeException("Could not create base upload directory: " + e.getMessage(), e);
        }
    }

    public String storeFile(MultipartFile file, UUID ticketId) throws IOException {
        // Validate file size
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new FileTooLargeException("File size exceeds maximum allowed (20 MB)");
        }

        // Validate file type
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType)) {
            throw new InvalidFileTypeException("Invalid file type. Allowed types: PDF, images, Word, Excel, text files.");
        }

        // Create ticket-specific directory if doesn't exist
        Path ticketDir = baseUploadDir.resolve("tickets").resolve(ticketId.toString());
        Files.createDirectories(ticketDir);

        // Generate stored file name
        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        String storedFileName = UUID.randomUUID() + extension;
        Path targetPath = ticketDir.resolve(storedFileName);

        // Copy the file
        Files.copy(file.getInputStream(), targetPath);

        // Return relative path for DB
        return Paths.get("tickets").resolve(ticketId.toString()).resolve(storedFileName).toString();
    }

    public Resource loadFileAsResource(String relativeFilePath) throws MalformedURLException {
        Path filePath = baseUploadDir.resolve(relativeFilePath).normalize();
        Resource resource = new UrlResource(filePath.toUri());
        if (!resource.exists() || !resource.isReadable()) {
            throw new RuntimeException("Could not read file: " + relativeFilePath);
        }
        return resource;
    }

    public void deleteFile(String relativeFilePath) throws IOException {
        Path filePath = baseUploadDir.resolve(relativeFilePath).normalize();
        Files.deleteIfExists(filePath);
    }
}
