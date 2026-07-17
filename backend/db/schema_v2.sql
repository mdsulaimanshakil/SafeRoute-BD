-- ============================================================
--  SafeRoute BD — Extended Schema (v2)
--  Run AFTER schema.sql (USERS table must exist)
--  Safe to re-run — all DROPs are wrapped
-- ============================================================

-- ────────────────────────────────────────────
--  DROP existing objects (safe re-run)
-- ────────────────────────────────────────────
BEGIN EXECUTE IMMEDIATE 'DROP TRIGGER routes_bir'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TRIGGER alerts_bir'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TRIGGER contacts_bir'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TRIGGER reports_bir'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TRIGGER zones_bir'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP SEQUENCE routes_seq'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP SEQUENCE alerts_seq'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP SEQUENCE contacts_seq'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP SEQUENCE reports_seq'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP SEQUENCE zones_seq'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE ROUTE_RECOMMENDATIONS CASCADE CONSTRAINTS'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE SAFETY_ALERTS CASCADE CONSTRAINTS'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE EMERGENCY_CONTACTS CASCADE CONSTRAINTS'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE INCIDENT_REPORTS CASCADE CONSTRAINTS'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE LOCATION_ZONES CASCADE CONSTRAINTS'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- ────────────────────────────────────────────
--  TABLE 1: LOCATION_ZONES
-- ────────────────────────────────────────────
CREATE SEQUENCE zones_seq START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;

CREATE TABLE LOCATION_ZONES (
  zone_id      NUMBER(10)    NOT NULL,
  area_name    VARCHAR2(100) NOT NULL,
  latitude     FLOAT         NOT NULL,
  longitude    FLOAT         NOT NULL,
  safety_score FLOAT         DEFAULT 100,
  is_high_risk NUMBER(1)     DEFAULT 0,
  CONSTRAINT pk_zones          PRIMARY KEY (zone_id),
  CONSTRAINT chk_zones_risk    CHECK (is_high_risk IN (0,1))
);

CREATE OR REPLACE TRIGGER zones_bir
  BEFORE INSERT ON LOCATION_ZONES
  FOR EACH ROW
BEGIN
  IF :NEW.zone_id IS NULL THEN
    SELECT zones_seq.NEXTVAL INTO :NEW.zone_id FROM dual;
  END IF;
END;
/

SELECT 'LOCATION_ZONES created.' AS STATUS FROM dual;

-- ────────────────────────────────────────────
--  TABLE 2: INCIDENT_REPORTS
-- ────────────────────────────────────────────
CREATE SEQUENCE reports_seq START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;

CREATE TABLE INCIDENT_REPORTS (
  report_id   NUMBER(10)     NOT NULL,
  user_id     NUMBER(10),
  zone_id     NUMBER(10),
  category    VARCHAR2(50)   NOT NULL,
  description VARCHAR2(1000) NOT NULL,
  is_anon     NUMBER(1)      DEFAULT 0,
  upvotes     NUMBER(10)     DEFAULT 0,
  status      VARCHAR2(20)   DEFAULT 'PENDING',
  created_at  TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_reports        PRIMARY KEY (report_id),
  CONSTRAINT fk_reports_user   FOREIGN KEY (user_id)  REFERENCES USERS(user_id),
  CONSTRAINT fk_reports_zone   FOREIGN KEY (zone_id)  REFERENCES LOCATION_ZONES(zone_id),
  CONSTRAINT chk_reports_cat   CHECK (category IN ('THEFT','HARASSMENT','ACCIDENT','ROAD_HAZARD','SUSPICIOUS','WATERLOGGING','OTHER')),
  CONSTRAINT chk_reports_anon  CHECK (is_anon IN (0,1)),
  CONSTRAINT chk_reports_stat  CHECK (status IN ('PENDING','OPEN','RESOLVED'))
);

CREATE OR REPLACE TRIGGER reports_bir
  BEFORE INSERT ON INCIDENT_REPORTS
  FOR EACH ROW
BEGIN
  IF :NEW.report_id IS NULL THEN
    SELECT reports_seq.NEXTVAL INTO :NEW.report_id FROM dual;
  END IF;
END;
/

SELECT 'INCIDENT_REPORTS created.' AS STATUS FROM dual;

-- ────────────────────────────────────────────
--  TABLE 3: EMERGENCY_CONTACTS
-- ────────────────────────────────────────────
CREATE SEQUENCE contacts_seq START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;

CREATE TABLE EMERGENCY_CONTACTS (
  contact_id NUMBER(10)    NOT NULL,
  user_id    NUMBER(10)    NOT NULL,
  name       VARCHAR2(100) NOT NULL,
  phone      VARCHAR2(20)  NOT NULL,
  relation   VARCHAR2(50)  NOT NULL,
  CONSTRAINT pk_contacts      PRIMARY KEY (contact_id),
  CONSTRAINT fk_contacts_user FOREIGN KEY (user_id) REFERENCES USERS(user_id)
);

