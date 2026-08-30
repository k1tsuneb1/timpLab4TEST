# Этап 1: Сборка (Build)
FROM node:20-alpine AS build

WORKDIR /app

# Копируем файлы зависимостей и устанавливаем их
COPY package*.json ./
RUN npm install

# Копируем весь остальной код и запускаем сборку Vite
COPY . .
RUN npm run build

# Этап 2: Раздача статики (Production)
FROM nginx:alpine

# Копируем наш новый конфиг, заменяя стандартный
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Копируем собранные файлы
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]