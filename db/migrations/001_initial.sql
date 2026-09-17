CREATE TABLE naya_calendar_lock (id integer PRIMARY KEY CHECK (id = 1));
INSERT INTO naya_calendar_lock (id) VALUES (1);
CREATE TABLE naya_blocked (date text PRIMARY KEY CHECK (date ~ '^\d{4}-\d{2}-\d{2}$'));
CREATE TABLE naya_orders (
 id uuid PRIMARY KEY,
 code uuid NOT NULL UNIQUE,
 model integer NOT NULL CHECK (model BETWEEN 1 AND 200),
 name varchar(100) NOT NULL,
 email varchar(150) NOT NULL,
 phone varchar(30) NOT NULL,
 notes varchar(1000) NOT NULL DEFAULT '',
 date text NOT NULL,
 time text NOT NULL,
 pickup text NOT NULL,
 status integer NOT NULL DEFAULT 0 CHECK (status BETWEEN 0 AND 5),
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT naya_orders_slot UNIQUE (date,time),
 CHECK (pickup >= date)
);
CREATE TABLE naya_sessions (
 token_hash text PRIMARY KEY,
 credential_hash text NOT NULL,
 expires_at timestamptz NOT NULL
);
CREATE INDEX naya_sessions_expiration ON naya_sessions (expires_at);
CREATE TABLE naya_rate_limits (
 key text PRIMARY KEY,
 hits integer NOT NULL,
 expires_at timestamptz NOT NULL
);
CREATE INDEX naya_rate_limits_expiration ON naya_rate_limits (expires_at);
