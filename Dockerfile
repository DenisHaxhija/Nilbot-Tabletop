FROM node:22-slim
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production PORT=3000 BODY_SIZE_LIMIT=104857600
EXPOSE 3000
CMD ["node", "build"]
