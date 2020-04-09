FROM node:10
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm ci --only=production
COPY src src/
EXPOSE 80
ENV NODE_PATH=src NODE_ENV=production
CMD ["node", "src/index.js"]