# ⚡ QUICK START - Démarrage en 5 minutes!

## 🎯 Si vous êtes pressé, suivez ces 5 étapes:

### 1️⃣ Prérequis (1 minute)
```bash
# Vérifier les versions installées
node --version    # Doit être >= 18
java -version     # Doit être >= 17
mvn --version     # Doit être >= 3.8

# Tout ok? Continuez!
```

### 2️⃣ Cloner et Configurer (30 secondes)
```bash
# Aller dans le dossier du projet
cd ticket-management-system

# Copier la configuration
cp .env.example .env
```

### 3️⃣ Démarrer la Base de Données (1 minute)

**Avec Docker** (recommandé):
```bash
docker run -d --name ticket-db \
  -e POSTGRES_DB=ticket_system \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:15-alpine
```

**Ou localement**:
```bash
# Créer la BD manuellement (voir INSTALLATION_GUIDE.md)
```

### 4️⃣ Démarrer le Backend (2 minutes)

**Compilation**:
```bash
cd backend
mvn clean install -DskipTests
cd ..
```

**Démarrage API Gateway** (Terminal 1):
```bash
cd backend/api-gateway
mvn spring-boot:run
# ✅ Attendre "Started ApiGatewayApplication"
```

**Démarrage services** (Terminaux 2+) - En parallèle:
```bash
# Terminal 2
cd backend/auth-service && mvn spring-boot:run

# Terminal 3
cd backend/ticket-service && mvn spring-boot:run

# Etc... (voir INSTALLATION_GUIDE.md pour les autres)
```

### 5️⃣ Démarrer le Frontend (Terminal final)
```bash
cd frontend/ticket-ui

# Première fois seulement:
npm install

# Démarrer:
npm start

# ✅ Ouvrir http://localhost:4200
```

---

## 🚀 Bravo! Le système est lancé!

```
✅ Frontend:    http://localhost:4200
✅ API:         http://localhost:8080
✅ Swagger:     http://localhost:8080/swagger-ui.html
✅ Database:    localhost:5432
```

---

## 📚 Liens Utiles

| Lien | Description |
|------|------------|
| [README_UNIFIED.md](./README_UNIFIED.md) | 📖 Documentation complète |
| [INSTALLATION_GUIDE.md](./INSTALLATION_GUIDE.md) | 🛠️ Guide d'installation détaillé |
| [FUSION_SUMMARY.md](./FUSION_SUMMARY.md) | 📊 Résumé de la fusion |
| [docker-compose.yml](./docker-compose.yml) | 🐳 Orchestration Docker |

---

## 🐛 Ça ne marche pas? Dépannage rapide

### ❌ "Port déjà utilisé"
```bash
# Changer le port dans backend/api-gateway/src/main/resources/application.properties
server.port=8090
```

### ❌ "npm ERR! ERESOLVE"
```bash
cd frontend/ticket-ui
npm install --legacy-peer-deps
```

### ❌ "PostgreSQL connection refused"
```bash
# Vérifier que PostgreSQL est lancé
# Linux/macOS: brew services start postgresql
# Windows: Chercher PostgreSQL dans les services
# Ou utiliser Docker: docker ps (doit voir ticket-db)
```

### ❌ "Maven build failed"
```bash
# Nettoyer et réessayer
cd backend
mvn clean
rm -rf ~/.m2/repository
mvn install -DskipTests
```

---

## 💡 Tips

1. **Garder les terminaux ouverts** - Un par service
2. **Lire les logs** - Ils vous diront ce qui ne va pas
3. **Port 4200** - C'est le frontend Angular
4. **Port 8080** - C'est l'API Gateway (principal)
5. **Ctrl+C** - Pour arrêter un service

---

## 🎉 Prêt à Développer!

Voir [README_UNIFIED.md](./README_UNIFIED.md) pour les prochaines étapes.

---

**Happy Coding! 🚀**
