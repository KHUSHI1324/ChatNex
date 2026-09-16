FROM node:18-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY . .
RUN npm install --legacy-peer-deps
EXPOSE 1000
CMD ["node", "index.js"]