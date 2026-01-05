FROM node:18-alpine
WORKDIR /app
# We use this to install dependencies inside the container
COPY package.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]