FROM node:20-alpine

WORKDIR /app

# Copy package configurations
COPY package*.json ./

# Install packages
RUN npm install

# Copy source codes
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
