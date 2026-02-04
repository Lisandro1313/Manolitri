# 🚀 Guía de Deploy - Survival Zombie

## 📋 Paso 1: Subir a GitHub

### Si NO tienes Git configurado:
```bash
# Configurar Git (primera vez)
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
```

### Subir el proyecto:
```bash
# 1. Inicializar repositorio
git init

# 2. Agregar todos los archivos
git add .

# 3. Primer commit
git commit -m "🧟 Survival Zombie MVP - Multiplayer con quests cooperativas"

# 4. Ir a GitHub.com → New Repository
#    Nombre: survival-zombie
#    Público o Privado (da igual)
#    NO inicializar con README

# 5. Conectar con GitHub (copia los comandos que GitHub te da)
git remote add origin https://github.com/TU_USUARIO/survival-zombie.git
git branch -M main
git push -u origin main
```

## 🚂 Paso 2: Deploy en Railway

### Opción A: Deploy desde GitHub (RECOMENDADO)
1. Ve a [railway.app](https://railway.app)
2. Click **"Login"** → Login con GitHub
3. Click **"New Project"**
4. Selecciona **"Deploy from GitHub repo"**
5. Busca y selecciona `survival-zombie`
6. Railway automáticamente:
   - Detecta Node.js
   - Instala dependencias (`npm install`)
   - Ejecuta `npm start`
7. Espera 1-2 minutos
8. Ve a **Settings** → **Networking**
9. Click **"Generate Domain"**
10. ¡LISTO! Tu URL será algo como: `https://survival-zombie-production.up.railway.app`

### Opción B: Deploy directo (sin GitHub)
1. Ve a [railway.app](https://railway.app)
2. Click **"New Project"** → **"Deploy from local directory"**
3. Instala Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```
4. Login:
   ```bash
   railway login
   ```
5. Deploy:
   ```bash
   railway up
   ```

## 🌐 Paso 3: Compartir con Amigos

Una vez deployado:
1. Copia la URL de Railway (ej: `https://tu-proyecto.up.railway.app`)
2. Compártela con amigos por WhatsApp/Discord/etc
3. Todos crean cuenta en tu juego
4. ¡Jueguen juntos!

## 🔄 Actualizar el Juego (después de cambios)

```bash
# 1. Guardar cambios en Git
git add .
git commit -m "Descripción de los cambios"
git push

# 2. Railway detecta automáticamente y redeploya
# (toma 1-2 minutos)
```

## 📊 Monitorear en Railway

- **Logs**: Ve la actividad en tiempo real
- **Metrics**: CPU, RAM, requests
- **Deployments**: Historial de versiones

## 💰 Costos

**Railway FREE tier:**
- $5 USD de crédito gratis al mes
- Suficiente para ~500 horas de servidor
- Si juegas 4 horas al día = ~120 horas/mes = GRATIS

**Si excedes el free tier:**
- Solo pagas lo que usas ($0.01/hora aprox)
- Máximo ~$10-15/mes con uso intensivo

## 🐛 Troubleshooting

### Error: "Build failed"
```bash
# Asegúrate que package.json está correcto
cat package.json

# Verifica que las dependencias estén en package.json
npm install
```

### Error: "Application failed to respond"
- Verifica que el puerto use `process.env.PORT || 3000`
- Railway asigna el puerto automáticamente

### Base de datos se resetea
- SQLite en Railway es efímera (se borra en cada deploy)
- **Solución**: Migra a Railway PostgreSQL (gratis también)
  1. En Railway: **New** → **Database** → **PostgreSQL**
  2. Actualiza código para usar PostgreSQL en vez de SQLite

### WebSocket no conecta
- Railway soporta WebSockets automáticamente
- Verifica que uses la URL correcta (https:// no ws://)

## 🔗 URLs Útiles

- **Railway Dashboard**: https://railway.app/dashboard
- **GitHub**: https://github.com
- **Railway CLI**: https://docs.railway.app/develop/cli

## 📝 Comandos Git Útiles

```bash
# Ver estado
git status

# Ver commits
git log --oneline

# Deshacer último commit (mantiene cambios)
git reset --soft HEAD~1

# Ver ramas
git branch

# Crear rama nueva
git checkout -b nueva-feature

# Cambiar a main
git checkout main

# Actualizar desde GitHub
git pull
```

## 🎮 ¡Listo!

Ahora tienes tu juego en producción 24/7 accesible desde cualquier lugar del mundo. 

**Comparte la URL y juega con amigos!** 🧟‍♂️

---

**Siguiente paso**: Lee `ROADMAP.md` para ideas de nuevas features
