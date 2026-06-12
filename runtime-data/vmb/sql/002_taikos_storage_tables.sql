-- tAIkOS durable storage (queue, drafts, goals, activity, sessions)

CREATE TABLE IF NOT EXISTS taikos_queue_item (
  id text PRIMARY KEY,
  salon_id text NOT NULL,
  workspace_id text,
  analysis_id text,
  type text NOT NULL,
  status text NOT NULL,
  title text,
  summary text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS taikos_queue_item_salon_id ON taikos_queue_item (salon_id);
CREATE INDEX IF NOT EXISTS taikos_queue_item_analysis_id ON taikos_queue_item (analysis_id);
CREATE INDEX IF NOT EXISTS taikos_queue_item_status ON taikos_queue_item (status);
CREATE INDEX IF NOT EXISTS taikos_queue_item_updated_at ON taikos_queue_item (updated_at DESC);

CREATE TABLE IF NOT EXISTS taikos_draft (
  id text PRIMARY KEY,
  salon_id text NOT NULL,
  workspace text,
  type text NOT NULL,
  status text NOT NULL,
  title text,
  body text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS taikos_draft_salon_id ON taikos_draft (salon_id);
CREATE INDEX IF NOT EXISTS taikos_draft_workspace ON taikos_draft (workspace);
CREATE INDEX IF NOT EXISTS taikos_draft_type ON taikos_draft (type);
CREATE INDEX IF NOT EXISTS taikos_draft_status ON taikos_draft (status);
CREATE INDEX IF NOT EXISTS taikos_draft_updated_at ON taikos_draft (updated_at DESC);

CREATE TABLE IF NOT EXISTS taikos_goal (
  id text PRIMARY KEY,
  salon_id text NOT NULL,
  status text NOT NULL,
  title text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS taikos_goal_salon_id ON taikos_goal (salon_id);
CREATE INDEX IF NOT EXISTS taikos_goal_status ON taikos_goal (status);
CREATE INDEX IF NOT EXISTS taikos_goal_updated_at ON taikos_goal (updated_at DESC);

CREATE TABLE IF NOT EXISTS taikos_activity (
  id text PRIMARY KEY,
  salon_id text NOT NULL,
  type text NOT NULL,
  title text,
  summary text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS taikos_activity_salon_id ON taikos_activity (salon_id);
CREATE INDEX IF NOT EXISTS taikos_activity_type ON taikos_activity (type);
CREATE INDEX IF NOT EXISTS taikos_activity_created_at ON taikos_activity (created_at DESC);

CREATE TABLE IF NOT EXISTS taikos_session (
  id text PRIMARY KEY,
  salon_id text NOT NULL,
  status text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS taikos_session_salon_id ON taikos_session (salon_id);
CREATE INDEX IF NOT EXISTS taikos_session_updated_at ON taikos_session (updated_at DESC);
