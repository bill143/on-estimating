-- Migration 002: Update line_items to 14-column estimate schema
-- Adds row_type, sheet_no, detail_no, waste_percent, material_unit_cost, labor_unit_cost

-- Row type enum
CREATE TYPE row_type AS ENUM (
  'division_header',
  'subsection_header',
  'item_note',
  'line_item',
  'subtotal'
);

-- Add new columns to line_items
ALTER TABLE line_items
  ADD COLUMN row_type     row_type NOT NULL DEFAULT 'line_item',
  ADD COLUMN sheet_no     TEXT DEFAULT '',
  ADD COLUMN detail_no    TEXT DEFAULT '',
  ADD COLUMN waste_percent      NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN material_unit_cost NUMERIC(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN labor_unit_cost    NUMERIC(12,4) NOT NULL DEFAULT 0;

-- Drop the old generated `total` column and replace with a regular column
-- (we compute total in the application layer now)
ALTER TABLE line_items DROP COLUMN total;
ALTER TABLE line_items ADD COLUMN total_cost NUMERIC(14,2) NOT NULL DEFAULT 0;

-- Rename unit_cost → keep for backward compat, but application will use material + labor
COMMENT ON COLUMN line_items.unit_cost IS 'Legacy single unit cost — use material_unit_cost + labor_unit_cost instead';

-- Add overhead/profit to estimates table
ALTER TABLE estimates
  ADD COLUMN overhead_percent NUMERIC(5,2) NOT NULL DEFAULT 10,
  ADD COLUMN profit_percent   NUMERIC(5,2) NOT NULL DEFAULT 10;

-- Alternates table
CREATE TABLE alternates (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alternates_estimate ON alternates(estimate_id);

-- RLS for alternates
ALTER TABLE alternates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage alternates"
  ON alternates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM estimates e
      WHERE e.id = alternates.estimate_id
      AND e.owner_id = auth.uid()
    )
  );
