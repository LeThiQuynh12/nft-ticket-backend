FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
# Render sẽ set PORT tự động, đọc từ env
ENV PORT=5003
EXPOSE 5003
# Lệnh chạy production
CMD ["node", "server.js"]
