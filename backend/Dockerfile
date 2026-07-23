FROM node:20-alpine

WORKDIR /app

# Copy package configurations
COPY package*.json ./
RUN apk add --no-cache openssl

# Install packages
RUN npm install

# Copy source codes
COPY . .

# Generate Prisma Client
RUN npx prisma generate

EXPOSE 5001

CMD ["npm", "run", "dev"]
