# 🚀 Projet Unifié - Ticket Management System + IA RAG

## 📁 Structure du Projet

```
ticket-management-system/
├── frontend/
│   ├── ticket-ui/              # Application Angular principale
│   │   ├── src/
│   │   │   ├── app/           # Composants fusionnés (Ticket + IA RAG)
│   │   │   │   ├── features/  # Pages principales
│   │   │   │   ├── core/      # Services, guards, interceptors
│   │   │   │   ├── shared/    # Composants partagés
│   │   │   │   └── models/    # Types/Interfaces
│   │   │   ├── environments/  # Configurations env
│   │   │   ├── main.ts
│   │   │   └── styles.scss
│   │   ├── angular.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── ...
│
├── backend/
│   ├── api-gateway/           # ⭐ Point d'entrée API
│   ├── auth-service/          # Authentification
│   ├── ticket-service/        # Gestion des tickets
│   ├── assignment-service/    # Attribution de tâches
│   ├── notification-service/  # Notifications
│   ├── ai-service/            # Services IA
│   ├── conversation-service/  # 🆕 Gestion des conversations (IA RAG)
│   ├── knowledge-base-service/# 🆕 Base de connaissances vectorielle
│   ├── pom.xml               # Configuration Maven parent
│   └── team-mgmt-dump.txt
│
├── docker/                    # Configuration Docker
├── docs/                      # Documentation
├── docker-compose.yml         # 🆕 Orchestration complète
└── README.md                  # Ce fichier

```

## 🛠️ Prérequis

- **Node.js**: v18+ (pour Angular)
- **Java**: 17+
- **Maven**: 3.8+
- **Docker**: (optionnel)
- **PostgreSQL**: 14+ (pour la BD)
- **Ollama**: Pour les services IA

## 🚀 Démarrage Rapide

### Option 1: Démarrage Complet avec Docker

```bash
docker-compose up -d
```

### Option 2: Démarrage Manuel

#### 1️⃣ Backend - Services Java

```bash
cd backend

# Installer les dépendances et compiler
mvn clean install

# Démarrer l'API Gateway (port 8080)
cd api-gateway
mvn spring-boot:run

# Dans d'autres terminaux, démarrer les autres services:
cd auth-service && mvn spring-boot:run        # port 8081
cd ticket-service && mvn spring-boot:run      # port 8082
cd ai-service && mvn spring-boot:run          # port 8083
cd conversation-service && mvn spring-boot:run # port 8084
cd knowledge-base-service && mvn spring-boot:run # port 8085
```

#### 2️⃣ Frontend - Angular

```bash
cd frontend/ticket-ui

# Installer les dépendances
npm install

# Démarrer le serveur de développement (port 4200)
npm start
```

## 🔌 Configuration API

Tous les services sont accessible via l'**API Gateway**:

```
http://localhost:8080
```

Les services communiquent entre eux via le gateway. Configuration dans `application.properties`:

```properties
# API Gateway
server.port=8080
spring.application.name=api-gateway

# Services
auth.service.url=http://localhost:8081
ticket.service.url=http://localhost:8082
ai.service.url=http://localhost:8083
conversation.service.url=http://localhost:8084
knowledge-base.service.url=http://localhost:8085
```

## 📊 Services Disponibles

### Authentification
- **Service**: auth-service (port 8081)
- **Endpoints**: `/api/auth/login`, `/api/auth/register`, `/api/auth/refresh`

### Gestion des Tickets
- **Service**: ticket-service (port 8082)
- **Endpoints**: `/api/tickets`, `/api/tickets/{id}`

### Attribution de Tâches
- **Service**: assignment-service
- **Endpoints**: `/api/assignments`

### Notifications
- **Service**: notification-service
- **Endpoints**: `/api/notifications`

### Services IA (Nouveau)
- **Service**: conversation-service (port 8084)
- **Endpoints**: `/api/conversations`, `/api/messages`

### Base de Connaissances (Nouveau)
- **Service**: knowledge-base-service (port 8085)
- **Endpoints**: `/api/documents`, `/api/search`, `/api/embeddings`

## 📝 Variables d'Environnement

Créez un fichier `.env` à la racine:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ticket_system
DB_USER=admin
DB_PASSWORD=password

# Ollama (pour l'IA)
OLLAMA_HOST=http://localhost:11434

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=86400

# Frontend
FRONTEND_URL=http://localhost:4200
```

## 🧪 Tests

### Tests Frontend
```bash
cd frontend/ticket-ui
npm test
```

### Tests Backend
```bash
cd backend
mvn test
```

## 🐳 Docker Compose

Fichier `docker-compose.yml` inclus pour démarrer tous les services:

```bash
# Démarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter les services
docker-compose down
```

## 📦 Build Production

### Frontend
```bash
cd frontend/ticket-ui
npm run build
# Artifacts: dist/
```

### Backend
```bash
cd backend
mvn clean package
# JAR files: */target/*.jar
```

## 🔗 Liens Utiles

- **Frontend**: http://localhost:4200
- **API Gateway**: http://localhost:8080/swagger-ui.html
- **PostgreSQL**: localhost:5432
- **Ollama**: http://localhost:11434

## 📚 Documentation Détaillée

Voir le dossier `docs/` pour:
- Architecture système
- Diagrammes
- Guide de contribution
- API documentation

## ✅ Checklist de Démarrage

- [ ] Cloner le repository
- [ ] Installer Node.js et Java
- [ ] Configurer les variables d'environnement
- [ ] Démarrer PostgreSQL
- [ ] Installer Ollama
- [ ] Compiler le backend (`mvn clean install`)
- [ ] Installer les dépendances frontend (`npm install`)
- [ ] Démarrer l'API Gateway
- [ ] Démarrer les services microservices
- [ ] Démarrer le frontend Angular
- [ ] Accéder à http://localhost:4200

## 🐛 Dépannage

### Erreur de connexion à la BD
```bash
# Vérifier si PostgreSQL est actif
psql -h localhost -U admin -d ticket_system
```

### Port déjà utilisé
```bash
# Trouver le processus utilisant le port
netstat -ano | findstr :8080

# Changer le port dans application.properties
server.port=8090
```

### Erreurs d'authentification
```bash
# Vérifier les logs
tail -f api-gateway/logs/*.log

# Régénérer la clé JWT
JWT_SECRET=$(openssl rand -base64 32)
```

## 🤝 Contribution

1. Créer une branche feature
2. Committer vos changements
3. Push vers la branche
4. Créer une Pull Request

## 📄 Licence

MIT

---

**Dernière mise à jour**: 2026-08-18
**Version**: 1.0.0 Unified
