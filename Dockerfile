FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY pnpm-lock.yaml ./

RUN npm install -g pnpm && pnpm install

ENV NODE_OPTIONS="--max_old_space_size=4096"

COPY . .

COPY .env .env

RUN pnpm run compile

EXPOSE 80

CMD ["npx", "next", "start", "-p", "80"]