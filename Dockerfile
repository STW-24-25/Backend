FROM node:20-alpine

# Set working directory
WORKDIR /app

# Define build arguments
ARG MONGO_URI
ARG PORT=5000
ARG JWT_SECRET
ARG NODE_ENV=development

# Set environment variables from build arguments
ENV MONGO_URI=$MONGO_URI
ENV PORT=$PORT
ENV JWT_SECRET=$JWT_SECRET
ENV NODE_ENV=$NODE_ENV

# Copy package files first for better layer caching
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci

# Install nodemon globally for hot reloading
RUN npm install -g nodemon

# Copy source code (after dependency installation for better caching)
COPY . .

# Expose the port the app runs on
EXPOSE ${PORT}

# Install curl for healthcheck
RUN apk --no-cache add curl

# Health check to ensure the application is running
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD curl -f http://localhost:${PORT}/api/docs || exit 1

# Command to run the application in development mode
CMD ["npm", "run", "dev"]
