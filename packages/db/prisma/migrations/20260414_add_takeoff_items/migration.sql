-- NEXUS Estimating — Add takeoff_items table for OCR pipeline output

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'takeoff_items') THEN
    CREATE TABLE takeoff_items (
      id              TEXT PRIMARY KEY,
      takeoff_id      TEXT NOT NULL,
      plan_page_id    TEXT NOT NULL,
      shape_type      VARCHAR(50) NOT NULL,
      geometry        JSONB NOT NULL DEFAULT '{}',
      quantity        DECIMAL(12,4) NOT NULL DEFAULT 0,
      unit            VARCHAR(20) NOT NULL DEFAULT 'EA',
      csi_code        VARCHAR(20) NOT NULL DEFAULT '',
      label           VARCHAR(500) NOT NULL DEFAULT '',
      confidence      DOUBLE PRECISION NOT NULL DEFAULT 0,
      status          VARCHAR(20) NOT NULL DEFAULT 'pending',
      override_qty    DECIMAL(12,4),
      override_reason TEXT,
      reviewed_by     TEXT,
      reviewed_at     TIMESTAMPTZ,
      source_stage    VARCHAR(50) NOT NULL DEFAULT '',
      created_by      TEXT NOT NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_takeoff_items_takeoff FOREIGN KEY (takeoff_id) REFERENCES takeoffs(id) ON DELETE CASCADE,
      CONSTRAINT fk_takeoff_items_plan_page FOREIGN KEY (plan_page_id) REFERENCES plan_pages(id) ON DELETE CASCADE
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_takeoff_items_takeoff_id') THEN
    CREATE INDEX idx_takeoff_items_takeoff_id ON takeoff_items(takeoff_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_takeoff_items_plan_page_id') THEN
    CREATE INDEX idx_takeoff_items_plan_page_id ON takeoff_items(plan_page_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_takeoff_items_status') THEN
    CREATE INDEX idx_takeoff_items_status ON takeoff_items(status);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_takeoff_items_csi_code') THEN
    CREATE INDEX idx_takeoff_items_csi_code ON takeoff_items(csi_code);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'takeoff_items_org_access') THEN
    ALTER TABLE takeoff_items ENABLE ROW LEVEL SECURITY;
    CREATE POLICY takeoff_items_org_access ON takeoff_items
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM takeoffs t
          JOIN plan_pages pp ON pp.id = t.plan_page_id
          JOIN plan_sets ps ON ps.id = pp.plan_set_id
          JOIN projects p ON p.id = ps.project_id
          JOIN org_members om ON om.organization_id = p.organization_id
          WHERE t.id = takeoff_items.takeoff_id AND om.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'takeoff_items_service_role') THEN
    CREATE POLICY takeoff_items_service_role ON takeoff_items
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;
