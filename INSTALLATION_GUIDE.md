# 📋 Guide d'Installation Complet - Système Unifié

## 🎯 Objectif
Ce guide vous aide à installer et configurer le système unifié composé de :
- **Frontend**: Angular (ticket-ui)
- **Backend**: 9 microservices Java Spring Boot
- **Database**: PostgreSQL
- **AI**: Ollama pour LLM
- **Orchestration**: Docker Compose

---

## ✅ Prérequis Système

### Windows
- Windows 10/11
- 8GB RAM minimum (16GB recommandé)
- 20GB espace disque libre

### macOS/Linux
- macOS 10.15+ ou Linux (Ubuntu 20.04+)
- 8GB RAM minimum (16GB recommandé)
- 20GB espace disque libre

---

## 📦 Installation des Dépendances

### 1️⃣ Node.js & npm

**Windows**:
```powershell
# Télécharger depuis https://nodejs.org/
# Installer la version LTS
node --version  # Vérifier (v18+)
npm --version   # Vérifier (v9+)
```

**macOS**:
```bash
brew install node
node --version
npm --version
```

**Linux (Ubuntu)**:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
npm --version
```

### 2️⃣ Java 17+

**Windows**:
```powershell
# Télécharger depuis https://adoptopenjdk.net/
# Ou installer via Chocolatey
choco install openjdk17

# Vérifier
java -version
```

**macOS**:
```bash
brew install openjdk@17
echo 'export PATH="/usr/local/opt/openjdk@17/bin:$PATH"' >> ~/.zshrc
java -version
```

**Linux**:
```bash
sudo apt update
sudo apt install openjdk-17-jdk
java -version
```

### 3️⃣ Maven 3.8+

**Windows**:
```powershell
# Télécharger depuis https://maven.apache.org/download.cgi
# Ajouter au PATH
mvn --version  # Vérifier (3.8+)
```

**macOS**:
```bash
brew install maven
mvn --version
```

**Linux**:
```bash
sudo apt install maven
mvn --version
```

### 4️⃣ PostgreSQL 14+

**Windows**:
```powershell
# Télécharger depuis https://www.postgresql.org/download/
# Ou via Chocolatey
choco install postgresql

# Vérifier
psql --version
```

**macOS**:
```bash
brew install postgresql
psql --version
```

**Linux**:
```bash
sudo apt install postgresql postgresql-contrib
psql --version
```

### 5️⃣ Docker & Docker Compose (Optionnel)

**Windows/macOS**:
```
Télécharger: https://www.docker.com/products/docker-desktop
```

**Linux**:
```bash
sudo apt install docker.io docker-compose
```

### 6️⃣ Ollama (Pour l'IA)

Télécharger depuis: https://ollama.ai

```bash
ollama --version
```

---

## 🚀 Configuration Initiale

### 1️⃣ Cloner le Repository

```bash
cd votre-dossier-projets

# Via HTTPS
git clone https://github.com/nourhasnii/ticket-management-system.git
cd ticket-management-system

# Ou via SSH (si configuré)
git clone git@github.com:nourhasnii/ticket-management-system.git
cd ticket-management-system

# Vérifier qu'on est sur la branche IA-RAG
git branch -a
git checkout IA-RAG
```

### 2️⃣ Configurer les Variables d'Environnement

```bash
# Copier le fichier exemple
cp .env.example .env

# Éditer .env avec vos paramètres
nano .env  # Linux/macOS
notepad .env  # Windows
```

**Valeurs recommandées pour développement**:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ticket_system
DB_USER=admin
DB_PASSWORD=password

JWT_SECRET=dev-secret-key-not-for-production
JWT_EXPIRATION=86400

OLLAMA_HOST=http://localhost:11434
MAIL_HOST=smtp.gmail.com
```

### 3️⃣ Créer la Base de Données PostgreSQL

```bash
# Se connecter à PostgreSQL
psql -U postgres

# Dans le prompt psql:
CREATE DATABASE ticket_system;
CREATE USER admin WITH PASSWORD 'password';
ALTER ROLE admin SET client_encoding TO 'utf8';
ALTER ROLE admin SET default_transaction_isolation TO 'read committed';
ALTER ROLE admin SET default_transaction_deferrable TO on;
ALTER ROLE admin SET default_time_zone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE ticket_system TO admin;
\q
```

### 4️⃣ Installer les Modèles Ollama

```bash
# Démarrer Ollama en background (ou ouvrir l'app)
ollama serve &

# Attendre que Ollama soit prêt (5-10 secondes)
# Puis installer les modèles
ollama pull llama2           # Modèle de conversation
ollama pull all-minilm       # Pour les embeddings
```

---

## 🏃 Démarrage du Système

### Option A: Démarrage Rapide (Recommandé pour Dev)

**Terminal 1 - Backend (Compilation)**:
```bash
cd backend
mvn clean install -DskipTests
```

**Terminal 2 - API Gateway**:
```bash
cd backend/api-gateway
mvn spring-boot:run
# Attendre: "Started ApiGatewayApplication"
```

**Terminal 3 - Services (Au choix, démarrer en parallèle)**:
```bash
# Chaque service dans un terminal séparé:
cd backend/auth-service && mvn spring-boot:run
cd backend/ticket-service && mvn spring-boot:run
cd backend/ai-service && mvn spring-boot:run
cd backend/conversation-service && mvn spring-boot:run
cd backend/knowledge-base-service && mvn spring-boot:run
```

