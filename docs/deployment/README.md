# 🚀 Deployment Overview

Synapse is designed to be highly portable. Depending on your needs, you can run it in three different modes:

## 🛣️ Choose your Path

### 1. [💻 Development](./development.md)
Ideal for developers who want to modify the source code. Runs Node and React directly on the host machine.
- **Tools**: Node, NPM, PostgreSQL local.
- **Speed**: Fastest for code changes (HMR enabled).

### 2. [🐳 Production (Docker)](./production.md)
The professional way to deploy. Uses containers to ensure the same environment in dev, staging, and production.
- **Tools**: Docker, Docker Compose.
- **Security**: Isolated containers and controlled resource limits.

### 3. [☁️ Cloud (Current)](./cloud.md)
How Synapse is currently hosted in the wild. Optimized for free tier availability and zero maintenance.
- **Infrastructure**: Vercel (FE), Render (BE), Neon (DB).
- **Scalability**: High availability within free tier limits.

---

## 🔑 Common Environment Variables

No matter the path, these variables are essential:

| Variable | Description | Default (Local) |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `JWT_SECRET` | Secret key for JWT signature | `synapse_secret` |
| `VITE_API_URL` | Frontend pointer to the API | `http://localhost:3000` |
| `GOOGLE_CLIENT_ID` | OAuth Client ID | Found in Google Console |
