FROM node:20-alpine

WORKDIR /app

# Install deps first (Docker layer caching)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S app && adduser -S app -u 1001 -G app
USER app

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "server.js"]
