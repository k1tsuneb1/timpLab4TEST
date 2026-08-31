-- Включаем встроенное расширение для шифрования
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Статусы инцидентов (объединили логику через ENUM)
CREATE TYPE status AS ENUM ('Зафиксирован', 'В работе', 'Закрыт');

-- Таблица сотрудников (добавлены персональные данные и контакты)
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'auditor',
    firstname VARCHAR(50),
    lastname VARCHAR(50),
    job_title VARCHAR(50),
    contact_email VARCHAR(50) UNIQUE
);

-- Справочник типов уязвимостей
CREATE TABLE vulnerability_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    base_risk_score INTEGER NOT NULL
);

-- Таблица источников (добавлена)
CREATE TABLE sources(
    id SERIAL PRIMARY KEY,
    source_name VARCHAR(100) NOT NULL
);

-- Таблица мер предотвращения (добавлена)
CREATE TABLE measures(
    id SERIAL PRIMARY KEY,
    measure_name VARCHAR(255) NOT NULL
);

-- Журнал инцидентов (добавлены связи с источниками и трек-номер)
CREATE TABLE incidents (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    vulnerability_type_id INTEGER REFERENCES vulnerability_types(id) ON DELETE RESTRICT,
    source_id INTEGER REFERENCES sources(id) ON DELETE SET NULL,
    cargo_tracking_number VARCHAR(50),
    description TEXT NOT NULL,
    incident_status status DEFAULT 'Зафиксирован',
    severity_score NUMERIC,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица связи инцидентов и мер "многие ко многим" (добавлена)
CREATE TABLE incident_measures(
    incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
    measure_id INTEGER REFERENCES measures(id) ON DELETE CASCADE,
    PRIMARY KEY (incident_id, measure_id) 
);

-- Функция для расчета уровня критичности
CREATE OR REPLACE FUNCTION calculate_severity()
RETURNS TRIGGER AS $$
DECLARE
    base_score INTEGER;
BEGIN
    SELECT base_risk_score INTO base_score FROM vulnerability_types WHERE id = NEW.vulnerability_type_id;
    NEW.severity_score := base_score * 1.5;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер
CREATE TRIGGER set_incident_severity
BEFORE INSERT ON incidents
FOR EACH ROW
EXECUTE FUNCTION calculate_severity();

-- Наполнение справочников
INSERT INTO vulnerability_types (name, base_risk_score) VALUES 
('Срыв электронной пломбы', 8),
('Нарушение температурного режима', 7),
('Отклонение от маршрута', 9),
('Незапланированная остановка', 6);

-- Наполнение пользователей с новыми полями
INSERT INTO employees (username, password_hash, role, firstname, lastname) VALUES 
('logist_a', crypt('12345', gen_salt('bf')), 'user', 'Иван', 'Логистов'),
('auditor_b', crypt('12345', gen_salt('bf')), 'auditor', 'Анна', 'Аудиторова'),
('admin_boss', crypt('12345', gen_salt('bf')), 'admin', 'Петр', 'Админов');

INSERT INTO sources (source_name) VALUES 
('Диспетчерская служба'),
('Мониторинг трекера'),
('Система контроля доступа'),
('Водитель ТС'),
('Аудит безопасности');
