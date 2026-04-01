# Use Node
FROM node:20-alpine

# App directory
WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build app
RUN npm run build

# Expose port
EXPOSE 8000

# Run app
CMD ["node", "dist/main.js"]