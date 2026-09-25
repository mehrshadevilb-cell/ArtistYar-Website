CREATE TABLE IF NOT EXISTS admin_problems (
  id text PRIMARY KEY,
  severity text NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  entity_type text,
  entity_id text,
  detected_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'open',
  recommended_action text NOT NULL,
  href text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_problems_status_idx ON admin_problems(status);
CREATE INDEX IF NOT EXISTS admin_problems_severity_idx ON admin_problems(severity);
CREATE INDEX IF NOT EXISTS admin_problems_detected_idx ON admin_problems(detected_at DESC);
CREATE INDEX IF NOT EXISTS admin_problems_category_idx ON admin_problems(category);

CREATE TABLE IF NOT EXISTS admin_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger text NOT NULL,
  action text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  retry_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(trigger, action)
);
CREATE INDEX IF NOT EXISTS admin_automations_enabled_idx ON admin_automations(enabled);

COMMENT ON TABLE admin_problems IS 'Persistent operational Problems Center state; detection is read-only and status changes are audited.';
COMMENT ON TABLE admin_automations IS 'Allowlisted admin event/action configuration; no arbitrary code execution.';