**Terminal Final - Frontend**:
```bash
cd frontend/ticket-ui
npm install  # première fois seulement
npm start
# Ouvrir http://localhost:4200
```

### Option B: Démarrage avec Script Unifié

**Windows**:
```powershell
# Terminal Admin
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\start-unified.ps1
```

**Linux/macOS**:
```bash
chmod +x start-unified.sh
./start-unified.sh
```

### Option C: Démarrage avec Docker Compose

```bash
# Assurez-vous que Docker Desktop est en marche

# Lancer tous les services
docker-compose up -d

# Vérifier les logs
docker-compose logs -f

# Arrêter
docker-compose down
```

---

## ✅ Vérification de l'Installation

### 1️⃣ Vérifier les Services Backend

```bash
# Tester chaque service
curl http://localhost:8080/health          # API Gateway
curl http://localhost:8081/health          # Auth Service
curl http://localhost:8082/health          # Ticket Service
curl http://localhost:8083/health          # AI Service
curl http://localhost:8084/health          # Conversation
curl http://localhost:8085/health          # Knowledge Base

# Toutes les réponses doivent retourner: {"status":"UP"}
```

### 2️⃣ Vérifier la Base de Données

```bash
psql -U admin -d ticket_system

# Dans le prompt:
\dt  # Lister les tables
SELECT * FROM information_schema.tables WHERE table_schema = 'public';
\q
```

### 3️⃣ Vérifier le Frontend

Ouvrir dans le navigateur:
```
http://localhost:4200
```

Vous devez voir la page d'accueil de l'application.

### 4️⃣ Vérifier Ollama

```bash
curl http://localhost:11434/api/tags

# Réponse attendue:
# {"models":[{"name":"llama2:latest",...},{"name":"all-minilm:latest",...}]}
```

---

## 🔐 Configuration de Sécurité pour Production

### 1️⃣ Générer une Clé JWT Sécurisée

**Windows**:
```powershell
$secret = [Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Maximum 256) }))
Write-Host $secret
```

**Linux/macOS**:
```bash
openssl rand -base64 32
```

Copier la valeur générée dans `.env`:
```env
JWT_SECRET=<votre-clé-générée>
```

### 2️⃣ Changer les Mots de Passe

**PostgreSQL**:
```sql
ALTER USER admin WITH PASSWORD 'new-strong-password';
```

Mettre à jour `.env`:
```env
DB_PASSWORD=new-strong-password
```

### 3️⃣ Configurer HTTPS

Générer un certificat auto-signé:
```bash
# Linux/macOS
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Windows (avec OpenSSL installé)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

---

## 🐛 Dépannage Courant

### ❌ "Port déjà utilisé"

```bash
# Trouver le processus
# Linux/macOS
lsof -i :8080

# Windows
netstat -ano | findstr :8080

# Changer le port dans application.properties:
server.port=8090
```

### ❌ "Impossible de se connecter à PostgreSQL"

```bash
# Vérifier que PostgreSQL est lancé
# Windows
Get-Process postgres

# Linux/macOS
ps aux | grep postgres

# Redémarrer PostgreSQL
sudo systemctl restart postgresql  # Linux
brew services restart postgresql   # macOS
```

### ❌ "Erreur de compilation Maven"

```bash
# Nettoyer le cache Maven
mvn clean
rm -rf ~/.m2/repository

# Réinstaller
mvn install -DskipTests
```

### ❌ "npm ERR! ERESOLVE unable to resolve dependency tree"

```bash
cd frontend/ticket-ui
npm install --legacy-peer-deps
```

### ❌ "Ollama not found"

```bash
# Assurez-vous qu'Ollama est installé et en cours d'exécution
ollama serve

# Puis dans un autre terminal:
ollama pull llama2
```

---

## 📊 Commandes Utiles

### Backend (Maven)

```bash
# Compiler
mvn clean compile

# Compiler + Tests
mvn clean verify

# Compiler + Installer
mvn clean install

# Démarrer un service
mvn spring-boot:run

# Build JAR
mvn clean package

# Nettoyer les fichiers générés
mvn clean
```

### Frontend (npm)

```bash
# Installer dépendances
npm install

# Démarrer dev server
npm start

# Build production
npm run build

# Tests
npm test

# Linting
npm run lint
```

### Docker

```bash
# Lancer les services
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter les services
docker-compose down

# Supprimer les volumes (données)
docker-compose down -v
```

### Git

```bash
# Voir les branches
git branch -a

# Changer de branche
git checkout IA-RAG

# Voir les modifications
git status

# Commiter
git commit -m "Description du changement"

# Pousser vers le serveur
git push origin IA-RAG

# Tirer les derniers changements
git pull origin IA-RAG
```

---

## 🎓 Prochaines Étapes

1. ✅ Installation terminée
2. 📖 Lire [README_UNIFIED.md](./README_UNIFIED.md)
3. 📚 Consulter [docs/](./docs/) pour l'architecture
4. 🔌 Explorer les API endpoints
5. 🧪 Écrire vos premiers tests
6. 🚀 Déployer en production

---

## 📞 Support

- **Issues**: https://github.com/nourhasnii/ticket-management-system/issues
- **Documentation**: Voir le dossier `docs/`
- **Contact**: Consultez le README principal

---

**Bon développement! 🎉**
