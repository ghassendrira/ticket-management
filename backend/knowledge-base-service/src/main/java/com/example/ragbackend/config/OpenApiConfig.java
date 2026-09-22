package com.example.ragbackend.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springdoc.core.customizers.OpenApiCustomizer;

/**
 * OpenAPI Configuration for Swagger/Springdoc
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("IA RAG - Knowledge Base Service API")
                .version("1.0.0")
                .description("API pour la gestion des documents d'entraînement et les recherches sémantiques RAG")
                .license(new License()
                    .name("Apache 2.0")
                    .url("https://www.apache.org/licenses/LICENSE-2.0.html")));
    }

    @Bean
    public OpenApiCustomizer openApiCustomizer() {
        return openApi -> {
            // Clean up any problematic paths if needed
            if (openApi.getPaths() != null) {
                openApi.getPaths().entrySet().removeIf(entry -> 
                    entry.getKey().contains("/error") ||
                    entry.getKey().contains("/actuator")
                );
            }
        };
    }
}
