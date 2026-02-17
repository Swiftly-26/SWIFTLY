# Build stage
FROM node:20.19.0-alpine AS build

WORKDIR /app

# Copy package files including lock files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install all dependencies using npm install (not ci)
RUN npm install
RUN cd backend && npm install
RUN cd frontend && npm install

# Copy source code
COPY . .

# Build Angular app
RUN cd frontend && npx ng build --configuration production

# Production stage
FROM node:20.19.0-alpine

WORKDIR /app

# Copy built frontend
COPY --from=build /app/frontend/dist/frontend/browser ./frontend/dist/frontend/browser

# Copy backend
COPY --from=build /app/backend ./backend
COPY --from=build /app/package*.json ./
COPY --from=build /app/backend/package*.json ./backend/

# Install only production dependencies for backend
RUN cd backend && npm install --omit=dev

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "backend/server.js"]