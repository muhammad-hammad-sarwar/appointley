-- Enable extensions
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Table: chat_sessions
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL,
    timezone TEXT DEFAULT 'Asia/Karachi',
    state TEXT CHECK (state IN ('collecting', 'confirming', 'booked')) DEFAULT 'collecting',
    draft JSONB DEFAULT '{}',
    meta JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: chat_messages
CREATE TABLE chat_messages (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
    content TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'processing', 'done', 'failed')) DEFAULT 'done',
    meta JSONB DEFAULT '{}',
    error TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON chat_messages (session_id, id);
CREATE INDEX ON chat_messages (session_id) WHERE status = 'pending';

-- Table: appointments
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id),
    user_id UUID NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    status TEXT CHECK (status IN ('confirmed', 'cancelled')) DEFAULT 'confirmed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_at > start_at),
    EXCLUDE USING gist (tstzrange(start_at, end_at) WITH &&) WHERE (status = 'confirmed')
);

CREATE INDEX ON appointments (start_at);

-- Sample INSERTs (commented out)
-- INSERT INTO chat_sessions (user_id, timezone, state, draft, meta) VALUES
--   ('123e4567-e89b-12d3-a456-426614174000', 'Asia/Karachi', 'collecting', '{}', '{"field_attempts": {}, "extraction_failures": [], "clarification_pending": false, "user_turns": 0}');
--
-- INSERT INTO chat_messages (session_id, role, content, status, meta) VALUES
--   ((SELECT id FROM chat_sessions LIMIT 1), 'user', 'I want to book an appointment', 'done', '{}');
--
-- INSERT INTO appointments (session_id, user_id, name, email, start_at, end_at, status) VALUES
--   ((SELECT id FROM chat_sessions LIMIT 1), '123e4567-e89b-12d3-a456-426614174000', 'John Doe', 'john@example.com', '2026-10-05 10:00:00+05', '2026-10-05 10:30:00+05', 'confirmed');