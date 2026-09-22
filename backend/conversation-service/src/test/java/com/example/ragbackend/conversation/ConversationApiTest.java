package com.example.ragbackend.conversation;

import com.example.conversationservice.ConversationServiceApplication;
import com.example.ragbackend.document.ChunkRepository;
import com.example.ragbackend.document.DocumentRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = ConversationServiceApplication.class)
@AutoConfigureMockMvc
class ConversationApiTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ConversationRepository conversationRepository;

    @MockBean
    private MessageRepository messageRepository;

    @MockBean
    private DocumentRepository documentRepository;

    @MockBean
    private ChunkRepository chunkRepository;

    @Test
    void addMessageAcceptsJsonPayload() throws Exception {
        mockMvc.perform(post("/api/conversations/00000000-0000-0000-0000-000000000000/messages")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"bonjour\",\"role\":\"USER\",\"confidence\":0.9}"))
            .andExpect(status().isBadRequest());
    }
}