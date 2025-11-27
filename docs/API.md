# API Reference

Base URL: `/api`

## Auth

| Method | Endpoint         | Description              |
| ------ | ---------------- | ------------------------ |
| POST   | `/auth/register` | Register new user        |
| POST   | `/auth/login`    | Login user               |
| POST   | `/auth/refresh`  | Refresh access token     |
| GET    | `/auth/profile`  | Get current user profile |
| PUT    | `/auth/profile`  | Update profile           |

## Agendas

| Method | Endpoint                          | Description                  |
| ------ | --------------------------------- | ---------------------------- |
| GET    | `/agendas`                        | List all agendas             |
| POST   | `/agendas`                        | Create agenda                |
| GET    | `/agendas/:id`                    | Get agenda details           |
| PUT    | `/agendas/:id`                    | Update agenda (Owner/Editor) |
| DELETE | `/agendas/:id`                    | Delete agenda (Owner)        |
| POST   | `/agendas/:id/users`              | Add user to agenda           |
| DELETE | `/agendas/:id/users/:userId`      | Remove user                  |
| PUT    | `/agendas/:id/users/:userId/role` | Update user role             |
| POST   | `/agendas/invitations/accept`     | Accept invitation            |
| POST   | `/agendas/invitations/decline`    | Decline invitation           |

## Events

| Method | Endpoint              | Description                                 |
| ------ | --------------------- | ------------------------------------------- |
| GET    | `/events`             | List events (filters: start, end, agendaId) |
| POST   | `/events`             | Create event                                |
| GET    | `/events/:id`         | Get event details                           |
| PUT    | `/events/:id`         | Update event                                |
| DELETE | `/events/:id`         | Delete event                                |
| POST   | `/events/:id/approve` | Approve event (Chief only)                  |
| POST   | `/events/:id/reject`  | Reject event (Chief only)                   |

## Notifications

| Method | Endpoint                  | Description              |
| ------ | ------------------------- | ------------------------ |
| GET    | `/notifications`          | List notifications       |
| GET    | `/notifications/:id`      | Get notification details |
| POST   | `/notifications/:id/read` | Mark as read             |
| POST   | `/notifications/read-all` | Mark all as read         |

## Uploads & Links

| Method | Endpoint       | Description            |
| ------ | -------------- | ---------------------- |
| POST   | `/uploads`     | Upload file attachment |
| DELETE | `/uploads/:id` | Delete attachment      |
| POST   | `/links`       | Add link to event      |
| DELETE | `/links/:id`   | Remove link            |
