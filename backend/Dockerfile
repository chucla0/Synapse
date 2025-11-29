# Stage 1: Builder
FROM node:18-alpine AS builder

# Install OpenSSL (required for Prisma)
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for prisma generate)
RUN npm install

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Stage 2: Production
FROM node:18-alpine

# Install OpenSSL (required for Prisma)
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy generated Prisma Client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy source code and prisma schema (for migrations)
COPY src ./src
COPY prisma ./prisma

# Expose port
EXPOSE 3000

# Default command (can be overridden)
CMD ["npm", "run", "start"]

