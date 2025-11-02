FROM node:20
WORKDIR /app
ENV NODE_ENV=development
RUN npm install -g nodemon
COPY package*.json ./
RUN npm install
# COPY . .
EXPOSE 5003
CMD ["npm", "run", "dev"]