FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    pkg-config \
    libpq-dev \
    libpqxx-dev \
    libssl-dev \
    libasio-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

# Создаем чистую папку для сборки, генерируем Makefile и собираем
RUN mkdir -p docker_build && cd docker_build && cmake .. && make

EXPOSE 8080

# Запускаем собранный файл
CMD ["./docker_build/backend"]