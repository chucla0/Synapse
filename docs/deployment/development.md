# 💻 Local Development Setup

Follow these steps to set up Synapse for local development without Docker (running Node and React directly).

## 📋 Prerequisites
- **Node.js** (v18 or higher)
- **PostgreSQL** (Installed locally or using a tool like pgAdmin)
- **NPM** or **Yarn**

## 🛠️ Step-by-Step Configuration

### 1. Clone and Install
```bash
git clone <repository-url>
cd synapse-agenda
npm install # Optional: Install root dependencies
```

### 2. Database Setup
Create a PostgreSQL database (e.g., `synapse_dev`) and copy the environment file:
```bash
cp .env.example .env
```
Update `DATABASE_URL` in `.env`:
`DATABASE_URL="postgresql://user:password@localhost:5432/synapse_dev?schema=public"`

### 3. Backend Setup
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev # Apply migrations to your local DB
npm run dev # Starts server on port 3000
```

### 4. Frontend Setup
Open a new terminal:
```bash
cd frontend
npm install
npm run dev # Starts Vite on port 5173
```

## 🧪 Seeding Test Data
To populate the database with initial users and agendas for testing:
```bash
cd backend
npx prisma db seed
```

## 💡 Dev Tips
- **Prisma Studio**: Run `npx prisma studio` in the `backend` folder to view and edit your data in a GUI.
- **Environment Variables**: Always ensure `VITE_API_URL` in the frontend points to the backend (default: `http://localhost:3000`).
