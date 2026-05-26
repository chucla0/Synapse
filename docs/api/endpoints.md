# 🔌 API Endpoints Reference

All requests should be made to the base URL: `https://synapse-nebo.onrender.com/api` (or `http://localhost:3000/api` locally).

## 🔑 Authentication

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/auth/register` | POST | 🔓 | Register a new user. |
| `/auth/login` | POST | 🔓 | Login and receive JWT tokens. |
| `/auth/google` | GET | 🔓 | Initiate Google OAuth flow. |
| `/auth/profile` | GET | 🔐 | Get current user's profile data. |
| `/auth/profile` | PUT | 🔐 | Update user name, bio, or links. |

## 📅 Agendas

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/agendas` | GET | 🔐 | List all agendas the user has access to. |
| `/agendas` | POST | 🔐 | Create a new agenda. |
| `/agendas/:id` | GET | 🔐 | Get full details of a specific agenda. |
| `/agendas/:id` | PUT | 🔐 | Update agenda settings (Owner/Chief). |
| `/agendas/:id` | DELETE | 🔐 | Delete the agenda and all its events. |
| `/agendas/:id/users` | POST | 🔐 | Invite a user to the agenda. |

## 📌 Events

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/events` | GET | 🔐 | Fetch events. Filter by `start`, `end`, and `agendaId`. |
| `/events` | POST | 🔐 | Create a new event. Supports RRULE for recurrence. |
| `/events/:id` | PUT | 🔐 | Update an existing event. |
| `/events/:id` | DELETE | 🔐 | Remove an event. |
| `/events/:id/approve` | POST | 🔐 | (Laboral) Chief approves a pending event. |

## 🔔 Notifications & Real-time

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/notifications` | GET | 🔐 | List recent notifications for the user. |
| `/notifications/:id/read` | POST | 🔐 | Mark a notification as read. |
| `/notifications/read-all` | POST | 🔐 | Clear all notifications. |

---

## 💡 Notes on Usage
- **Auth Headers**: Include the JWT in the header: `Authorization: Bearer <TOKEN>`.
- **Response Format**: All responses are JSON objects. Errors always include an `error` field and a `message` for debugging.
- **Filtering**: When GETing `/events`, use ISO strings for dates: `?start=2024-01-01T00:00:00Z&end=2024-01-31T23:59:59Z`.
