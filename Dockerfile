# Use official Node.js image
FROM node:22-alpine

# Set working directory inside container
WORKDIR /app

# Copy package files first (for layer caching)
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy the rest of the source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Expose the port your app runs on
EXPOSE 3000

# Start the app
CMD ["npm", "run", "start"]