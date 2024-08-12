FROM node:18-alpine

WORKDIR ./

COPY package*.json ./

RUN npm install --production

COPY . .

# Expose the port on which your app runs
EXPOSE 3000

# Command to run the app
CMD ["node", "index.js"]
