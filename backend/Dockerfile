# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Install OpenSSL for Prisma, which is required on Alpine
RUN apk add --no-cache openssl

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies, including devDependencies
RUN npm install

# Copy the rest of the application's code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# The command from docker-compose.yml will override this,
# but it serves as a good default for running the container directly.
CMD ["npm", "run", "dev"]
