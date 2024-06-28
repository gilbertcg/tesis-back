FROM node:19-bullseye

# RUN apt-get update && apt-get install -y \
#     build-essential \
#     python3 \
#     python3-pip

# RUN pip install --upgrade pip && \
#     pip install wheel && \
#     pip install numpy

WORKDIR /usr/src/app

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=cache,target=/root/.npm \ 
    npm i --force
    
# RUN pip install openai-whisper

COPY . .

EXPOSE 3000

ENV NODE_ENV production


CMD ["npm", "run", "start"]
