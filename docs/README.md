# 📚 Synapse Agenda Documentation

Welcome to the Synapse Agenda documentation. This guide provides a comprehensive overview of the system architecture, development workflows, and deployment strategies.

## 🗺️ Documentation Map

### [🏗️ Architecture](./architecture/README.md)
Understand the core design, technology stack, and logical structure of the system.
- [**📊 Data Models**](./architecture/models.md): ERD, Enums, and database structure.
- [**🎨 Design System**](./architecture/design.md): Visual identity and UX philosophy.
- [**🔄 System Flows**](./architecture/flows.md): Authentication, Google Sync, and Notification logic.
- **[🧪 Testing & CI/CD](./architecture/testing.md)**: Automated tests and GitHub Actions.

### [🚀 Deployment](./deployment/README.md)
Guides for setting up Synapse in various environments.
- **[💻 Local Development](./deployment/development.md)**: How to run Synapse on your machine.
- **[🐳 Production (Docker)](./deployment/production.md)**: Professional deployment using Docker Compose.
- **[☁️ Cloud Setup (Current)](./deployment/cloud.md)**: Details of the current Vercel + Render + Neon infrastructure.

### [🔌 API Reference](./api/endpoints.md)
Detailed list of all available backend endpoints and their usage.

---

## 🛠️ Core Tech Stack

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | React (Vite) | UI / Client-side Logic |
| **Backend** | Node.js (Express) | REST API / Business Logic |
| **Database** | PostgreSQL (Neon) | Persistent Storage |
| **ORM** | Prisma | Database Mapping & Migrations |
| **Real-time** | Socket.io | Live Updates & Notifications |
| **Auth** | JWT / Google OAuth | User Identity & Access |

---
*Created and maintained for the Synapse project.*
