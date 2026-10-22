FROM node:24-alpine

WORKDIR /app

RUN apk add --no-cache ca-certificates

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]