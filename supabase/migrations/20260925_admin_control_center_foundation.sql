-- Admin Control Center foundation tables (Phase 1)
-- Safe to apply multiple times (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id text PRIMARY KEY,
  actor text NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  before_state jsonb,
  after_state jsonb,
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_created_at_idx ON admin_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_logs_actor_idx ON admin_audit_logs (actor);
CREATE INDEX IF NOT EXISTS admin_audit_logs_action_idx ON admin_audit_logs (action);
CREATE INDEX IF NOT EXISTS admin_audit_logs_resource_idx ON admin_audit_logs (resource_type, resource_id);

COMMENT ON TABLE admin_audit_logs IS 'Admin sensitive operation audit trail. Never store secrets.';
