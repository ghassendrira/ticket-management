import {
  Category,
  Conversation,
  DashboardData,
  Document,
  Escalation,
  Message
} from '../../models';

const now = new Date();

export const mockCategories: Category[] = [
  {
    id: 'cat-password',
    name: 'Mot de passe',
    description: 'Authentification et acces compte.',
    documentsCount: 4
  },
  {
    id: 'cat-orders',
    name: 'Commandes',
    description: 'Suivi, livraison et retours.',
    documentsCount: 7
  },
  {
    id: 'cat-support',
    name: 'Support',
    description: 'Assistance generale et incident.',
    documentsCount: 5
  }
];

export const mockDocuments: Document[] = [
  {
    id: 'doc-1',
    name: 'Guide reinitialisation mot de passe.pdf',
    categoryId: 'cat-password',
    category: mockCategories[0],
    status: 'INDEXED',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    fileType: 'PDF',
    version: '1.0',
    publicationStatus: 'PUBLISHED',
    active: true,
    chunksCount: 12,
    indexingHistory: [
      { status: 'PENDING', timestamp: new Date(now.getTime() - 86400000).toISOString(), note: 'Document soumis' },
      { status: 'PROCESSING', timestamp: new Date(now.getTime() - 57600000).toISOString(), note: 'Extraction en cours' },
      { status: 'INDEXED', timestamp: now.toISOString(), note: 'Indexation terminee' }
    ]
  },
  {
    id: 'doc-2',
    name: 'Procedure suivi de commande.pdf',
    categoryId: 'cat-orders',
    category: mockCategories[1],
    status: 'FAILED',
    createdAt: new Date(now.getTime() - 86400000).toISOString(),
    updatedAt: new Date(now.getTime() - 43200000).toISOString(),
    fileType: 'PDF',
    version: '2.1',
    publicationStatus: 'PUBLISHED',
    active: true,
    chunksCount: 20,
    indexingHistory: [
      { status: 'PENDING', timestamp: new Date(now.getTime() - 86400000).toISOString(), note: 'Document soumis' },
      { status: 'PROCESSING', timestamp: new Date(now.getTime() - 54000000).toISOString(), note: 'Extraction en cours' },
      { status: 'FAILED', timestamp: new Date(now.getTime() - 43200000).toISOString(), note: 'Erreur d indexation' }
    ]
  },
  {
    id: 'doc-3',
    name: 'Escalade support niveau 1.docx',
    categoryId: 'cat-support',
    category: mockCategories[2],
    status: 'PENDING',
    createdAt: new Date(now.getTime() - 172800000).toISOString(),
    updatedAt: new Date(now.getTime() - 172800000).toISOString(),
    fileType: 'DOCX',
    version: '1.0',
    publicationStatus: 'DRAFT',
    active: false,
    chunksCount: 0,
    indexingHistory: [{ status: 'PENDING', timestamp: new Date(now.getTime() - 172800000).toISOString(), note: 'Document soumis' }]
  }
];

const assistantMessage = (
  id: string,
  content: string,
  confidence: number,
  documentName: string,
  page: number
): Message => ({
  id,
  role: 'ASSISTANT',
  content,
  createdAt: now.toISOString(),
  confidence,
  sources: [`${documentName} - page ${page}`]
});

export const mockConversations: Conversation[] = [
  {
    id: 'conv-1',
    customerId: 'cust-1',
    title: 'Reinitialiser mon mot de passe',
    status: 'RESOLVED',
    createdAt: new Date(now.getTime() - 3600000 * 8).toISOString(),
    updatedAt: new Date(now.getTime() - 3600000 * 7).toISOString(),
    messages: [
      {
        id: 'msg-1',
        role: 'USER',
        content: 'Comment reinitialiser mon mot de passe ?',
        createdAt: new Date(now.getTime() - 3600000 * 8).toISOString()
      },
      assistantMessage(
        'msg-2',
        'Utilisez le lien "Mot de passe oublie" depuis la page de connexion puis suivez le lien recu par email.',
        0.82,
        'Guide reinitialisation mot de passe.pdf',
        3
      )
    ]
  },
  {
    id: 'conv-2',
    customerId: 'cust-2',
    title: 'Ou en est ma commande',
    status: 'ESCALATED',
    createdAt: new Date(now.getTime() - 3600000 * 30).toISOString(),
    updatedAt: new Date(now.getTime() - 3600000 * 29).toISOString(),
    messages: [
      {
        id: 'msg-3',
        role: 'USER',
        content: 'Je ne trouve plus le suivi de ma commande 4281.',
        createdAt: new Date(now.getTime() - 3600000 * 30).toISOString()
      },
      assistantMessage(
        'msg-4',
        'Je n ai pas retrouve d information suffisamment fiable pour cette commande. Je peux vous aider a contacter le support.',
        0.32,
        'Procedure suivi de commande.pdf',
        5
      )
    ]
  }
];

export const mockEscalations: Escalation[] = [
  {
    id: 'esc-1',
    conversationId: 'conv-2',
    categoryId: 'cat-support',
    title: 'Suivi de commande perdu',
    summary: 'Le client ne retrouve pas les details de suivi de la commande 4281.',
    priority: 'HIGH',
    status: 'SUBMITTED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const mockDashboardData: DashboardData = {
  totalConversations: 1482,
  autoResolutionRate: 74,
  escalationsCount: 84,
  averageSatisfaction: 4.4,
  totalDocuments: 78,
  indexedDocuments: 52,
  pendingIndexations: 12,
  failedIndexations: 14,
  categoriesCount: 6,
  questionsWithoutAnswers: 9,
  customerSatisfactionRate: 87,
  frequentlyAskedQuestions: [
    'Comment changer mon mot de passe ?',
    'Comment suivre ma commande ?',
    'Comment demander un remboursement ?'
  ],
  documentationCoverage: 92,
  dailyQuestions: [
    { day: 'Lun', count: 154 },
    { day: 'Mar', count: 173 },
    { day: 'Mer', count: 162 },
    { day: 'Jeu', count: 190 },
    { day: 'Ven', count: 204 },
    { day: 'Sam', count: 97 },
    { day: 'Dim', count: 84 }
  ],
  unresolvedQuestions: [
    'Commande introuvable malgre un numero valide',
    'Delai de remboursement non precise',
    'Politique de retour pour produit hors UE'
  ]
};
