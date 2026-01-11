# Multi-stage Docker build for Frontend
FROM node:18-alpine as builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

# Install serve to serve the built app
RUN npm install -g serve express

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Create a simple server
RUN echo 'const express = require("express"); \
const path = require("path"); \
const app = express(); \
const port = process.env.PORT || 3000; \
app.use(express.static(path.join(__dirname, "dist"))); \
app.get("*", (req, res) => { \
  res.sendFile(path.join(__dirname, "dist", "index.html")); \
}); \
app.listen(port, "0.0.0.0", () => { \
  console.log(`Frontend server running on http://0.0.0.0:${port}`); \
});' > server.js

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

# Start the server
CMD ["node", "server.js"]