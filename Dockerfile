# ── STAGE 1: Build Frontend ─────────────────────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

# Copy package files first (better layer caching)
COPY frontend/package*.json ./

# Use npm install — works with or without package-lock.json
RUN npm install

# Copy frontend source and build
COPY frontend/ ./
RUN npm run build

# ── STAGE 2: Backend ─────────────────────────────────────────────────────────
FROM node:20-alpine AS backend

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Use npm install — works with or without package-lock.json
RUN npm install --omit=dev

# Copy backend source
COPY backend/ ./

# Copy built frontend into backend's public folder for serving
COPY --from=frontend-build /app/frontend/dist ./public

# Create directory for SQLite database
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Start backend
CMD ["node", "server.js"]