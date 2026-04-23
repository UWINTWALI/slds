-- =============================================================================
-- SLDS Database Schema
-- =============================================================================
-- Run the following psql commands as a superuser BEFORE executing this file:
--
--   CREATE DATABASE slds_db;
--   CREATE USER slds_user WITH PASSWORD 'slds_pass';
--   GRANT ALL PRIVILEGES ON DATABASE slds_db TO slds_user;
--   \c slds_db
--   GRANT ALL ON SCHEMA public TO slds_user;
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- roles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(64)  NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- permissions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS permissions (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(128) NOT NULL UNIQUE,
    description TEXT
);

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(256) NOT NULL UNIQUE,
    password_hash VARCHAR(256) NOT NULL,
    full_name     VARCHAR(256) NOT NULL,
    title         VARCHAR(128),
    district      VARCHAR(128),
    sector        VARCHAR(128),
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    is_superuser  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_users_email ON users (email);

-- ---------------------------------------------------------------------------
-- user_roles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_roles (
    user_id     UUID        NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    role_id     INTEGER     NOT NULL REFERENCES roles(id)  ON DELETE CASCADE,
    assigned_by UUID        REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

-- ---------------------------------------------------------------------------
-- role_permissions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id       INTEGER NOT NULL REFERENCES roles(id)       ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ---------------------------------------------------------------------------
-- sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    ip_address VARCHAR(45)
);

CREATE INDEX IF NOT EXISTS ix_sessions_token_hash ON sessions (token_hash);

-- ---------------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(128) NOT NULL,
    resource    VARCHAR(128) NOT NULL,
    resource_id VARCHAR(256),
    details     JSONB,
    ip_address  VARCHAR(45),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Trigger: keep users.updated_at current
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Seed: roles
-- ---------------------------------------------------------------------------
INSERT INTO roles (name, description) VALUES
    ('national_admin',   'Full national-level access — MINALOC/RISA planners'),
    ('district_officer', 'District-scoped planning access'),
    ('sector_officer',   'Sector-scoped monitoring access'),
    ('analyst',          'Read-only analysis and simulation access')
ON CONFLICT (name) DO NOTHING;
