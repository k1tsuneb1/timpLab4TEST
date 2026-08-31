#include "crow_all.h"
#include <pqxx/pqxx>
#include <iostream>
#include <string>
#include <vector>
#include <jwt-cpp/jwt.h>

using namespace std;

const string DB_CONN = "dbname=logSecure user=postgres password=3462 host=db port=5432";
const string JWT_SECRET = "super_secret_lab_key_123";

// Вспомогательная функция проверки JWT и роли Admin
bool verify_admin(const crow::request& req, crow::response& error_res) {
    string auth_header = req.get_header_value("Authorization");
    if (auth_header.empty() || auth_header.substr(0, 7) != "Bearer ") {
        error_res = crow::response(401, R"({"error": "Не авторизован"})");
        return false;
    }
    try {
        auto decoded = jwt::decode(auth_header.substr(7));
        auto verifier = jwt::verify()
            .allow_algorithm(jwt::algorithm::hs256{JWT_SECRET})
            .with_issuer("logistics_sec_app");
        verifier.verify(decoded);

        if (decoded.get_payload_claim("role").as_string() != "admin") {
            error_res = crow::response(403, R"({"error": "Требуются права администратора"})");
            return false;
        }
        return true;
    } catch (...) {
        error_res = crow::response(401, R"({"error": "Недействительный токен"})");
        return false;
    }
}

bool verify_auditor(const crow::request& req, crow::response& error_res) {
    string auth_header = req.get_header_value("Authorization");
    if (auth_header.empty() || auth_header.substr(0, 7) != "Bearer ") {
        error_res = crow::response(401, R"({"error": "Не авторизован"})");
        return false;
    }
    try {
        auto decoded = jwt::decode(auth_header.substr(7));
        auto verifier = jwt::verify()
            .allow_algorithm(jwt::algorithm::hs256{JWT_SECRET})
            .with_issuer("logistics_sec_app");
        verifier.verify(decoded);

        if (decoded.get_payload_claim("role").as_string() != "auditor") {
            error_res = crow::response(403, R"({"error": "Требуются права аудитора"})");
            return false;
        }
        return true;
    } catch (...) {
        error_res = crow::response(401, R"({"error": "Недействительный токен"})");
        return false;
    }
}



