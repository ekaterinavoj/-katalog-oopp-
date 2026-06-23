FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Ensure data and uploads directories exist
RUN mkdir -p data public/uploads

EXPOSE 3000

CMD ["node", "server.js"]
