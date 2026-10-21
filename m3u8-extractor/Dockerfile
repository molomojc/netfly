# Lightweight image: no headless browser needed (Movy client extraction).
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy source
COPY server.js ./
COPY movy.js ./

# Run as the unprivileged node user that ships with the base image
USER node

EXPOSE 3001

CMD ["node", "server.js"]
