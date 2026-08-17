package com.ticketmanagement.aiservice.controller;

import com.ticketmanagement.aiservice.dto.TranslateTextRequest;
import com.ticketmanagement.aiservice.dto.TranslationResponse;
import com.ticketmanagement.aiservice.service.AiTranslationService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class AiTranslationController {

    private static final Logger log = LoggerFactory.getLogger(AiTranslationController.class);

    private final AiTranslationService aiTranslationService;

    public AiTranslationController(AiTranslationService aiTranslationService) {
        this.aiTranslationService = aiTranslationService;
    }

    @PostMapping("/translate")
    public ResponseEntity<TranslationResponse> translate(
            @Valid @RequestBody TranslateTextRequest request) {

        log.info("Received translation request for language: {}", request.targetLanguageCode());
        TranslationResponse response = aiTranslationService.translateText(
                request.text(),
                request.targetLanguageCode(),
                request.targetLanguageName()
        );
        return ResponseEntity.ok(response);
    }
}
