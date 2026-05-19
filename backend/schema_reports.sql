-- Reports & notifications (run after schema.sql)
-- psql -U slds_user -d slds_db -f schema_reports.sql

CREATE TABLE IF NOT EXISTS reports (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_no VARCHAR(32)  NOT NULL UNIQUE,
    report_type  VARCHAR(32)  NOT NULL,
    title        VARCHAR(512) NOT NULL,
    district     VARCHAR(128),
    sector       VARCHAR(128),
    sender_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    html_content TEXT         NOT NULL,
    payload      JSONB,
    status       VARCHAR(32)  NOT NULL DEFAULT 'submitted',
    read_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_reports_sender ON reports (sender_id);
CREATE INDEX IF NOT EXISTS ix_reports_created ON reports (created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_id  UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    title      VARCHAR(256) NOT NULL,
    message    TEXT NOT NULL,
    is_read    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_notifications_user ON notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS ix_notifications_created ON notifications (created_at DESC);