CREATE OR REPLACE TRIGGER contacts_bir
  BEFORE INSERT ON EMERGENCY_CONTACTS
  FOR EACH ROW
BEGIN
  IF :NEW.contact_id IS NULL THEN
    SELECT contacts_seq.NEXTVAL INTO :NEW.contact_id FROM dual;
  END IF;
END;
/

SELECT 'EMERGENCY_CONTACTS created.' AS STATUS FROM dual;

-- ────────────────────────────────────────────
--  TABLE 4: SAFETY_ALERTS
-- ────────────────────────────────────────────
CREATE SEQUENCE alerts_seq START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;

CREATE TABLE SAFETY_ALERTS (
  alert_id  NUMBER(10)    NOT NULL,
  zone_id   NUMBER(10)    NOT NULL,
  report_id NUMBER(10),
  message   VARCHAR2(500) NOT NULL,
  severity  VARCHAR2(20)  NOT NULL,
  broadcast TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_alerts         PRIMARY KEY (alert_id),
  CONSTRAINT fk_alerts_zone    FOREIGN KEY (zone_id)   REFERENCES LOCATION_ZONES(zone_id),
  CONSTRAINT fk_alerts_report  FOREIGN KEY (report_id) REFERENCES INCIDENT_REPORTS(report_id),
  CONSTRAINT chk_alerts_sev    CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL'))
);

CREATE OR REPLACE TRIGGER alerts_bir
  BEFORE INSERT ON SAFETY_ALERTS
  FOR EACH ROW
BEGIN
  IF :NEW.alert_id IS NULL THEN
    SELECT alerts_seq.NEXTVAL INTO :NEW.alert_id FROM dual;
  END IF;
END;
/

SELECT 'SAFETY_ALERTS created.' AS STATUS FROM dual;

-- ────────────────────────────────────────────
--  TABLE 5: ROUTE_RECOMMENDATIONS
-- ────────────────────────────────────────────
CREATE SEQUENCE routes_seq START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;

CREATE TABLE ROUTE_RECOMMENDATIONS (
  route_id    NUMBER(10) NOT NULL,
  start_zone  NUMBER(10) NOT NULL,
  end_zone    NUMBER(10) NOT NULL,
  safety_rate FLOAT      NOT NULL,
  last_calc   DATE       DEFAULT SYSDATE,
  CONSTRAINT pk_routes          PRIMARY KEY (route_id),
  CONSTRAINT fk_routes_start    FOREIGN KEY (start_zone) REFERENCES LOCATION_ZONES(zone_id),
  CONSTRAINT fk_routes_end      FOREIGN KEY (end_zone)   REFERENCES LOCATION_ZONES(zone_id)
);

CREATE OR REPLACE TRIGGER routes_bir
  BEFORE INSERT ON ROUTE_RECOMMENDATIONS
  FOR EACH ROW
BEGIN
  IF :NEW.route_id IS NULL THEN
    SELECT routes_seq.NEXTVAL INTO :NEW.route_id FROM dual;
  END IF;
END;
/

SELECT 'ROUTE_RECOMMENDATIONS created.' AS STATUS FROM dual;

-- ────────────────────────────────────────────
--  SAMPLE DATA
-- ────────────────────────────────────────────
INSERT INTO LOCATION_ZONES (area_name, latitude, longitude, safety_score, is_high_risk)
VALUES ('Mirpur-10, Dhaka', 23.8073, 90.3674, 45.5, 1);

INSERT INTO LOCATION_ZONES (area_name, latitude, longitude, safety_score, is_high_risk)
VALUES ('Gulshan-2, Dhaka', 23.7925, 90.4078, 78.0, 0);

INSERT INTO LOCATION_ZONES (area_name, latitude, longitude, safety_score, is_high_risk)
VALUES ('Motijheel, Dhaka', 23.7330, 90.4170, 62.3, 0);

INSERT INTO SAFETY_ALERTS (zone_id, report_id, message, severity)
VALUES (1, NULL, 'High theft activity reported in Mirpur-10 area. Stay alert.', 'HIGH');

INSERT INTO SAFETY_ALERTS (zone_id, report_id, message, severity)
VALUES (2, NULL, 'Traffic accident reported near Gulshan-2 circle.', 'MEDIUM');

COMMIT;

-- ────────────────────────────────────────────
--  VERIFY
-- ────────────────────────────────────────────
SELECT table_name FROM user_tables ORDER BY table_name;