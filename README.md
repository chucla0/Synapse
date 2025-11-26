# Synapse Agenda

![Synapse Logo](./synapse_title.jpg)

**Gestor de Flujo de Trabajo y Calendario Colaborativo Avanzado**

Proyecto Full Stack desarrollado con JavaScript puro, diseñado para demostrar dominio en arquitectura de sistemas, autenticación JWT, lógica de negocio server-side compleja y entornos completamente dockerizados.

---

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Stack Tecnológico](#-stack-tecnológico)
- [Arquitectura](#-arquitectura)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Uso](#-uso)
- [Documentación](#-documentación)
- [Contacto](#-contacto)

---

## ✨ Características

### Core Features

- **🔐 Autenticación JWT Segura**: Sistema completo de login/registro con tokens de acceso y refresh
- **📅 Multi-Agenda**: Gestión de múltiples calendarios con diferentes tipos (Personal, Laboral, Educativa, Familiar)
- **👥 Colaboración**: Sistema de permisos por roles según el tipo de agenda
- **📊 4 Vistas de Calendario**: Día, Semana, Mes y Año (totalmente interactivas)
- **🔔 Notificaciones**: Sistema de notificaciones en tiempo real
- **⏰ Gestión Avanzada de Tiempo**: Soporte para eventos recurrentes (RRULE), zonas horarias y detección de conflictos

### Lógica de Negocio Avanzada

#### Matriz de Permisos por Tipo de Agenda

**Laboral**:

- **CHIEF**: Puede crear eventos y aprobar/rechazar eventos creados por empleados
- **EMPLOYEE**: Puede crear eventos, pero requieren aprobación (estado `PENDING_APPROVAL`)

**Educativa**:

- **PROFESSOR**: Puede crear eventos visibles para todos
- **STUDENT**: Solo puede ver eventos (no puede crear)

**Personal/Familiar**:

- **OWNER**: Control total sobre la agenda
- **EDITOR**: Puede crear y editar eventos
- **VIEWER**: Solo puede visualizar eventos

#### Detección de Conflictos

El backend verifica automáticamente si el usuario tiene otros eventos en el mismo horario antes de permitir la creación de un nuevo evento.

---

## 🛠️ Stack Tecnológico

### Backend

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **ORM**: Prisma
- **Base de Datos**: PostgreSQL
- **Autenticación**: JWT (jsonwebtoken + bcryptjs)
- **Validación**: express-validator

### Frontend

- **Framework**: React 18
- **Build Tool**: Vite
- **State Management**: TanStack Query (React Query)
- **HTTP Client**: Axios
- **Date Utilities**: date-fns
- **Routing**: React Router DOM

### DevOps

- **Containerización**: Docker + Docker Compose
- **Proxy Reverso**: Nginx (producción)

---

## 🏗️ Arquitectura

### Estructura del Proyecto

\`\`\`
Synapse/
├── backend/
│ ├── prisma/
│ │ └── schema.prisma # Modelo de base de datos
│ ├── src/
│ │ ├── controllers/ # Lógica de controladores
│ │ ├── middleware/ # Middlewares (auth, etc.)
│ │ ├── routes/ # Definición de rutas
│ │ ├── services/ # Servicios auxiliares
│ │ └── server.js # Entry point del backend
│ ├── Dockerfile
│ └── package.json
├── frontend/
│ ├── src/
│ │ ├── components/ # Componentes React
│ │ │ ├── Calendar/ # Vistas del calendario
│ │ │ └── Dashboard.jsx # Dashboard principal
│ │ ├── pages/ # Páginas (Login, Register)
│ │ ├── utils/ # Utilidades (api, auth, date)
│ │ ├── App.jsx # Componente raíz
│ │ ├── main.jsx # Entry point
│ │ └── index.css # Estilos globales
│ ├── Dockerfile
│ ├── nginx.conf
│ ├── vite.config.js
│ └── package.json
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
\`\`\`

### Diagrama de Arquitectura

\`\`\`mermaid
graph TB
subgraph "Docker Network"
FE[Frontend<br/>React + Vite<br/>Port 5173]
BE[Backend<br/>Node + Express<br/>Port 3000]
DB[(PostgreSQL<br/>Port 5432)]
end

    Client[Cliente Web] -->|HTTP/HTTPS| FE
    FE -->|API REST| BE
    BE -->|Prisma ORM| DB

    style FE fill:#61dafb,stroke:#333,stroke-width:2px
    style BE fill:#68a063,stroke:#333,stroke-width:2px
    style DB fill:#336791,stroke:#333,stroke-width:2px

\`\`\`

---

## 📦 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Docker** (versión 20.10+)
- **Docker Compose** (versión 2.0+)
- **Node.js** 18+ (opcional, para desarrollo local sin Docker)

---

## 🚀 Instalación

### 1. Clonar el repositorio

\`\`\`bash
git clone https://github.com/tuusuario/synapse-agenda.git
cd synapse-agenda
\`\`\`

### 2. Configurar variables de entorno

\`\`\`bash
cp .env.example .env
\`\`\`

Edita el archivo \`.env\` y ajusta las variables según sea necesario:

\`\`\`env

# PostgreSQL

POSTGRES_USER=synapse
POSTGRES_PASSWORD=tu_password_seguro
POSTGRES_DB=synapse_db

# Backend

JWT_SECRET=tu_jwt_secret_muy_seguro_cambiar_en_produccion
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Frontend

VITE_API_URL=http://localhost:3000
\`\`\`

### 3. Levantar los servicios con Docker

\`\`\`bash

# Construir y levantar todos los contenedores

docker-compose up -d

# Ver los logs

docker-compose logs -f

# Verificar que todos los servicios estén corriendo

docker-compose ps
\`\`\`

### 4. Ejecutar migraciones de Prisma

\`\`\`bash

# Ejecutar migraciones de base de datos

docker-compose exec backend npx prisma migrate dev --name init

# Generar Prisma Client

docker-compose exec backend npx prisma generate

# (Opcional) Abrir Prisma Studio para ver la base de datos

docker-compose exec backend npx prisma studio
\`\`\`

---

## 💻 Uso

### Acceder a la aplicación

Una vez que todos los servicios estén corriendo:

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3000](http://localhost:3000)
- **Base de Datos**: `localhost:5432`

### Crear tu primera cuenta

1. Abre [http://localhost:5173](http://localhost:5173)
2. Haz clic en "Regístrate"
3. Completa el formulario de registro
4. Serás redirigido automáticamente al Dashboard

### Comandos útiles de Docker

\`\`\`bash

# Detener todos los servicios

docker-compose down

# Detener y eliminar volúmenes (⚠️ elimina la base de datos)

docker-compose down -v

# Reconstruir los contenedores

docker-compose up -d --build

# Ver logs de un servicio específico

docker-compose logs -f backend
docker-compose logs -f frontend

# Ejecutar comandos en el contenedor del backend

docker-compose exec backend npm install <paquete>
docker-compose exec backend npx prisma studio

# Acceder a la base de datos PostgreSQL

docker-compose exec postgres psql -U synapse -d synapse_db
\`\`\`

---

## 📚 Documentación

- [**Arquitectura Detallada**](./ARCHITECTURE.md) - Decisiones de diseño y flujos de trabajo
- [**Documentación de API**](./API_DOCS.md) - Endpoints, ejemplos y esquemas

### Endpoints Principales

#### Autenticación

- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Inicio de sesión
- `POST /api/auth/refresh` - Renovar token
- `GET /api/auth/profile` - Obtener perfil del usuario

#### Agendas

- `GET /api/agendas` - Listar todas las agendas del usuario
- `POST /api/agendas` - Crear nueva agenda
- `GET /api/agendas/:id` - Obtener agenda específica
- `PUT /api/agendas/:id` - Actualizar agenda
- `DELETE /api/agendas/:id` - Eliminar agenda

#### Eventos

- `GET /api/events` - Listar eventos (con filtros)
- `POST /api/events` - Crear evento
- `PUT /api/events/:id` - Actualizar evento
- `DELETE /api/events/:id` - Eliminar evento
- `POST /api/events/:id/approve` - Aprobar evento pendiente
- `POST /api/events/:id/reject` - Rechazar evento pendiente

#### Notificaciones

- `GET /api/notifications` - Listar notificaciones
- `GET /api/notifications/unread` - Contar no leídas
- `PUT /api/notifications/:id/read` - Marcar como leída

---

## 🧪 Testing

### Verificar el Health Check del Backend

\`\`\`bash
curl http://localhost:3000/health
\`\`\`

Respuesta esperada:
\`\`\`json
{
"status": "ok",
"timestamp": "2024-01-15T10:30:00.000Z",
"service": "Synapse Backend API"
}
\`\`\`

### Probar el Login

\`\`\`bash
curl -X POST http://localhost:3000/api/auth/login \\
-H "Content-Type: application/json" \\
-d '{
"email": "test@example.com",
"password": "password123"
}'
\`\`\`

---

## 🎨 Características del Frontend

### Sistema de Diseño

- **Tema oscuro** con paleta de colores moderna
- **Animaciones suaves** y transiciones
- **Diseño responsive** para móviles y tablets
- **Componentes reutilizables** con CSS modular

### Vistas del Calendario

1. **Vista Día**: Grid de 24 horas con eventos posicionados temporalmente
2. **Vista Semana**: 7 columnas con overview semanal
3. **Vista Mes**: Grid tradicional de calendario mensual
4. **Vista Año**: 12 mini-calendarios con indicadores de eventos

---

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](./LICENSE) para más detalles.

---

## 👨‍💻 Contacto

**Desarrollador**: Synapse Team  
**Email**: iizan.cruzz@gmail.com  
**Email Proyecto**: a23izadelesp@inspedralbes.cat

---

## 🙏 Agradecimientos

Este proyecto fue desarrollado como parte del portfolio de desarrollo Full Stack, demostrando competencias en:

- ✅ Arquitectura de sistemas escalables
- ✅ Autenticación y seguridad (JWT)
- ✅ Lógica de negocio compleja server-side
- ✅ Gestión de estado asíncrono con React Query
- ✅ Dockerización y orquestación de servicios
- ✅ Diseño de APIs RESTful
- ✅ Manejo avanzado de fechas y zonas horarias

---

**¡Gracias por revisar Synapse Agenda! 🚀**
