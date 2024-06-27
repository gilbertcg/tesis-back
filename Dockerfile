FROM node:19-alpine

WORKDIR /usr/src/app

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=cache,target=/root/.npm \ 
    npm i --force
    
RUN npm install --global whisper-node

# Run the application as a non-root user.
USER node

COPY . .

EXPOSE 3000

# Use production node environment by default.
ENV NODE_ENV production

CMD ["npm", "run", "dev"]