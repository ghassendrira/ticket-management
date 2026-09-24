package com.example.ragbackend.conversation;

import com.example.ragbackend.customer.CustomerRepository;
import com.example.ragbackend.document.ChunkRepository;
import com.example.ragbackend.document.DocumentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ConversationApiTest {

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        ConversationApi controller = new ConversationApi(
            mock(ConversationRepository.class),
            mock(MessageRepository.class),
            mock(DocumentRepository.class),
            mock(ChunkRepository.class),
            mock(CustomerRepository.class)
        );

        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        mockMvc = MockMvcBuilders
            .standaloneSetup(controller)
            .setValidator(validator)
            .build();
    }

    @Test
    void addMessageRejectsBlankContent() throws Exception {
        mockMvc.perform(
                post("/api/conversations/00000000-0000-0000-0000-000000000000/messages")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"content\":\"\",\"role\":\"USER\",\"confidence\":0.9}")
            )
            .andExpect(status().isBadRequest());
    }
}