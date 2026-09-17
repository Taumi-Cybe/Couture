ALTER TABLE naya_orders ADD COLUMN appointment_status text NOT NULL DEFAULT 'pending' CHECK (appointment_status IN ('pending','confirmed','declined','cancelled'));
ALTER TABLE naya_orders ADD COLUMN appointment_note varchar(1500) NOT NULL DEFAULT '';
ALTER TABLE naya_orders ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE naya_orders ADD COLUMN quoted_total numeric(12,2);
ALTER TABLE naya_orders ADD COLUMN quoted_currency varchar(3) NOT NULL DEFAULT 'EUR';
ALTER TABLE naya_orders DROP CONSTRAINT naya_orders_slot;
CREATE UNIQUE INDEX naya_orders_active_slot ON naya_orders(date,time) WHERE appointment_status IN ('pending','confirmed');
CREATE TABLE naya_prices (
 look_id integer PRIMARY KEY CHECK (look_id BETWEEN 1 AND 20),
 labor numeric(12,2) CHECK (labor>=0),
 fabric numeric(12,2) CHECK (fabric>=0),
 finishing numeric(12,2) CHECK (finishing>=0),
 fabric_included boolean NOT NULL DEFAULT false,
 notes varchar(1000) NOT NULL DEFAULT ''
);
CREATE TABLE naya_shop (
 id integer PRIMARY KEY CHECK (id=1),
 address varchar(500) NOT NULL DEFAULT '',
 phone varchar(50) NOT NULL DEFAULT '',
 hours varchar(500) NOT NULL DEFAULT '',
 directions_note varchar(1000) NOT NULL DEFAULT '',
 currency varchar(3) NOT NULL DEFAULT 'EUR' CHECK (currency IN ('EUR','XOF','USD'))
);
INSERT INTO naya_shop(id) VALUES(1);
-- Only the authenticated application server may access these tables.
ALTER TABLE naya_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE naya_blocked ENABLE ROW LEVEL SECURITY;
ALTER TABLE naya_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE naya_shop ENABLE ROW LEVEL SECURITY;
ALTER TABLE naya_calendar_lock ENABLE ROW LEVEL SECURITY;
ALTER TABLE naya_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE naya_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON naya_orders,naya_blocked,naya_prices,naya_shop,naya_calendar_lock,naya_rate_limits,naya_sessions FROM anon,authenticated;
