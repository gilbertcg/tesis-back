FROM node:19-alpine

WORKDIR /usr/src/app

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=cache,target=/root/.npm \ 
    npm i --force

# Run the application as a non-root user.
USER node

COPY . .

# Crear la carpeta de uploads y establecer permisos
RUN mkdir -p uploads && chown -R node:node uploads

EXPOSE 3000

# Use production node environment by default.
ENV NODE_ENV production

CMD ["npm", "run", "dev"]