FROM node:19-alpine

WORKDIR /usr/src/app

# Instalar las herramientas necesarias para compilación
RUN apk add --no-cache \
    build-base \
    python3 \
    py3-pip \
    git \
    cmake


RUN apk update \
    && apk --no-cache --update add build-base 

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=cache,target=/root/.npm \ 
    npm i --force
    
RUN npm install --global whisper-node

USER node

COPY . .

EXPOSE 3000

ENV NODE_ENV production

CMD ["npm", "run", "dev"]