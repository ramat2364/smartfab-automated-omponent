FROM node:20-slim

WORKDIR /app

ENV PRISMA_HIDE_UPDATE_MESSAGE=true

# Install OpenSSL and CA certificates for Prisma runtime
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy package configurations
COPY package*.json ./

# Install packages
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client and build TypeScript
RUN npx prisma generate && npm run build

EXPOSE 5001

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
