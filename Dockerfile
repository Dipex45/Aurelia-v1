# --- Stage 1: Build Static Assets & Bundled Server ---
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy application source
COPY . .

# Build Vite frontend assets and bundle TS server CJS executable
RUN npm run build

# --- Stage 2: Production Safe Target Container ---
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Install only production critical files
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled bundles and static assets from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/package.json ./package.json

# Expose default ingress port
EXPOSE 3000

# Start compiled secure server CJS gateway
CMD ["npm", "run", "start"]
