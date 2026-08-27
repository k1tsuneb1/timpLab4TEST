#include "crow_all.h"
#include <pqxx/pqxx>
#include <iostream>
#include <string>
#include <jwt-cpp/jwt.h>

using namespace std;

// Данные для подключения к твоему локальному PostgreSQL
const string DB_CONN = "dbname=logSecure user=postgres password=3462 host=localhost port=5432";

int main() {
    // Инициализируем приложение с поддержкой CORS (чтобы React не ругался)
    crow::App<crow::CORSHandler> app;

    // Настройка CORS (разрешаем запросы с любого источника)
    auto& cors = app.get_middleware<crow::CORSHandler>();
    cors.global()
        .headers("X-Custom-Header", "Upgrade-Insecure-Requests", "Content-Type", "Authorization")
        .methods("POST"_method, "GET"_method, "PUT"_method, "DELETE"_method, "OPTIONS"_method)
        .origin("*");

    // GET: Получение списка инцидентов для дашборда
    CROW_ROUTE(app, "/api/incidents").methods(crow::HTTPMethod::GET)
    ([]() {
        try {
            pqxx::connection c(DB_CONN);
            pqxx::work w(c);
            
            // Выбираем данные из БД
            pqxx::result r = w.exec(
                "SELECT id, description, status, severity_score, created_at FROM incidents ORDER BY created_at DESC"
            );

            // Формируем JSON ответ с помощью встроенного в Crow инструмента
            crow::json::wvalue::list jsonArray;
            for (auto const& row : r) {
                crow::json::wvalue incident;
                incident["id"] = row[0].as<int>();
                incident["description"] = row[1].as<string>();
                incident["status"] = row[2].as<string>();
                
                // Проверка на NULL, так как severity_score вычисляется триггером
                if (!row[3].is_null()) {
                    incident["severity_score"] = row[3].as<double>();
                } else {
                    incident["severity_score"] = 0;
                }
                
                incident["date"] = row[4].as<string>();
                jsonArray.push_back(std::move(incident));
            }
            
            return crow::response(crow::json::wvalue(jsonArray));
        } catch (const exception& e) {
            cerr << "Ошибка БД: " << e.what() << endl;
            return crow::response(500, R"({"error": "Внутренняя ошибка сервера"})");
        }
    });

    // POST: Добавление нового инцидента с фронтенда
    CROW_ROUTE(app, "/api/incidents").methods(crow::HTTPMethod::POST)
    ([](const crow::request& req) {
        try {
            // Парсим входящий JSON от React
            // Парсим входящий JSON от React
            auto body = crow::json::load(req.body);
            if (!body) {
                return crow::response(400, R"({"error": "Неверный формат JSON"})");
            }

            // Безопасное чтение: если пришла строка, мы приводим её к числу
            int emp_id = 0;
            if (body["employeeId"].t() == crow::json::type::Number) {
                emp_id = body["employeeId"].i();
            } else if (body["employeeId"].t() == crow::json::type::String) {
                emp_id = stoi(body["employeeId"].s());
            }

            int vuln_id = 0;
            if (body["vulnerabilityId"].t() == crow::json::type::Number) {
                vuln_id = body["vulnerabilityId"].i();
            } else if (body["vulnerabilityId"].t() == crow::json::type::String) {
                vuln_id = stoi(body["vulnerabilityId"].s());
            }

            string desc = body["description"].s();
            string status = body["status"].s();

            // Подключаемся к БД и выполняем вставку
            pqxx::connection c(DB_CONN);
            pqxx::work w(c);
            
            // Защита от SQL-инъекций: используем параметризованный запрос
            w.exec_params(
                "INSERT INTO incidents (employee_id, vulnerability_type_id, description, status) VALUES ($1, $2, $3, $4)",
                emp_id, vuln_id, desc, status
            );
            w.commit(); // Сохраняем изменения

            // Уровень угрозы (severity_score) рассчитается сам благодаря триггеру в Postgres!
            
            return crow::response(201, R"({"message": "Инцидент успешно добавлен"})");

        } catch (const exception& e) {
            cerr << "Ошибка при вставке: " << e.what() << endl;
            return crow::response(500, R"({"error": "Ошибка при сохранении в БД"})");
        }
    });

    // POST: Авторизация и выдача JWT
    CROW_ROUTE(app, "/api/auth/login").methods(crow::HTTPMethod::POST)
    ([](const crow::request& req) {
        try {
            auto body = crow::json::load(req.body);
            if (!body) return crow::response(400, R"({"error": "Неверный запрос"})");

            string username = body["username"].s();
            string password = body["password"].s();

            pqxx::connection c(DB_CONN);
            pqxx::work w(c);

            // Магия pgcrypto: функция crypt() сама возьмет соль из хэша в базе и проверит пароль!
            pqxx::result r = w.exec_params(
                "SELECT id, role FROM employees WHERE username = $1 AND password_hash = crypt($2, password_hash)",
                username, password
            );

            // Если строк нет, значит логин или пароль неверные
            if (r.empty()) {
                return crow::response(401, R"({"error": "Неверный логин или пароль"})");
            }

            // Пользователь найден, вытаскиваем его данные
            int user_id = r[0][0].as<int>();
            string role = r[0][1].as<string>();

            // Генерируем JWT токен
            auto token = jwt::create()
                .set_issuer("logistics_sec_app")
                .set_type("JWS")
                .set_payload_claim("user_id", jwt::claim(std::to_string(user_id)))
                .set_payload_claim("role", jwt::claim(role))
                // Токен живет 24 часа
                .set_expires_at(std::chrono::system_clock::now() + std::chrono::hours(24))
                // Секретный ключ для подписи (в реальном проекте должен лежать в переменных окружения)
                .sign(jwt::algorithm::hs256{"super_secret_lab_key_123"});

            // Возвращаем токен клиенту в формате JSON
            crow::json::wvalue response_json;
            response_json["token"] = token;
            return crow::response(200, response_json);

        } catch (const exception& e) {
            cerr << "Ошибка авторизации: " << e.what() << endl;
            return crow::response(500, R"({"error": "Ошибка сервера"})");
        }
    });

    // PUT: Обновление статуса инцидента
    CROW_ROUTE(app, "/api/incidents/<int>").methods(crow::HTTPMethod::PUT)
    ([](const crow::request& req, int incident_id) {
        try {
            auto body = crow::json::load(req.body);
            if (!body) return crow::response(400, R"({"error": "Неверный формат JSON"})");

            string new_status = body["status"].s();

            pqxx::connection c(DB_CONN);
            pqxx::work w(c);

            // Обновляем статус инцидента по его ID
            pqxx::result r = w.exec_params(
                "UPDATE incidents SET status = $1 WHERE id = $2 RETURNING id",
                new_status, incident_id
            );

            // Если ничего не вернулось, значит инцидента с таким ID нет
            if (r.empty()) {
                return crow::response(404, R"({"error": "Инцидент не найден"})");
            }

            w.commit();
            return crow::response(200, R"({"message": "Статус успешно обновлен"})");

        } catch (const exception& e) {
            cerr << "Ошибка обновления: " << e.what() << endl;
            return crow::response(500, R"({"error": "Ошибка при обновлении в БД"})");
        }
    });

    // GET: Получение подробной информации об одном инциденте
    CROW_ROUTE(app, "/api/incidents/<int>").methods(crow::HTTPMethod::GET)
    ([](int incident_id) {
        try {
            pqxx::connection c(DB_CONN);
            pqxx::work w(c);
            
            // Используем JOIN, чтобы подтянуть данные из других таблиц (сотрудники и уязвимости)
            pqxx::result r = w.exec_params(
                "SELECT i.id, i.description, i.status, i.severity_score, i.created_at, "
                "e.username, v.name AS vuln_name, v.base_risk_score "
                "FROM incidents i "
                "LEFT JOIN employees e ON i.employee_id = e.id "
                "LEFT JOIN vulnerability_types v ON i.vulnerability_type_id = v.id "
                "WHERE i.id = $1",
                incident_id
            );

            if (r.empty()) {
                return crow::response(404, R"({"error": "Инцидент не найден"})");
            }

            auto row = r[0];
            crow::json::wvalue incident;
            incident["id"] = row[0].as<int>();
            incident["description"] = row[1].as<string>();
            incident["status"] = row[2].as<string>();
            incident["severity_score"] = row[3].is_null() ? 0 : row[3].as<double>();
            incident["date"] = row[4].as<string>();
            
            // Данные из связанных таблиц
            incident["employee_username"] = row[5].is_null() ? "Неизвестно" : row[5].as<string>();
            incident["vulnerability_name"] = row[6].is_null() ? "Неизвестно" : row[6].as<string>();
            incident["base_risk_score"] = row[7].is_null() ? 0 : row[7].as<int>();

            return crow::response(incident);

        } catch (const exception& e) {
            cerr << "Ошибка БД (получение инцидента): " << e.what() << endl;
            return crow::response(500, R"({"error": "Внутренняя ошибка сервера"})");
        }
    });

    // DELETE: Удаление инцидента (Только для Администратора)
    CROW_ROUTE(app, "/api/incidents/<int>").methods(crow::HTTPMethod::DELETE)
    ([](const crow::request& req, int incident_id) {
        // 1. Проверяем наличие заголовка Authorization
        string auth_header = req.get_header_value("Authorization");
        if (auth_header.empty() || auth_header.substr(0, 7) != "Bearer ") {
            return crow::response(401, R"({"error": "Не авторизован"})");
        }

        string token = auth_header.substr(7);

        try {
            // 2. Расшифровываем и проверяем криптографическую подпись токена
            auto decoded = jwt::decode(token);
            auto verifier = jwt::verify()
                .allow_algorithm(jwt::algorithm::hs256{"super_secret_lab_key_123"}) // Тот же ключ, что и при логине!
                .with_issuer("logistics_sec_app");
            verifier.verify(decoded);

            // 3. Вытаскиваем роль и проверяем права
            string role = decoded.get_payload_claim("role").as_string();
            if (role != "admin") {
                return crow::response(403, R"({"error": "Доступ запрещен. Требуются права администратора."})");
            }

            // 4. Если всё ок — удаляем из БД
            pqxx::connection c(DB_CONN);
            pqxx::work w(c);

            pqxx::result r = w.exec_params("DELETE FROM incidents WHERE id = $1 RETURNING id", incident_id);
            if (r.empty()) {
                crow::json::wvalue err;
                err["error"] = "Инцидент не найден";
                return crow::response(404, err);
            }

            w.commit();
            crow::json::wvalue res;
            res["message"] = "Инцидент успешно удален";
            return crow::response(200, res);

        } catch (const std::exception& e) {
            cerr << "Ошибка проверки токена: " << e.what() << endl;
            return crow::response(401, R"({"error": "Недействительный токен"})");
        }
    });

    // POST: Создание нового пользователя (Только для Администратора)
    CROW_ROUTE(app, "/api/users").methods(crow::HTTPMethod::POST)
    ([](const crow::request& req) {
        string auth_header = req.get_header_value("Authorization");
        if (auth_header.empty() || auth_header.substr(0, 7) != "Bearer ") {
            crow::json::wvalue err; err["error"] = "Не авторизован";
            return crow::response(401, err);
        }
        try {
            auto decoded = jwt::decode(auth_header.substr(7));
            auto verifier = jwt::verify().allow_algorithm(jwt::algorithm::hs256{"super_secret_lab_key_123"}).with_issuer("logistics_sec_app");
            verifier.verify(decoded);
            if (decoded.get_payload_claim("role").as_string() != "admin") {
                crow::json::wvalue err; err["error"] = "Требуются права администратора";
                return crow::response(403, err);
            }

            auto body = crow::json::load(req.body);
            if (!body) {
                crow::json::wvalue err; err["error"] = "Неверный JSON";
                return crow::response(400, err);
            }

            int id = body["id"].i();
            string username = body["username"].s();
            string password = body["password"].s();
            string role = body["role"].s();

            pqxx::connection c(DB_CONN);
            pqxx::work w(c);
            w.exec_params(
                "INSERT INTO employees (id, username, password_hash, role) VALUES ($1, $2, crypt($3, gen_salt('bf')), $4)",
                id, username, password, role
            );
            w.commit();

            crow::json::wvalue res; res["message"] = "Пользователь создан";
            return crow::response(201, res);
        } catch (const std::exception& e) {
            cerr << "Ошибка: " << e.what() << endl;
            crow::json::wvalue err; err["error"] = "Ошибка БД";
            return crow::response(500, err);
        }
    });

    // GET и POST: Работа с уязвимостями (Объединенный роут)
    CROW_ROUTE(app, "/api/vulnerabilities").methods(crow::HTTPMethod::GET, crow::HTTPMethod::POST)
    ([](const crow::request& req) {
        
        // --- ЕСЛИ ЭТО GET-ЗАПРОС (Загрузка списка для формы) ---
        if (req.method == crow::HTTPMethod::GET) {
            try {
                pqxx::connection c(DB_CONN);
                pqxx::work w(c);
                pqxx::result r = w.exec("SELECT id, name, base_risk_score FROM vulnerability_types ORDER BY id ASC");

                crow::json::wvalue::list vuln_list;
                for (auto const& row : r) {
                    crow::json::wvalue v;
                    v["id"] = row[0].as<int>();
                    v["name"] = row[1].as<string>();
                    v["base_risk_score"] = row[2].as<int>();
                    vuln_list.push_back(std::move(v));
                }
                return crow::response(200, crow::json::wvalue(vuln_list));
            } catch (const std::exception& e) {
                std::cerr << "Ошибка БД (GET уязвимости): " << e.what() << std::endl;
                crow::json::wvalue err; err["error"] = "Ошибка БД";
                return crow::response(500, err);
            }
        } 
        
        // --- ЕСЛИ ЭТО POST-ЗАПРОС (Добавление новой уязвимости Админом) ---
        else {
            string auth_header = req.get_header_value("Authorization");
            if (auth_header.empty() || auth_header.substr(0, 7) != "Bearer ") {
                crow::json::wvalue err; err["error"] = "Не авторизован";
                return crow::response(401, err);
            }
            try {
                auto decoded = jwt::decode(auth_header.substr(7));
                auto verifier = jwt::verify().allow_algorithm(jwt::algorithm::hs256{"super_secret_lab_key_123"}).with_issuer("logistics_sec_app");
                verifier.verify(decoded);
                
                if (decoded.get_payload_claim("role").as_string() != "admin") {
                    crow::json::wvalue err; err["error"] = "Требуются права администратора";
                    return crow::response(403, err);
                }

                auto body = crow::json::load(req.body);
                if (!body) {
                    crow::json::wvalue err; err["error"] = "Неверный JSON";
                    return crow::response(400, err);
                }

                int id = body["id"].i();
                string name = body["name"].s();
                int base_risk = body["base_risk_score"].i();

                pqxx::connection c(DB_CONN);
                pqxx::work w(c);
                w.exec_params("INSERT INTO vulnerability_types (id, name, base_risk_score) VALUES ($1, $2, $3)", id, name, base_risk);
                w.commit();

                crow::json::wvalue res; res["message"] = "Уязвимость добавлена";
                return crow::response(201, res);
            } catch (const std::exception& e) {
                std::cerr << "Ошибка БД (POST уязвимости): " << e.what() << std::endl;
                crow::json::wvalue err; err["error"] = "Ошибка БД";
                return crow::response(500, err);
            }
        }
    });

    cout << "Crow сервер запущен на http://localhost:8080" << endl;
    app.port(8080).multithreaded().run();
}