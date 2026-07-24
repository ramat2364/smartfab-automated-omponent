FROM node:20-slim

WORKDIR /app

# Install OpenSSL and CA certificates for Prisma runtime
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN ln -s /usr/lib/x86_64-linux-gnu/libssl.so.3 /usr/lib/x86_64-linux-gnu/libssl.so.1.1 2>/dev/null || true
RUN ln -s /usr/lib/x86_64-linux-gnu/libcrypto.so.3 /usr/lib/x86_64-linux-gnu/libcrypto.so.1.1 2>/dev/null || true

# Copy package configurations
COPY package*.json ./

# Install packages
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

EXPOSE 5001

CMD ["sh", "-c", "npx prisma generate && npm run dev"]
