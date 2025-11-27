# API Documentation - Synapse Agenda

Documentación completa de los endpoints REST del backend de Synapse Agenda.

**Base URL**: `http://localhost:3000/api`

---

## Tabla de Contenidos

- [Autenticación](#autenticación)
- [Agendas](#agendas)
- [Eventos](#eventos)
- [Notificaciones](#notificaciones)
- [Códigos de Error](#códigos-de-error)

---

## Autenticación

Todos los endpoints excepto `/auth/login` y `/auth/register` requieren autenticación mediante JWT.

**Header requerido**:
\`\`\`
Authorization: Bearer <access_token>
\`\`\`

### POST /auth/register

Registrar un nuevo usuario.

**Request Body**:
\`\`\`json
{
"name": "Juan Pérez",
"email": "juan@example.com",
"password": "password123"
}
\`\`\`

**Response** (201 Created):
\`\`\`json
{
"message": "Registration successful",
"user": {
"id": "uuid",
"name": "Juan Pérez",
"email": "juan@example.com",
"avatar": null,
"createdAt": "2024-01-15T10:30:00.000Z"
},
"tokens": {
"accessToken": "eyJhbGciOiJIUzI1NiIs...",
"refreshToken": "eyJhbGciOiJIUzI1NiIs...",
"expiresIn": "24h"
}
}
\`\`\`

**Errores**:

- `400`: Email, password o name faltantes
- `409`: Usuario ya existe

---

### POST /auth/login

Iniciar sesión con credenciales.

**Request Body**:
\`\`\`json
{
"email": "juan@example.com",
"password": "password123"
}
\`\`\`

**Response** (200 OK):
\`\`\`json
{
"message": "Login successful",
"user": {
"id": "uuid",
"name": "Juan Pérez",
"email": "juan@example.com",
"avatar": null,
"createdAt": "2024-01-15T10:30:00.000Z"
},
"tokens": {
"accessToken": "eyJhbGciOiJIUzI1NiIs...",
"refreshToken": "eyJhbGciOiJIUzI1NiIs...",
"expiresIn": "24h"
}
}
\`\`\`

**Errores**:

- `400`: Email o password faltantes
- `401`: Credenciales inválidas

---

### POST /auth/refresh

Renovar el access token usando el refresh token.

**Request Body**:
\`\`\`json
{
"refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
\`\`\`

**Response** (200 OK):
\`\`\`json
{
"message": "Token refreshed successfully",
"tokens": {
"accessToken": "eyJhbGciOiJIUzI1NiIs...",
"expiresIn": "24h"
}
}
\`\`\`

**Errores**:

- `400`: Refresh token faltante
- `401`: Refresh token inválido o expirado

---

### GET /auth/profile

Obtener el perfil del usuario autenticado.

**Headers**:
\`\`\`
Authorization: Bearer <access_token>
\`\`\`

**Response** (200 OK):
\`\`\`json
{
"user": {
"id": "uuid",
"name": "Juan Pérez",
"email": "juan@example.com",
"avatar": null
}
}
\`\`\`

**Errores**:

- `401`: Token inválido o expirado

---

## Agendas

### GET /agendas

Obtener todas las agendas del usuario (propias y compartidas).

**Headers**:
\`\`\`
Authorization: Bearer <access_token>
\`\`\`

**Response** (200 OK):
\`\`\`json
{
"agendas": [
{
"id": "uuid",
"name": "Trabajo",
"description": "Agenda laboral",
"type": "LABORAL",
"color": "#3B82F6",
"timezone": "Europe/Madrid",
"ownerId": "uuid",
"userRole": "OWNER",
"createdAt": "2024-01-15T10:30:00.000Z",
"updatedAt": "2024-01-15T10:30:00.000Z",
"owner": {
"id": "uuid",
"name": "Juan Pérez",
"email": "juan@example.com",
"avatar": null
},
"agendaUsers": [
{
"id": "uuid",
"role": "EMPLOYEE",
"user": {
"id": "uuid2",
"name": "María García",
"email": "maria@example.com",
"avatar": null
}
}
],
"\_count": {
"events": 15
}
}
]
}
\`\`\`

---

### POST /agendas

Crear una nueva agenda.

**Headers**:
\`\`\`
Authorization: Bearer <access_token>
\`\`\`

**Request Body**:
\`\`\`json
{
"name": "Mi Agenda Personal",
"description": "Agenda para eventos personales",
"type": "PERSONAL",
"color": "#10B981",
"timezone": "Europe/Madrid"
}
\`\`\`

**Response** (201 Created):
\`\`\`json
{
"message": "Agenda created successfully",
"agenda": {
"id": "uuid",
"name": "Mi Agenda Personal",
"description": "Agenda para eventos personales",
"type": "PERSONAL",
"color": "#10B981",
"timezone": "Europe/Madrid",
"ownerId": "uuid",
"userRole": "OWNER",
"createdAt": "2024-01-15T10:30:00.000Z",
"updatedAt": "2024-01-15T10:30:00.000Z",
"owner": {
"id": "uuid",
"name": "Juan Pérez",
"email": "juan@example.com",
"avatar": null
}
}
}
\`\`\`

**Errores**:

- `400`: Nombre de agenda faltante

---

### GET /agendas/:agendaId

Obtener detalles de una agenda específica.

**Headers**:
\`\`\`
Authorization: Bearer <access_token>
\`\`\`

**Response** (200 OK):
\`\`\`json
{
"agenda": {
"id": "uuid",
"name": "Trabajo",
"description": "Agenda laboral",
"type": "LABORAL",
"color": "#3B82F6",
"timezone": "Europe/Madrid",
"ownerId": "uuid",
"userRole": "CHIEF",
"createdAt": "2024-01-15T10:30:00.000Z",
"updatedAt": "2024-01-15T10:30:00.000Z",
"owner": { ... },
"agendaUsers": [ ... ],
"\_count": {
"events": 15
}
}
}
\`\`\`

**Errores**:

- `404`: Agenda no encontrada
- `403`: Sin permisos de acceso

---

### PUT /agendas/:agendaId

Actualizar una agenda (requiere rol OWNER o EDITOR).

**Headers**:
\`\`\`
Authorization: Bearer <access_token>
\`\`\`

**Request Body** (todos los campos opcionales):
\`\`\`json
{
"name": "Trabajo - Actualizado",
"description": "Nueva descripción",
"color": "#EF4444",
"timezone": "America/New_York"
}
\`\`\`

**Response** (200 OK):
\`\`\`json
{
"message": "Agenda updated successfully",
"agenda": { ... }
}
\`\`\`

**Errores**:

- `403`: Sin permisos (requiere OWNER o EDITOR)
- `404`: Agenda no encontrada

---

### DELETE /agendas/:agendaId

Eliminar una agenda (solo OWNER).

**Headers**:
\`\`\`
Authorization: Bearer <access_token>
\`\`\`

**Response** (200 OK):
\`\`\`json
{
"message": "Agenda deleted successfully"
}
\`\`\`

**Errores**:

- `403`: Sin permisos (requiere OWNER)
- `404`: Agenda no encontrada

---

### POST /agendas/:agendaId/users

Agregar un usuario a la agenda (solo OWNER).

**Headers**:
\`\`\`
Authorization: Bearer <access_token>
\`\`\`

**Request Body**:
\`\`\`json
{
"email": "nuevo@example.com",
"role": "EMPLOYEE"
}
\`\`\`

**Response** (201 Created):
\`\`\`json
{
"message": "User added to agenda successfully",
"agendaUser": {
"id": "uuid",
"agendaId": "uuid",
"userId": "uuid",
"role": "EMPLOYEE",
"user": {
"id": "uuid",
"name": "Nuevo Usuario",
"email": "nuevo@example.com",
"avatar": null
}
}
}
\`\`\`

**Errores**:

- `403`: Sin permisos (requiere OWNER)
- `404`: Usuario no encontrado
- `409`: Usuario ya es miembro

---

## Eventos

### GET /events

Obtener eventos (con filtros opcionales).

**Headers**:
\`\`\`
Authorization: Bearer <access_token>
\`\`\`

**Query Parameters** (todos opcionales):

- `agendaId`: Filtrar por ID de agenda
- `startDate`: Fecha de inicio (ISO 8601)
- `endDate`: Fecha de fin (ISO 8601)
- `status`: Filtrar por estado (CONFIRMED, PENDING_APPROVAL, etc.)

**Ejemplo**:
\`\`\`
GET /api/events?agendaId=uuid&startDate=2024-01-01&endDate=2024-01-31
\`\`\`

**Response** (200 OK):
\`\`\`json
{
"events": [
{
"id": "uuid",
"title": "Reunión de equipo",
"description": "Revisión semanal",
"location": "Sala de conferencias",
"agendaId": "uuid",
"creatorId": "uuid",
"startTime": "2024-01-15T10:00:00.000Z",
"endTime": "2024-01-15T11:00:00.000Z",
"isAllDay": false,
"status": "CONFIRMED",
"isRecurring": false,
"recurrenceRule": null,
"parentEventId": null,
"color": "#3B82F6",
"isPrivate": false,
"timezone": "Europe/Madrid",
"approvedBy": null,
"approvedAt": null,
"createdAt": "2024-01-10T08:00:00.000Z",
"updatedAt": "2024-01-10T08:00:00.000Z",
"agenda": {
"id": "uuid",
"name": "Trabajo",
"color": "#3B82F6",
"type": "LABORAL"
},
"creator": {
"id": "uuid",
"name": "Juan Pérez",
"email": "juan@example.com",
"avatar": null
}
}
]
}
\`\`\`

---

### POST /events

Crear un nuevo evento.

> **Nota**: La lógica de negocio determina automáticamente el estado según el tipo de agenda y rol del usuario.

**Headers**:
\`\`\`
Authorization: Bearer <access_token>
\`\`\`

**Request Body**:
\`\`\`json
{
"title": "Reunión importante",
"description": "Discutir proyecto",
"location": "Oficina principal",
"agendaId": "uuid",
"startTime": "2024-01-20T15:00:00.000Z",
"endTime": "2024-01-20T16:00:00.000Z",
"isAllDay": false,
"isRecurring": false,
"recurrenceRule": null,
"color": "#F59E0B",
"isPrivate": false,
"timezone": "Europe/Madrid"
}
\`\`\`

**Response** (201 Created):
\`\`\`json
{
"message": "Event created successfully",
"event": { ... }
}
\`\`\`

**Errores**:

- `400`: Campos requeridos faltantes
- `403`: Sin permisos para crear eventos
- `409`: Conflicto de horario detectado

**Ejemplo de error de conflicto**:
\`\`\`json
{
"error": "Time conflict",
"message": "You have another event scheduled at this time",
"conflicts": [
{
"id": "uuid",
"title": "Otra reunión",
"startTime": "2024-01-20T14:30:00.000Z",
"endTime": "2024-01-20T15:30:00.000Z"
}
]
}
\`\`\`

---

### POST /events/:eventId/approve

Aprobar un evento pendiente (solo para agendas LABORAL, requiere rol CHIEF).

**Headers**:
\`\`\`
Authorization: Bearer <access_token>
\`\`\`

**Response** (200 OK):
\`\`\`json
{
"message": "Event approved successfully",
"event": {
"id": "uuid",
"title": "Reunión",
"status": "CONFIRMED",
"approvedBy": "uuid-of-chief",
"approvedAt": "2024-01-15T12:00:00.000Z",
...
}
}
\`\`\`

**Errores**:

- `403`: Sin permisos (requiere CHIEF)
- `404`: Evento no encontrado

---

### POST /events/:eventId/reject

Rechazar un evento pendiente.

**Headers**:
\`\`\`
Authorization: Bearer <access_token>
\`\`\`

**Request Body** (opcional):
\`\`\`json
{
"reason": "Conflicto de horarios"
}
\`\`\`

**Response** (200 OK):
\`\`\`json
{
"message": "Event rejected successfully",
"event": {
"id": "uuid",
"status": "REJECTED",
...
}
}
\`\`\`

---

## Notificaciones

### GET /notifications

Obtener todas las notificaciones del usuario.

**Headers**:
\`\`\`
Authorization: Bearer <access_token>
\`\`\`

**Query Parameters** (opcionales):

- `limit`: Número máximo de resultados (default: 50)
- `offset`: Desplazamiento para paginación (default: 0)

**Response** (200 OK):
\`\`\`json
{
"notifications": [
{
"id": "uuid",
"userId": "uuid",
"type": "EVENT_APPROVED",
"title": "Event Approved",
"message": "Your event \"Reunión\" has been approved",
"eventId": "uuid",
"isRead": false,
"createdAt": "2024-01-15T12:00:00.000Z",
"event": {
"id": "uuid",
"title": "Reunión",
"startTime": "2024-01-20T15:00:00.000Z",
"endTime": "2024-01-20T16:00:00.000Z"
}
}
],
"pagination": {
"total": 10,
"limit": 50,
"offset": 0
}
}
\`\`\`

---

### GET /notifications/unread

Obtener el conteo de notificaciones no leídas.

**Headers**:
\`\`\`
Authorization: Bearer <access_token>
\`\`\`

**Response** (200 OK):
\`\`\`json
{
"unreadCount": 5
}
\`\`\`

---

### PUT /notifications/:notificationId/read

Marcar una notificación como leída.

**Headers**:
\`\`\`
Authorization: Bearer <access_token>
\`\`\`

**Response** (200 OK):
\`\`\`json
{
"message": "Notification marked as read",
"notification": {
"id": "uuid",
"isRead": true,
...
}
}
\`\`\`

---

### PUT /notifications/read-all

Marcar todas las notificaciones como leídas.

**Headers**:
\`\`\`
Authorization: Bearer <access_token>
\`\`\`

**Response** (200 OK):
\`\`\`json
{
"message": "All notifications marked as read"
}
\`\`\`

---

## Códigos de Error

| Código | Significado           | Ejemplo                                               |
| ------ | --------------------- | ----------------------------------------------------- |
| 400    | Bad Request           | Campos requeridos faltantes                           |
| 401    | Unauthorized          | Token inválido o expirado                             |
| 403    | Forbidden             | Sin permisos para la acción                           |
| 404    | Not Found             | Recurso no encontrado                                 |
| 409    | Conflict              | Conflicto de datos (email duplicado, horario ocupado) |
| 500    | Internal Server Error | Error del servidor                                    |

### Formato de Error

\`\`\`json
{
"error": "Error Title",
"message": "Detailed error message"
}
\`\`\`

---

## Ejemplos de Uso

### Flujo Completo: Registro → Login → Crear Agenda → Crear Evento

\`\`\`bash

# 1. Registrar usuario

curl -X POST http://localhost:3000/api/auth/register \\
-H "Content-Type: application/json" \\
-d '{
"name": "Juan Pérez",
"email": "juan@example.com",
"password": "password123"
}'

# Guardar el accessToken de la respuesta

TOKEN="eyJhbGciOiJIUzI1NiIs..."

# 2. Crear agenda

curl -X POST http://localhost:3000/api/agendas \\
-H "Authorization: Bearer $TOKEN" \\
-H "Content-Type: application/json" \\
-d '{
"name": "Mi Agenda",
"type": "PERSONAL",
"color": "#10B981"
}'

# Guardar el agendaId de la respuesta

AGENDA_ID="uuid-de-la-agenda"

# 3. Crear evento

curl -X POST http://localhost:3000/api/events \\
-H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Reunión importante",
    "agendaId": "'"$AGENDA_ID"'",
"startTime": "2024-01-20T15:00:00Z",
"endTime": "2024-01-20T16:00:00Z"
}'
\`\`\`

---

**Última actualización**: NOVIEMBRE 2025
**Versión API**: v1  
**Contacto**: iizan.cruz@gmail.com
