# Synapse Agenda

**Advanced Collaborative Calendar & Workflow Manager**

Synapse Agenda is a full-stack application designed for complex scheduling needs, featuring multi-agenda support, role-based permissions, and real-time notifications.

![Synapse Logo](./synapse_title.jpg)

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (optional, for local dev)

### Installation

```bash
git clone <repository-url>
cd synapse-agenda
cp .env.example .env
docker-compose up -d --build
```

Access the app at `http://localhost:5173`.

## 📚 Documentation

- [**Architecture & Database**](./docs/ARCHITECTURE.md): System design, data models, and permissions.
- [**API Reference**](./docs/API.md): List of backend endpoints.
- [**User Manual & Testing**](./docs/MANUAL.md): Guides for features and testing flows.

## ✨ Key Features

- **Multi-Agenda System**: Personal, Work, Educational, and Family calendars.
- **Role-Based Access**: Granular permissions (Owner, Chief, Employee, Professor, Student).
- **Event Approval Workflow**: "Laboral" agendas require Chief approval for Employee events.
- **Real-time Notifications**: Alerts for invites, approvals, rejections, and deletions.
- **Advanced Scheduling**: Recurring events (RRULE), timezone support, and conflict detection.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, TanStack Query, Tailwind CSS (optional).
- **Backend**: Node.js, Express, Prisma ORM.
- **Database**: PostgreSQL.
- **Infrastructure**: Docker, Nginx.

## 🧪 Testing

Run the automated browser tests or follow the manual verification steps in [docs/MANUAL.md](./docs/MANUAL.md).

---

**Contact**: iizan.cruzz@gmail.com
