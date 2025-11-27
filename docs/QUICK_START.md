# 🚀 Guía Rápida de Inicio - Synapse Agenda

## ✅ Estado del Proyecto

El proyecto **Synapse Agenda** está **100% completo** con todos los archivos generados:

- ✅ Backend completo con Node.js, Express, Prisma
- ✅ Frontend completo con React, Vite, TanStack Query
- ✅ Docker Compose configurado
- ✅ Sistema de autenticación JWT
- ✅ 4 vistas de calendario
- ✅ Lógica de negocio avanzada
- ✅ Documentación completa

## 🐳 Iniciar el Proyecto

### Opción 1: Con Docker (Recomendado)

```bash
cd /home/chuclao/Escritorio/Synapse

# 1. Crear archivo .env desde el template
cp .env.example .env

# 2. IMPORTANTE: Liberar el puerto 3000 si está ocupado
# Ejecuta este comando para ver qué proceso está usando el puerto:
lsof -i:3000

# Si hay algo usando el puerto, deténlo o usa este comando:
fuser -k 3000/tcp

# 3. Levantar los servicios
docker compose up --build -d

# 4. Verificar que estén corriendo
docker compose ps

# 5. Ver los logs si hay algún problema
docker compose logs -f backend
docker compose logs -f frontend
```

### Opción 2: Desarrollo Local (Sin Docker)

#### Backend

```bash
cd backend

# Instalar dependencias
npm install

# Configurar base de datos (necesitas PostgreSQL corriendo)
# Edita DATABASE_URL en .env para apuntar a tu PostgreSQL local

# Generar Prisma Client
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev --name init

# Iniciar servidor
npm run dev
```

#### Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

## 🔌 Puertos

- **PostgreSQL**: 5432
- **Backend API**: 3000
- **Frontend**: 5173

## 🧪 Verificar que Funciona

### 1. Health Check del Backend

```bash
curl http://localhost:3000/health
```

Deberías ver:

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T...",
  "service": "Synapse Backend API"
}
```

### 2. Acceder al Frontend

Abre http://localhost:5173 en tu navegador.

### 3. Probar el Registro

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

## ⚠️ Solución de Problemas

### Problema: "port is already allocated" (Puerto 3000 ocupado)

**Solución 1**: Liberar el puerto

```bash
# Ver qué proceso está usando el puerto
lsof -i:3000

# Matar el proceso (reemplaza PID con el número que veas)
kill -9 PID

# O forzar la liberación
fuser -k 3000/tcp
```

**Solución 2**: Cambiar el puerto del backend
Edita `docker-compose.yml` y cambia el mapeo de puertos:

```yaml
backend:
  ports:
    - "3001:3000" # Usar 3001 en el host
```

Luego actializa `.env`:

```
VITE_API_URL=http://localhost:3001
```

### Problema: Backend no puede conectar a PostgreSQL

```bash
# Verificar que PostgreSQL está corriendo
docker compose ps

# Ver logs de la base de datos
docker compose logs postgres

# Reiniciar solo el backend
docker compose restart backend
```

### Problema: Frontend muestra error

```bash
# Verificar logs
docker compose logs frontend

# Reconstruir frontend
docker compose up --build frontend
```

## 📚 Próximos Pasos

1. **Crear tu primera cuenta**: Abre http://localhost:5173 y regístrate
2. **Crear una agenda**: Usa el botón "+ Nueva Agenda"
3. **Explorar las vistas**: Cambia entre Día, Semana, Mes y Año
4. **Leer la documentación**:
   - [README.md](./README.md) - Guía principal
   - [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura detallada
   - [API_DOCS.md](./API_DOCS.md) - Documentación de API

## 🔐 Ejecutar Migraciones de Prisma

Si necesitas crear las tablas en la base de datos:

```bash
# Dentro del contenedor
docker compose exec backend npx prisma migrate dev --name init

# O localmente
cd backend
npx prisma migrate dev --name init
```

## 🎨 Personalizar

- **Colores**: Edita `frontend/src/index.css` (líneas 2-20)
- **Logo**: Reemplaza `frontend/public/synapse_logo.jpg`
- **Puerto backend**: Edita `.env` y `docker-compose.yml`

---

## 📞 Soporte

Si encuentras algún problema:

1. Revisa los logs: `docker compose logs [servicio]`
2. Verifica que los puertos estén libres: `lsof -i:3000` y `lsof -i:5173`
3. Reconstruye desde cero: `docker compose down -v && docker compose up --build`

**Email**: iizan.cruzz@gmail.com

---

**¡Disfruta desarrollando con Synapse Agenda!** 🎉
