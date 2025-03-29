FROM node:20 AS builder
WORKDIR /app
COPY package.json .
COPY package-lock.json .
RUN npm install

COPY . .
RUN npm run build

# Runtime stage - for lean production image
FROM node:20-alpine

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json


EXPOSE 5000
CMD ["npm", "run", "start"]