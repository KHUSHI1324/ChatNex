FROM node:18-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY . .
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install --legacy-peer-deps
EXPOSE 1000
CMD ["node", "index.js"]