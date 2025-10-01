# Используем образ node версии 20 как базовый для этапа сборки
FROM node:20 as build  

# Устанавливаем переменную окружения NODE_ENV
ENV NODE_ENV=production

# Устанавливаем рабочую директорию в контейнере
WORKDIR /opt/app/

# Копируем файлы package.json и package-lock.json (если есть)
COPY package*.json ./

# Устанавливаем зависимости, включая devDependencies
RUN npm ci

# Устанавливаем NestJS CLI глобально 
RUN npm install -g @nestjs/cli

# Копируем остальные файлы проекта
COPY . .

# Создаем папку для .env.production
RUN mkdir -p /opt/app/envs

# Копируем файл .env.production
COPY /envs/.env.production /opt/app/envs/.env.production

# Запускаем сборку проекта
RUN npm run build

# Используем образ node версии 20 как базовый для финального этапа
FROM node:20-slim

# Устанавливаем переменную окружения NODE_ENV
ENV NODE_ENV=production

# Устанавливаем OpenSSL и другие необходимые пакеты
RUN apt-get update -y && apt-get install -y openssl libssl-dev

# Устанавливаем рабочую директорию в контейнере
WORKDIR /opt/app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем только продакшн-зависимости
RUN npm ci --only=production

# Копируем собранный код и необходимые файлы из предыдущего этапа
COPY --from=build /opt/app/dist ./dist
COPY --from=build /opt/app/envs/.env.production  /opt/app/envs/.env.production
COPY --from=build /opt/app/config.json ./config.json

# Запускаем приложение
CMD ["node", "./dist/main.js"]