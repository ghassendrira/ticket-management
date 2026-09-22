import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { ConversationService } from './conversation.service';

describe('ConversationService', () => {
  let service: ConversationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()]
    });
    service = TestBed.inject(ConversationService);
  });

  it('retourne des conversations mockees', (done) => {
    service.listConversations().subscribe((conversations) => {
      expect(conversations.length).toBeGreaterThan(0);
      done();
    });
  });

  it('cree une conversation puis ajoute une reponse assistant', (done) => {
    service.createConversation().subscribe((conversation) => {
      service.sendMessage(conversation.id, 'Comment changer mon mot de passe ?').subscribe((updated) => {
        expect(updated.messages.length).toBe(2);
        expect(updated.messages[1].role).toBe('ASSISTANT');
        done();
      });
    });
  });
});
