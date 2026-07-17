-- ============================================================
--  SafeRoute BD — Oracle Database Schema
--  Run this script once in SQL*Plus or SQL Developer
-- ============================================================

-- Drop existing objects if re-running (safe order)
BEGIN
  EXECUTE IMMEDIATE 'DROP TRIGGER users_bir';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/

BEGIN
  EXECUTE IMMEDIATE 'DROP SEQUENCE users_seq';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/

BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE USERS CASCADE CONSTRAINTS';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/

-- ────────────────────────────────────────────
--  SEQUENCE: Auto-increment for user_id
-- ────────────────────────────────────────────
CREATE SEQUENCE users_seq
  START WITH 1
  INCREMENT BY 1
  NOCACHE
  NOCYCLE;

-- ────────────────────────────────────────────
--  TABLE: USERS
-- ────────────────────────────────────────────
CREATE TABLE USERS (
  user_id       NUMBER(10)     NOT NULL,
  full_name     VARCHAR2(100)  NOT NULL,
  email         VARCHAR2(150)  NOT NULL,
  phone         VARCHAR2(20)   NOT NULL,
  password_hash VARCHAR2(255)  NOT NULL,
  role          VARCHAR2(20)   NOT NULL,
  created_at    TIMESTAMP      DEFAULT CURRENT_TIMESTAMP NOT NULL,
  --
  CONSTRAINT pk_users      PRIMARY KEY (user_id),
  CONSTRAINT uq_users_email UNIQUE (email),
  CONSTRAINT chk_users_role CHECK (role IN ('PUBLIC_USER', 'ADMIN'))
);

-- ────────────────────────────────────────────
--  TRIGGER: Auto-populate user_id on INSERT
-- ────────────────────────────────────────────
CREATE OR REPLACE TRIGGER users_bir
  BEFORE INSERT ON USERS
  FOR EACH ROW
BEGIN
  IF :NEW.user_id IS NULL THEN
    SELECT users_seq.NEXTVAL
      INTO :NEW.user_id
      FROM dual;
  END IF;
END;
/

-- ────────────────────────────────────────────
--  INDEX: Speed up email lookups on login
-- ────────────────────────────────────────────
CREATE INDEX idx_users_email ON USERS (email);

-- ────────────────────────────────────────────
--  Verify
-- ────────────────────────────────────────────
SELECT 'Schema created successfully.' AS STATUS FROM dual;
