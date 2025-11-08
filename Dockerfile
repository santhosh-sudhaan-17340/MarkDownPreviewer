FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application code
COPY . .

# Expose port (will be overridden by docker-compose)
EXPOSE 3000

# Default command (will be overridden by docker-compose)
CMD ["npm", "start"]
