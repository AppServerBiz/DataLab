FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Expõe a porta que o server.ts usa (3001)
EXPOSE 3001

RUN mkdir -p data
# Comando para rodar com tsx (como no original) ou ts-node
CMD ["npm", "run", "dev"]
