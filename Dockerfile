FROM node:22-alpine

WORKDIR /app

# Install dependencies (cached layer)
COPY package.json ./
RUN npm install --omit=dev

# Copy source
COPY src/     ./src/
COPY scripts/ ./scripts/
COPY static/  ./static/

EXPOSE 8000

CMD ["node", "src/server.js"]
