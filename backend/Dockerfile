FROM node:20-slim

WORKDIR /app

# Install OpenSSL and CA certificates for Prisma runtime
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy package configurations
COPY package*.json ./

# Install packages
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

EXPOSE 5001

CMD ["npm", "run", "dev"]
