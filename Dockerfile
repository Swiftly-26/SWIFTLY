# Use Node.js 20.19 specifically
FROM node:20.19.0-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci --omit=dev
RUN cd backend && npm ci --omit=dev
RUN cd frontend && npm ci --omit=dev

# Copy source code
COPY . .

# Build Angular frontend
RUN cd frontend && npx ng build --configuration production

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "backend/server.js"]