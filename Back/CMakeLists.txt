cmake_minimum_required(VERSION 3.10)
project(SupplyChainBackend)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED True)

# Ищем OpenSSL
find_package(OpenSSL REQUIRED)

# Скачиваем jwt-cpp (генератор токенов)
include(FetchContent)
FetchContent_Declare(
  jwt_cpp
  GIT_REPOSITORY https://github.com/Thalhammer/jwt-cpp.git
  GIT_TAG v0.7.0
)
FetchContent_MakeAvailable(jwt_cpp)

# Ищем библиотеку libpqxx для PostgreSQL
find_package(PkgConfig REQUIRED)
pkg_check_modules(PQXX REQUIRED libpqxx)

# Добавляем исполняемый файл
add_executable(backend main.cpp)

# Подключаем пути к заголовочным файлам и линкуем библиотеки
target_include_directories(backend PRIVATE ${PQXX_INCLUDE_DIRS})
target_link_libraries(backend PRIVATE 
    ${PQXX_LIBRARIES} 
    pthread
    OpenSSL::SSL 
    OpenSSL::Crypto 
    jwt-cpp::jwt-cpp
)