int main() {
    crow::App<crow::CORSHandler> app;

    auto& cors = app.get_middleware<crow::CORSHandler>();
    cors.global()
        .headers("X-Custom-Header", "Upgrade-Insecure-Requests", "Content-Type", "Authorization")
        .methods("POST"_method, "GET"_method, "PUT"_method, "DELETE"_method, "OPTIONS"_method)
        .origin("*");

    // ==========================================
    // 1. АВТОРИЗАЦИЯ
    // ==========================================
    CROW_ROUTE(app, "/api/auth/login").methods(crow::HTTPMethod::POST)
    ([](const crow::request& req) {
        try {
            auto body = crow::json::load(req.body);
            if (!body) return crow::response(400, R"({"error": "Неверный запрос"})");

            string username = body["username"].s();
            string password = body["password"].s();

            pqxx::connection c(DB_CONN);
            pqxx::work w(c);

            pqxx::result r = w.exec_params(
                "SELECT id, role, firstname, lastname FROM employees WHERE username = $1 AND password_hash = crypt($2, password_hash)",
                username, password
            );

            if (r.empty()) {
                return crow::response(401, R"({"error": "Неверный логин или пароль"})");
            }

            int user_id = r[0][0].as<int>();
            string role = r[0][1].as<string>();
            string fullname = (r[0][2].is_null() ? "" : r[0][2].as<string>()) + " " + 
                              (r[0][3].is_null() ? "" : r[0][3].as<string>());

            auto token = jwt::create()
                .set_issuer("logistics_sec_app")
                .set_type("JWS")
                .set_payload_claim("user_id", jwt::claim(std::to_string(user_id)))
                .set_payload_claim("role", jwt::claim(role))
                .set_expires_at(std::chrono::system_clock::now() + std::chrono::hours(24))
                .sign(jwt::algorithm::hs256{JWT_SECRET});

            crow::json::wvalue res;
            res["token"] = token;
            res["role"] = role;
            res["fullname"] = fullname;
            return crow::response(200, res);

        } catch (const exception& e) {
            cerr << "Ошибка авторизации: " << e.what() << endl;
            return crow::response(500, R"({"error": "Внутренняя ошибка сервера"})");
        }
    });

    // ==========================================
    // 2. ИНЦИДЕНТЫ (CRUD)
    // ==========================================
    
    // GET: Список всех инцидентов для дашборда
    CROW_ROUTE(app, "/api/incidents").methods(crow::HTTPMethod::GET)
    ([]() {
        try {
            pqxx::connection c(DB_CONN);
            pqxx::work w(c);

            pqxx::result r = w.exec(
                "SELECT i.id, i.cargo_tracking_number, i.description, i.incident_status::text, "
                "i.severity_score, i.created_at, "
                "v.name AS vuln_name, s.source_name, "
                "COALESCE(e.firstname || ' ' || e.lastname, e.username) AS reporter "
                "FROM incidents i "
                "LEFT JOIN vulnerability_types v ON i.vulnerability_type_id = v.id "
                "LEFT JOIN sources s ON i.source_id = s.id "
                "LEFT JOIN employees e ON i.employee_id = e.id "
                "ORDER BY i.created_at DESC"
            );

            crow::json::wvalue::list jsonArray;
            for (auto const& row : r) {
                crow::json::wvalue inc;
                inc["id"] = row[0].as<int>();
                inc["tracking_number"] = row[1].is_null() ? "-" : row[1].as<string>();
                inc["description"] = row[2].as<string>();
                inc["status"] = row[3].as<string>();
                inc["severity_score"] = row[4].is_null() ? 0.0 : row[4].as<double>();
                inc["date"] = row[5].as<string>();
                inc["vulnerability"] = row[6].is_null() ? "Не указано" : row[6].as<string>();
                inc["source"] = row[7].is_null() ? "Не указан" : row[7].as<string>();
                inc["reporter"] = row[8].is_null() ? "Система" : row[8].as<string>();

                jsonArray.push_back(std::move(inc));
            }

            return crow::response(200, crow::json::wvalue(jsonArray));
        } catch (const exception& e) {
            cerr << "Ошибка GET /api/incidents: " << e.what() << endl;
            return crow::response(500, R"({"error": "Ошибка получения инцидентов"})");
        }
    });

    // POST: Создание инцидента с мерами и источником
    CROW_ROUTE(app, "/api/incidents").methods(crow::HTTPMethod::POST)
    ([](const crow::request& req) {
        try {
            auto body = crow::json::load(req.body);
            if (!body) return crow::response(400, R"({"error": "Неверный формат JSON"})");

            int emp_id = body.has("employeeId") ? (body["employeeId"].t() == crow::json::type::Number ? body["employeeId"].i() : stoi(body["employeeId"].s())) : 1;
            int vuln_id = body.has("vulnerabilityId") ? (body["vulnerabilityId"].t() == crow::json::type::Number ? body["vulnerabilityId"].i() : stoi(body["vulnerabilityId"].s())) : 1;
            int source_id = body.has("sourceId") ? (body["sourceId"].t() == crow::json::type::Number ? body["sourceId"].i() : stoi(body["sourceId"].s())) : 1;
            
            string tracking_number = "";
	    if (body.has("trackingNumber")) {
    		tracking_number = body["trackingNumber"].s();
	    }
            string desc = body["description"].s();
            string status = "Зафиксирован";
	    if (body.has("status")) {
	        status = body["status"].s();
	    }

            pqxx::connection c(DB_CONN);
            pqxx::work w(c);

            // Вставляем инцидент и возвращаем сгенерированный ID
            pqxx::result r = w.exec_params(
                "INSERT INTO incidents (employee_id, vulnerability_type_id, source_id, cargo_tracking_number, description, incident_status) "
                "VALUES ($1, $2, $3, $4, $5, $6::status) RETURNING id",
                emp_id, vuln_id, source_id, tracking_number, desc, status
            );
            int new_incident_id = r[0][0].as<int>();

            // Если переданы связанные меры (массив measureIds)
            if (body.has("measureIds")) {
                for (const auto& m_val : body["measureIds"]) {
                    int m_id = (m_val.t() == crow::json::type::Number) ? m_val.i() : stoi(m_val.s());
                    w.exec_params(
                        "INSERT INTO incident_measures (incident_id, measure_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                        new_incident_id, m_id
                    );
                }
            }

            w.commit();
            crow::json::wvalue res;
            res["message"] = "Инцидент успешно создан";
            res["id"] = new_incident_id;
            return crow::response(201, res);

        } catch (const exception& e) {
            cerr << "Ошибка POST /api/incidents: " << e.what() << endl;
            return crow::response(500, R"({"error": "Ошибка при создании записи"})");
        }
    });

    // GET: Подробности инцидента по ID
    CROW_ROUTE(app, "/api/incidents/<int>").methods(crow::HTTPMethod::GET)
    ([](int incident_id) {
        try {
            pqxx::connection c(DB_CONN);
            pqxx::work w(c);

            pqxx::result r = w.exec_params(
                "SELECT i.id, i.cargo_tracking_number, i.description, i.incident_status::text, i.severity_score, i.created_at, "
                "e.username, v.name, s.source_name "
                "FROM incidents i "
                "LEFT JOIN employees e ON i.employee_id = e.id "
                "LEFT JOIN vulnerability_types v ON i.vulnerability_type_id = v.id "
                "LEFT JOIN sources s ON i.source_id = s.id "
                "WHERE i.id = $1",
                incident_id
            );

            if (r.empty()) return crow::response(404, R"({"error": "Инцидент не найден"})");

            auto row = r[0];
            crow::json::wvalue inc;
            inc["id"] = row[0].as<int>();
            inc["tracking_number"] = row[1].is_null() ? "" : row[1].as<string>();
            inc["description"] = row[2].as<string>();
            inc["status"] = row[3].as<string>();
            inc["severity_score"] = row[4].is_null() ? 0.0 : row[4].as<double>();
            inc["date"] = row[5].as<string>();
            inc["reporter"] = row[6].is_null() ? "Система" : row[6].as<string>();
            inc["vulnerability"] = row[7].is_null() ? "" : row[7].as<string>();
            inc["source"] = row[8].is_null() ? "" : row[8].as<string>();

            // Подтягиваем список принятых мер
            pqxx::result r_measures = w.exec_params(
                "SELECT m.id, m.measure_name FROM measures m "
                "JOIN incident_measures im ON m.id = im.measure_id "
                "WHERE im.incident_id = $1",
                incident_id
            );

            crow::json::wvalue::list measures_list;
            for (auto const& m_row : r_measures) {
                crow::json::wvalue m;
                m["id"] = m_row[0].as<int>();
                m["name"] = m_row[1].as<string>();
                measures_list.push_back(std::move(m));
            }
            inc["measures"] = std::move(measures_list);

            return crow::response(200, inc);
        } catch (const exception& e) {
            return crow::response(500, R"({"error": "Ошибка базы данных"})");
        }
    });

    // PUT: Смена статуса
    CROW_ROUTE(app, "/api/incidents/<int>").methods(crow::HTTPMethod::PUT)
    ([](const crow::request& req, int incident_id) {
        crow::response err_res;
        if (!verify_admin(req, err_res) && !verify_auditor(req, err_res)) return err_res;

        try {
            auto body = crow::json::load(req.body);
            pqxx::connection c(DB_CONN);
            pqxx::work w(c);
  
            if (body.has("status")) {
                string status = body["status"].s();
                w.exec_params("UPDATE incidents SET status = $1 WHERE id = $2", status, incident_id);
            }
        
            if (body.has("description")) {
                string description = body["description"].s();
                w.exec_params("UPDATE incidents SET description = $1 WHERE id = $2", description, incident_id);
            } 

            if (body.has("measureIds")) {
                // Сначала удаляем старые привязки мер к инциденту
                w.exec_params("DELETE FROM incident_measures WHERE incident_id = $1", incident_id);
                // Добавляем новые
                for (const auto& measure : body["measureIds"]) {
                    w.exec_params("INSERT INTO incident_measures (incident_id, measure_id) VALUES ($1, $2)", incident_id, measure.i());
                } 
            }

            w.commit();
            return crow::response(200, R"({"message": "Инцидент обновлен"})");
        } catch (...) {
            return crow::response(500, R"({"error": "Ошибка при обновлении инцидента в БД"})");
        }
    });
    // DELETE: Удаление инцидента (Admin only)
    CROW_ROUTE(app, "/api/incidents/<int>").methods(crow::HTTPMethod::DELETE)
    ([](const crow::request& req, int incident_id) {
        crow::response err_res;
        if (!verify_admin(req, err_res)) return err_res;

        try {
            pqxx::connection c(DB_CONN);
            pqxx::work w(c);
            pqxx::result r = w.exec_params("DELETE FROM incidents WHERE id = $1 RETURNING id", incident_id);
            if (r.empty()) return crow::response(404, R"({"error": "Инцидент не найден"})");

            w.commit();
            return crow::response(200, R"({"message": "Инцидент успешно удален"})");
        } catch (const exception& e) {
            return crow::response(500, R"({"error": "Ошибка БД"})");
        }
    });

     // ==========================================
    // 3. СПРАВОЧНИКИ (Источники, Меры, Уязвимости)
    // ==========================================

    // GET / POST: Уязвимости
    CROW_ROUTE(app, "/api/vulnerabilities").methods(crow::HTTPMethod::GET, crow::HTTPMethod::POST)
    ([](const crow::request& req) {
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
            } catch (...) {
                return crow::response(500, R"({"error": "Ошибка БД"})");
            }
        } else {
            crow::response err_res;
            if (!verify_admin(req, err_res)) return err_res;

            try {
                auto body = crow::json::load(req.body);
                if (!body) return crow::response(400, R"({"error": "Неверный JSON"})");

                string name = body["name"].s();
                int base_risk = body["base_risk_score"].i();

                pqxx::connection c(DB_CONN);
                pqxx::work w(c);
                w.exec_params("INSERT INTO vulnerability_types (name, base_risk_score) VALUES ($1, $2)", name, base_risk);
                w.commit();

                return crow::response(201, R"({"message": "Уязвимость добавлена"})");
            } catch (...) {
                return crow::response(500, R"({"error": "Ошибка БД"})");
            }
        }
    });

    // ==========================================
    // 4. ПОЛЬЗОВАТЕЛИ (Admin only)
    // ==========================================
    CROW_ROUTE(app, "/api/users").methods(crow::HTTPMethod::GET)
    ([](const crow::request& req) {
        crow::response err_res;
        if (!verify_admin(req, err_res)) return err_res;

        try {
            pqxx::connection c(DB_CONN);
            pqxx::work w(c);
            pqxx::result r = w.exec("SELECT id, username, role, firstname, lastname, job_title, contact_email FROM employees ORDER BY id ASC");
            
            crow::json::wvalue::list user_list;
            for (auto const& row : r) {
                crow::json::wvalue u;
                u["id"] = row[0].as<int>();
                u["username"] = row[1].as<string>();
                u["role"] = row[2].as<string>();
                u["firstname"] = row[3].is_null() ? "" : row[3].as<string>();
                u["lastname"] = row[4].is_null() ? "" : row[4].as<string>();
                u["job_title"] = row[5].is_null() ? "" : row[5].as<string>();
                u["contact_email"] = row[6].is_null() ? "" : row[6].as<string>();
                user_list.push_back(std::move(u));
            }
            return crow::response(200, crow::json::wvalue(user_list));
        } catch (...) {
            return crow::response(500, R"({"error": "Ошибка БД"})");
        }
    });
    // ==========================================
    // ИСТОЧНИКИ (GET / POST)
    // ==========================================
    CROW_ROUTE(app, "/api/sources").methods(crow::HTTPMethod::GET, crow::HTTPMethod::POST)
    ([](const crow::request& req) {
        if (req.method == crow::HTTPMethod::GET) {
            try {
                pqxx::connection c(DB_CONN);
                pqxx::work w(c);
                pqxx::result r = w.exec("SELECT id, source_name FROM sources ORDER BY id ASC");
                crow::json::wvalue::list list;
                for (auto const& row : r) {
                    crow::json::wvalue s;
                    s["id"] = row[0].as<int>();
                    s["name"] = row[1].as<string>();
                    list.push_back(std::move(s));
                }
                return crow::response(200, crow::json::wvalue(list));
            } catch (...) { return crow::response(500, R"({"error": "Ошибка БД"})"); }
        } else {
            crow::response err_res;
            if (!verify_admin(req, err_res)) return err_res;
            try {
                auto body = crow::json::load(req.body);
                pqxx::connection c(DB_CONN);
                pqxx::work w(c);
                string source_name = body["name"].s();
                w.exec_params("INSERT INTO sources (source_name) VALUES ($1)", source_name);
                w.commit();
                return crow::response(201, R"({"message": "Источник добавлен"})");
            } catch (...) { return crow::response(500, R"({"error": "Ошибка БД"})"); }
        }
    });

    CROW_ROUTE(app, "/api/sources/<int>").methods(crow::HTTPMethod::DELETE)
    ([](const crow::request& req, int source_id) {
        crow::response err_res;
        if (!verify_admin(req, err_res)) return err_res;
        try {
            pqxx::connection c(DB_CONN); pqxx::work w(c);
            w.exec_params("DELETE FROM sources WHERE id = $1", source_id); w.commit();
            return crow::response(200, R"({"message": "Источник удален"})");
        } catch (...) { return crow::response(400, R"({"error": "Нельзя удалить используемый источник"})"); }
    });

    // ==========================================
    // МЕРЫ (GET / POST)
    // ==========================================
    CROW_ROUTE(app, "/api/measures").methods(crow::HTTPMethod::GET, crow::HTTPMethod::POST)
    ([](const crow::request& req) {
        if (req.method == crow::HTTPMethod::GET) {
            try {
                pqxx::connection c(DB_CONN);
                pqxx::work w(c);
                pqxx::result r = w.exec("SELECT id, measure_name FROM measures ORDER BY id ASC");
                crow::json::wvalue::list list;
                for (auto const& row : r) {
                    crow::json::wvalue m;
                    m["id"] = row[0].as<int>();
                    m["name"] = row[1].as<string>();
                    list.push_back(std::move(m));
                }
                return crow::response(200, crow::json::wvalue(list));
            } catch (...) { return crow::response(500, R"({"error": "Ошибка БД"})"); }
        } else {
            crow::response err_res;
            if (!verify_admin(req, err_res)) return err_res;
            try {
                auto body = crow::json::load(req.body);
                pqxx::connection c(DB_CONN);
                pqxx::work w(c);
                string measure_name = body["name"].s();
		w.exec_params("INSERT INTO measures (measure_name) VALUES ($1)", measure_name);
                w.commit();
                return crow::response(201, R"({"message": "Мера добавлена"})");
            } catch (...) { return crow::response(500, R"({"error": "Ошибка БД"})"); }
        }
    });

    CROW_ROUTE(app, "/api/measures/<int>").methods(crow::HTTPMethod::DELETE)
    ([](const crow::request& req, int measure_id) {
        crow::response err_res;
        if (!verify_admin(req, err_res)) return err_res;
        try {
            pqxx::connection c(DB_CONN); pqxx::work w(c);
            w.exec_params("DELETE FROM measures WHERE id = $1", measure_id); w.commit();
            return crow::response(200, R"({"message": "Мера удалена"})");
        } catch (...) { return crow::response(400, R"({"error": "Нельзя удалить используемую меру"})"); }
    });
    
    cout << "Crow сервер запущен на http://localhost:8080" << endl;
    app.port(8080).multithreaded().run();
}
