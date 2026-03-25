-- ON Estimating — Projects & Bid Pipeline Schema
-- Priority 1: Bid Pipeline Dashboard + Kanban Board

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Bid Stage Enum
CREATE TYPE bid_stage AS ENUM ('lead', 'estimating', 'review', 'submitted', 'won', 'lost');

-- Estimate Status Enum
CREATE TYPE estimate_status AS ENUM ('draft', 'in_review', 'approved', 'rejected');

-- =============================================
-- PROJECTS TABLE (Bid Pipeline)
-- =============================================
CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  client      TEXT NOT NULL,
  address     TEXT,
  value       NUMERIC(14,2) NOT NULL DEFAULT 0,
  stage       bid_stage NOT NULL DEFAULT 'lead',
  bid_due_date DATE,
  trade_scope TEXT,
  notes       TEXT,
  assigned_to TEXT,
  confidence  INTEGER CHECK (confidence >= 0 AND confidence <= 100),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for pipeline queries
CREATE INDEX idx_projects_stage ON projects(stage);
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_due_date ON projects(bid_due_date) WHERE bid_due_date IS NOT NULL;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- ESTIMATES TABLE
-- =============================================
CREATE TABLE estimates (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  status         estimate_status NOT NULL DEFAULT 'draft',
  total          NUMERIC(14,2) NOT NULL DEFAULT 0,
  markup_percent NUMERIC(5,2) NOT NULL DEFAULT 10,
  tax_percent    NUMERIC(5,2) NOT NULL DEFAULT 8.5,
  owner_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_estimates_project ON estimates(project_id);

CREATE TRIGGER estimates_updated_at
  BEFORE UPDATE ON estimates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- LINE ITEMS TABLE
-- =============================================
CREATE TABLE line_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  csi_code    TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity    NUMERIC(12,4) NOT NULL DEFAULT 0,
  unit        TEXT NOT NULL,
  unit_cost   NUMERIC(12,4) NOT NULL DEFAULT 0,
  total       NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  parent_id   UUID REFERENCES line_items(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_line_items_estimate ON line_items(estimate_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_items ENABLE ROW LEVEL SECURITY;

-- Projects: Users can only see/edit their own projects
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = owner_id);

-- Estimates: Access via project ownership
CREATE POLICY "Users can view own estimates"
  ON estimates FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own estimates"
  ON estimates FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own estimates"
  ON estimates FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own estimates"
  ON estimates FOR DELETE
  USING (auth.uid() = owner_id);

-- Line Items: Access via estimate → project ownership
CREATE POLICY "Users can manage line items"
  ON line_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM estimates e
      WHERE e.id = line_items.estimate_id
      AND e.owner_id = auth.uid()
    )
  );

-- Enable realtime for projects (pipeline updates)
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
