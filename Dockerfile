FROM node:19-alpine

WORKDIR /usr/src/app

# Instalar las herramientas necesarias para la compilación
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    python3-pip \
    git \
    cmake \
    wget \
    curl

# Establecer el directorio de trabajo
WORKDIR /usr/src/app


RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=cache,target=/root/.npm \ 
    npm i --force
    
RUN npm install --global whisper-node

USER node

COPY . .

EXPOSE 3000

ENV NODE_ENV production

CMD ["npm", "run", "dev"]