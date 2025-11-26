# Arquitectura de Synapse Agenda

Este documento describe en detalle la arquitectura, decisiones de diseño y flujos de trabajo del sistema Synapse Agenda.

---

## Tabla de Contenidos

- [Visión General](#visión-general)
- [Arquitectura de Capas](#arquitectura-de-capas)
- [Modelo de Datos](#modelo-de-datos)
- [Sistema de Autenticación](#sistema-de-autenticación)
- [Matriz de Permisos](#matriz-de-permisos)
- [Gestión de Eventos](#gestión-de-eventos)
- [Sistema de Notificaciones](#sistema-de-notificaciones)
- [Manejo de Zonas Horarias](#manejo-de-zonas-horarias)

---

## Visión General

Synapse Agenda es una aplicación Full Stack desacoplada que utiliza una arquitectura de microservicios dockerizada. El sistema está diseñado para soportar múltiples usuarios, múltiples agendas y colaboración en tiempo real con permisos granulares.

### Principios de Diseño

1. **Separation of Concerns**: Backend y Frontend completamente independientes
2. **Security First**: Toda la lógica de permisos en el servidor
3. **Escalabilidad**: Arquitectura preparada para crecimiento horizontal
4. **Type Safety**: Uso de Prisma para esquemas tipados
5. **Developer Experience**: Configuración dockerizada para desarrollo rápido

---

## Arquitectura de Capas

### Backend (Node.js + Express)

\`\`\`
┌─────────────────────────────────────┐
│ API Layer (Express) │
│ - Routing │
│ - Request/Response handling │
│ - CORS configuration │
└──────────────┬──────────────────────┘
│
┌──────────────▼──────────────────────┐
│ Middleware Layer │
│ - JWT Authentication │
│ - Role-based authorization │
│ - Request validation │
│ - Error handling │
└──────────────┬──────────────────────┘
│
┌──────────────▼──────────────────────┐
│ Controller Layer │
│ - Business logic orchestration │
│ - Input validation │
│ - Response formatting │
└──────────────┬──────────────────────┘
│
┌──────────────▼──────────────────────┐
│ Service Layer │
│ - Reusable business logic │
│ - Data transformation │
│ - External integrations │
└──────────────┬──────────────────────┘
│
┌──────────────▼──────────────────────┐
│ Data Access Layer (Prisma) │
│ - Database queries │
│ - Data models │
│ - Migrations │
└──────────────┬──────────────────────┘
│
┌──────────────▼──────────────────────┐
│ PostgreSQL Database │
└─────────────────────────────────────┘
\`\`\`

### Frontend (React + Vite)

\`\`\`
┌─────────────────────────────────────┐
│ React Components │
│ - UI Presentation │
│ - User interactions │
└──────────────┬──────────────────────┘
│
┌──────────────▼──────────────────────┐
│ State Management │
│ - TanStack Query (React Query) │
│ - Local state (useState) │
│ - URL state (React Router) │
└──────────────┬──────────────────────┘
│
┌──────────────▼──────────────────────┐
│ API Client (Axios) │
│ - HTTP requests │
│ - Token refresh logic │
│ - Error handling │
└──────────────┬──────────────────────┘
│
┌──────────────▼──────────────────────┐
│ Backend API (REST) │
└─────────────────────────────────────┘
\`\`\`

---

## Modelo de Datos

### Diagrama Entidad-Relación

\`\`\`mermaid
erDiagram
USER ||--o{ AGENDA : owns
USER ||--o{ AGENDA_USER : "is member of"
USER ||--o{ EVENT : creates
USER ||--o{ NOTIFICATION : receives

    AGENDA ||--o{ AGENDA_USER : "has members"
    AGENDA ||--o{ EVENT : contains

    EVENT ||--o{ EVENT : "recurring parent"
    EVENT ||--o{ EXCEPTION : "has exceptions"
    EVENT ||--o{ NOTIFICATION : "generates"

    USER {
        uuid id PK
        string email UK
        string password
        string name
        string avatar
        timestamp createdAt
        timestamp updatedAt
    }

    AGENDA {
        uuid id PK
        string name
        string description
        enum type
        string color
        string timezone
        uuid ownerId FK
        timestamp createdAt
        timestamp updatedAt
    }

    AGENDA_USER {
        uuid id PK
        uuid agendaId FK
        uuid userId FK
        enum role
        timestamp createdAt
        timestamp updatedAt
    }

    EVENT {
        uuid id PK
        string title
        string description
        string location
        uuid agendaId FK
        uuid creatorId FK
        timestamp startTime
        timestamp endTime
        boolean isAllDay
        enum status
        boolean isRecurring
        string recurrenceRule
        uuid parentEventId FK
        string color
        boolean isPrivate
        string timezone
        uuid approvedBy
        timestamp approvedAt
        timestamp createdAt
        timestamp updatedAt
    }

    EXCEPTION {
        uuid id PK
        uuid eventId FK
        timestamp exceptionDate
        string reason
        timestamp createdAt
    }

    NOTIFICATION {
        uuid id PK
        uuid userId FK
        enum type
        string title
        string message
        uuid eventId FK
        boolean isRead
        timestamp createdAt
    }

\`\`\`

### Enumeraciones

#### AgendaType

- \`PERSONAL\`: Agenda personal del usuario
- \`LABORAL\`: Agenda de trabajo con jerarquía CHIEF/EMPLOYEE
- \`EDUCATIVA\`: Agenda educativa con roles PROFESSOR/STUDENT
- \`FAMILIAR\`: Agenda familiar compartida

#### AgendaRole

- \`OWNER\`: Propietario de la agenda (control total)
- \`CHIEF\`: Jefe (puede aprobar eventos en agendas LABORAL)
- \`EMPLOYEE\`: Empleado (requiere aprobación en agendas LABORAL)
- \`PROFESSOR\`: Profesor (puede crear eventos en agendas EDUCATIVA)
- \`STUDENT\`: Estudiante (solo lectura en agendas EDUCATIVA)
- \`EDITOR\`: Editor (puede crear/editar eventos)
- \`VIEWER\`: Espectador (solo lectura)

#### EventStatus

- \`CONFIRMED\`: Evento confirmado y visible
- \`PENDING_APPROVAL\`: Evento pendiente de aprobación
- \`REJECTED\`: Evento rechazado
- \`CANCELLED\`: Evento cancelado

#### NotificationType

- \`EVENT_APPROVAL_REQUEST\`: Solicitud de aprobación de evento
- \`EVENT_APPROVED\`: Evento aprobado
- \`EVENT_REJECTED\`: Evento rechazado
- \`EVENT_STATUS_CHANGE\`: Cambio de estado del evento
- \`AGENDA_INVITATION\`: Invitación a agenda
- \`NEW_EVENT_NOTIFICATION\`: Nuevo evento creado
- \`EVENT_REMINDER\`: Recordatorio de evento

---

## Sistema de Autenticación

### Flujo de Autenticación JWT

\`\`\`mermaid
sequenceDiagram
participant C as Cliente
participant F as Frontend
participant B as Backend
participant DB as Database

    C->>F: Introduce credenciales
    F->>B: POST /api/auth/login
    B->>DB: Verificar usuario
    DB-->>B: Usuario encontrado
    B->>B: Validar contraseña (bcrypt)
    B->>B: Generar tokens JWT
    B-->>F: { accessToken, refreshToken, user }
    F->>F: Guardar tokens en localStorage
    F-->>C: Redirigir a Dashboard

    Note over F,B: Requests subsecuentes
    F->>B: GET /api/agendas<br/>Authorization: Bearer {token}
    B->>B: Validar token JWT
    B-->>F: Datos de agendas

    Note over F,B: Token expira
    F->>B: GET /api/events (token expirado)
    B-->>F: 401 Unauthorized
    F->>B: POST /api/auth/refresh<br/>{ refreshToken }
    B->>B: Validar refresh token
    B-->>F: { new accessToken }
    F->>B: GET /api/events<br/>(nuevo token)
    B-->>F: Datos de eventos

\`\`\`

### Configuración de Tokens

- **Access Token**: Expira en 24 horas
- **Refresh Token**: Expira en 7 días
- **Algoritmo**: HS256
- **Payload**: \`{ userId, iat, exp }\`

### Middleware de Autenticación

El middleware \`authenticateToken\` verifica:

1. Presencia del token en header \`Authorization\`
2. Validez y firma del token
3. Existencia del usuario en la base de datos
4. Adjunta el usuario a \`req.user\` para uso en controladores

---

## Matriz de Permisos

### Permisos por Tipo de Agenda

| Acción               | PERSONAL<br/>(OWNER/EDITOR/VIEWER) | LABORAL<br/>(CHIEF/EMPLOYEE)                      | EDUCATIVA<br/>(PROFESSOR/STUDENT) |
| -------------------- | ---------------------------------- | ------------------------------------------------- | --------------------------------- |
| Ver eventos          | ✅ Todos                           | ✅ Todos                                          | ✅ Todos                          |
| Crear evento         | ✅ OWNER, EDITOR                   | ✅ Todos (EMPLOYEE → PENDING)                     | ✅ Solo PROFESSOR                 |
| Editar evento propio | ✅ OWNER, EDITOR                   | ✅ EMPLOYEE (si pendiente)<br/>✅ CHIEF (siempre) | ✅ PROFESSOR                      |
| Eliminar evento      | ✅ OWNER                           | ✅ Creador + CHIEF                                | ✅ PROFESSOR                      |
| Aprobar/Rechazar     | ❌ N/A                             | ✅ Solo CHIEF                                     | ❌ N/A                            |
| Invitar usuarios     | ✅ OWNER                           | ✅ CHIEF                                          | ✅ PROFESSOR                      |
| Cambiar roles        | ✅ OWNER                           | ✅ CHIEF                                          | ✅ PROFESSOR                      |

### Flujo de Aprobación (Agenda LABORAL)

\`\`\`mermaid
stateDiagram-v2
[*] --> Draft: EMPLOYEE crea evento
Draft --> PENDING_APPROVAL: Guardar
PENDING_APPROVAL --> CONFIRMED: CHIEF aprueba
PENDING_APPROVAL --> REJECTED: CHIEF rechaza
CONFIRMED --> CANCELLED: Eliminar
REJECTED --> [*]
CANCELLED --> [*]

    note right of PENDING_APPROVAL
        - No visible en calendario
        - Genera notificación a CHIEF
        - EMPLOYEE puede editar/eliminar
    end note

    note right of CONFIRMED
        - Visible en calendario
        - Genera notificación a EMPLOYEE
        - Solo CHIEF puede modificar
    end note

\`\`\`

---

## Gestión de Eventos

### Eventos Recurrentes

Synapse soporta eventos recurrentes usando el estándar **iCalendar RRULE**.

#### Ejemplo de RRULE

\`\`\`javascript
// Reunión semanal todos los lunes a las 10:00
{
title: "Reunión de equipo",
startTime: "2024-01-15T10:00:00Z",
endTime: "2024-01-15T11:00:00Z",
isRecurring: true,
recurrenceRule: "FREQ=WEEKLY;BYDAY=MO;COUNT=10"
}
\`\`\`

#### Excepciones a la Recurrencia

Casos de uso:

- Cancelar una instancia específica de un evento recurrente
- Modificar la hora de una instancia particular

\`\`\`javascript
// Cancelar la reunión del 22 de enero
{
eventId: "uuid-of-recurring-event",
exceptionDate: "2024-01-22T10:00:00Z",
reason: "Festivo"
}
\`\`\`

### Detección de Conflictos

El backend verifica automáticamente conflictos antes de crear un evento:

\`\`\`javascript
// Pseudo-código del algoritmo
function checkConflicts(userId, startTime, endTime, agendaId) {
const conflicts = await prisma.event.findMany({
where: {
agendaId,
creatorId: userId,
status: 'CONFIRMED',
OR: [
// Nuevo evento empieza durante un evento existente
{ AND: [
{ startTime: { lte: startTime } },
{ endTime: { gte: startTime } }
]},
// Nuevo evento termina durante un evento existente
{ AND: [
{ startTime: { lte: endTime } },
{ endTime: { gte: endTime } }
]},
// Nuevo evento contiene un evento existente
{ AND: [
{ startTime: { gte: startTime } },
{ endTime: { lte: endTime } }
]}
]
}
});

return conflicts.length > 0;
}
\`\`\`

---

## Sistema de Notificaciones

### Tipos de Notificaciones

Las notificaciones se generan automáticamente en los siguientes casos:

1. **EVENT_APPROVAL_REQUEST**: Cuando un EMPLOYEE crea un evento
   - Destinatario: CHIEF de la agenda
2. **EVENT_APPROVED**: Cuando un CHIEF aprueba un evento
   - Destinatario: Creador del evento
3. **EVENT_REJECTED**: Cuando un CHIEF rechaza un evento
   - Destinatario: Creador del evento
4. **AGENDA_INVITATION**: Cuando se invita a un usuario a una agenda
   - Destinatario: Usuario invitado
5. **NEW_EVENT_NOTIFICATION**: Cuando se crea un nuevo evento
   - Destinatario: Todos los miembros de la agenda

### Flujo de Notificaciones

\`\`\`mermaid
graph LR
A[Acción del Usuario] --> B{Tipo de Acción}
B -->|Crear Evento| C[Generar Notificación]
B -->|Aprobar Evento| C
B -->|Rechazar Evento| C
B -->|Invitar Usuario| C

    C --> D[Guardar en DB]
    D --> E[Frontend Polling/WebSocket]
    E --> F[Mostrar Badge/Alerta]

\`\`\`

---

## Manejo de Zonas Horarias

### Estrategia

1. **Almacenamiento**: Todos los timestamps se guardan en **UTC** en la base de datos
2. **Transmisión**: Las API devuelven timestamps en formato ISO 8601 con UTC
3. **Visualización**: El frontend convierte a la zona horaria local del usuario

### Ejemplo de Flujo

\`\`\`javascript
// Backend (guardar evento)
const event = await prisma.event.create({
data: {
title: "Reunión",
startTime: new Date("2024-01-15T15:00:00Z"), // UTC
endTime: new Date("2024-01-15T16:00:00Z"), // UTC
timezone: "Europe/Madrid" // Metadata
}
});

// Frontend (mostrar evento)
import { format } from 'date-fns';

const localTime = format(
new Date(event.startTime), // Automáticamente convierte a local
'HH:mm'
);
// Si el usuario está en Madrid (UTC+1):
// Muestra: "16:00"
\`\`\`

### Campo \`timezone\` en Eventos

Almacena la zona horaria original del creador para:

- Mantener contexto histórico
- Detectar cambios de horario de verano
- Regenerar eventos recurrentes correctamente

---

## Decisiones de Diseño

### ¿Por qué Prisma?

- **Type Safety**: Generación automática de tipos para TypeScript/JavaScript
- **Migraciones**: Control de versiones del esquema de base de datos
- **Developer Experience**: Query builder intuitivo

### ¿Por qué TanStack Query?

- **Caching Inteligente**: Reduce requests innecesarios al backend
- ** Automatic Refetching**: Mantiene datos actualizados
- **Optimistic Updates**: Mejora la UX en operaciones CRUD

### ¿Por qué Docker?

- **Consistencia**: Mismo entorno en desarrollo, testing y producción
- **Aislamiento**: Cada servicio en su propio contenedor
- **Escalabilidad**: Fácil orquestación con Docker Compose o Kubernetes

---

## Próximas Mejoras

### Roadmap Técnico

- [ ] WebSockets para notificaciones en tiempo real
- [ ] Cache con Redis para sesiones
- [ ] Tests unitarios y de integración (Jest + Supertest)
- [ ] CI/CD con GitHub Actions
- [ ] Drag & Drop en vistas de calendario
- [ ] Exportar eventos a formato iCal
- [ ] Integración con Google Calendar / Outlook

---

**Última actualización**: Enero 2024  
**Mantenido por**: Synapse Team
