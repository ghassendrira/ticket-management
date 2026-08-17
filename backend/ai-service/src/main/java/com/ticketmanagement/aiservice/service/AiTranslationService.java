package com.ticketmanagement.aiservice.service;

import com.ticketmanagement.aiservice.dto.TranslationResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class AiTranslationService {

    private static final Logger log = LoggerFactory.getLogger(AiTranslationService.class);

    private final OllamaService ollamaService;

    public AiTranslationService(OllamaService ollamaService) {
        this.ollamaService = ollamaService;
    }

    public TranslationResponse translateText(String text, String targetLanguageCode, String targetLanguageName) {
        log.info("Translating ticket text to {}", targetLanguageCode);
        String translatedText = ollamaService.translateText(text, targetLanguageName);
        return new TranslationResponse(translatedText, targetLanguageCode, targetLanguageName, "Qwen");
    }
}
