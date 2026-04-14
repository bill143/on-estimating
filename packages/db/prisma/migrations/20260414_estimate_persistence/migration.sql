-- NEXUS Estimating — Estimate persistence: rates, options, GR, GC, sub bids, org settings

-- 1. Add missing columns to estimates table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimates' AND column_name = 'bond_pct') THEN
    ALTER TABLE estimates ADD COLUMN bond_pct DECIMAL(5,2) NOT NULL DEFAULT 1.5;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimates' AND column_name = 'insurance_pct') THEN
    ALTER TABLE estimates ADD COLUMN insurance_pct DECIMAL(5,2) NOT NULL DEFAULT 2.0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimates' AND column_name = 'labor_burden_pct') THEN
    ALTER TABLE estimates ADD COLUMN labor_burden_pct DECIMAL(5,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimates' AND column_name = 'contingency_pct') THEN
    ALTER TABLE estimates ADD COLUMN contingency_pct DECIMAL(5,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimates' AND column_name = 'bid_date') THEN
    ALTER TABLE estimates ADD COLUMN bid_date TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimates' AND column_name = 'architect') THEN
    ALTER TABLE estimates ADD COLUMN architect TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimates' AND column_name = 'owner_name') THEN
    ALTER TABLE estimates ADD COLUMN owner_name TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimates' AND column_name = 'project_address') THEN
    ALTER TABLE estimates ADD COLUMN project_address TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimates' AND column_name = 'scope') THEN
    ALTER TABLE estimates ADD COLUMN scope TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimates' AND column_name = 'exclusions') THEN
    ALTER TABLE estimates ADD COLUMN exclusions TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimates' AND column_name = 'clarifications') THEN
    ALTER TABLE estimates ADD COLUMN clarifications TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimates' AND column_name = 'revision') THEN
    ALTER TABLE estimates ADD COLUMN revision TEXT DEFAULT 'R0';
  END IF;
END $$;

-- 2. estimate_options table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estimate_options') THEN
    CREATE TABLE estimate_options (
      id                TEXT PRIMARY KEY,
      estimate_id       TEXT NOT NULL,
      name              TEXT NOT NULL,
      description       TEXT NOT NULL DEFAULT '',
      option_type       VARCHAR(20) NOT NULL DEFAULT 'add',
      overhead_pct      DECIMAL(5,2) NOT NULL DEFAULT 10,
      profit_pct        DECIMAL(5,2) NOT NULL DEFAULT 10,
      bond_pct          DECIMAL(5,2) NOT NULL DEFAULT 1.5,
      insurance_pct     DECIMAL(5,2) NOT NULL DEFAULT 2.0,
      labor_burden_pct  DECIMAL(5,2) NOT NULL DEFAULT 0,
      contingency_pct   DECIMAL(5,2) NOT NULL DEFAULT 0,
      tax_pct           DECIMAL(5,2) NOT NULL DEFAULT 0,
      total_option_cost DECIMAL(18,2) NOT NULL DEFAULT 0,
      sort_order        INT NOT NULL DEFAULT 0,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_estimate_options_estimate FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE
    );
  END IF;
END $$;

-- 3. option_line_items table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'option_line_items') THEN
    CREATE TABLE option_line_items (
      id                  TEXT PRIMARY KEY,
      option_id           TEXT NOT NULL,
      row_type            VARCHAR(30) NOT NULL DEFAULT 'line_item',
      parent_id           TEXT,
      sort_order          INT NOT NULL DEFAULT 0,
      csi_code            TEXT NOT NULL DEFAULT '',
      description         TEXT NOT NULL DEFAULT '',
      quantity            DECIMAL(18,4) NOT NULL DEFAULT 0,
      unit                TEXT NOT NULL DEFAULT '',
      sheet_no            TEXT NOT NULL DEFAULT '',
      detail_no           TEXT NOT NULL DEFAULT '',
      waste_percent       DECIMAL(5,2) NOT NULL DEFAULT 0,
      material_unit_cost  DECIMAL(18,4) NOT NULL DEFAULT 0,
      labor_unit_cost     DECIMAL(18,4) NOT NULL DEFAULT 0,
      equipment_unit_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
      total_cost          DECIMAL(18,2) NOT NULL DEFAULT 0,
      CONSTRAINT fk_option_line_items_option FOREIGN KEY (option_id) REFERENCES estimate_options(id) ON DELETE CASCADE
    );
  END IF;
END $$;

-- 4. gen_requirements table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gen_requirements') THEN
    CREATE TABLE gen_requirements (
      id              TEXT PRIMARY KEY,
      estimate_id     TEXT NOT NULL,
      description     TEXT NOT NULL DEFAULT '',
      qty             DECIMAL(18,4) NOT NULL DEFAULT 0,
      unit            TEXT NOT NULL DEFAULT 'LS',
      mat_unit_cost   DECIMAL(18,4) NOT NULL DEFAULT 0,
      lab_unit_cost   DECIMAL(18,4) NOT NULL DEFAULT 0,
      total_cost      DECIMAL(18,2) NOT NULL DEFAULT 0,
      sort_order      INT NOT NULL DEFAULT 0,
      CONSTRAINT fk_gen_requirements_estimate FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE
    );
  END IF;
END $$;

-- 5. gen_conditions table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gen_conditions') THEN
    CREATE TABLE gen_conditions (
      id            TEXT PRIMARY KEY,
      estimate_id   TEXT NOT NULL,
      description   TEXT NOT NULL DEFAULT '',
      duration      DECIMAL(10,2) NOT NULL DEFAULT 0,
      duration_unit VARCHAR(20) NOT NULL DEFAULT 'months',
      unit_rate     DECIMAL(18,4) NOT NULL DEFAULT 0,
      total_cost    DECIMAL(18,2) NOT NULL DEFAULT 0,
      sort_order    INT NOT NULL DEFAULT 0,
      CONSTRAINT fk_gen_conditions_estimate FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE
    );
  END IF;
END $$;

-- 6. sub_bid_scopes table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sub_bid_scopes') THEN
    CREATE TABLE sub_bid_scopes (
      id                TEXT PRIMARY KEY,
      estimate_id       TEXT NOT NULL,
      csi_code          TEXT NOT NULL DEFAULT '',
      scope_description TEXT NOT NULL DEFAULT '',
      sort_order        INT NOT NULL DEFAULT 0,
      CONSTRAINT fk_sub_bid_scopes_estimate FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE
    );
  END IF;
END $$;

-- 7. sub_bids table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sub_bids') THEN
    CREATE TABLE sub_bids (
      id           TEXT PRIMARY KEY,
      scope_id     TEXT NOT NULL,
      sub_name     TEXT NOT NULL DEFAULT '',
      contact_info TEXT NOT NULL DEFAULT '',
      bid_amount   DECIMAL(18,2) NOT NULL DEFAULT 0,
      bid_date     TEXT NOT NULL DEFAULT '',
      notes        TEXT NOT NULL DEFAULT '',
      is_selected  BOOLEAN NOT NULL DEFAULT FALSE,
      CONSTRAINT fk_sub_bids_scope FOREIGN KEY (scope_id) REFERENCES sub_bid_scopes(id) ON DELETE CASCADE
    );
  END IF;
END $$;

-- 8. organization_settings table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_settings') THEN
    CREATE TABLE organization_settings (
      id                      TEXT PRIMARY KEY,
      org_id                  TEXT NOT NULL UNIQUE,
      company_name            TEXT NOT NULL DEFAULT '',
      uei_number              TEXT NOT NULL DEFAULT '',
      cage_code               TEXT NOT NULL DEFAULT '',
      sdvosb_certified        BOOLEAN NOT NULL DEFAULT FALSE,
      default_overhead_pct    DECIMAL(5,2) NOT NULL DEFAULT 10,
      default_profit_pct      DECIMAL(5,2) NOT NULL DEFAULT 10,
      default_bond_pct        DECIMAL(5,2) NOT NULL DEFAULT 1.5,
      default_insurance_pct   DECIMAL(5,2) NOT NULL DEFAULT 2.0,
      default_contingency_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
      default_labor_burden_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
      logo_url                TEXT,
      region                  TEXT NOT NULL DEFAULT '',
      created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- 9. RLS policies for new tables (allow org members access)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'estimate_options_org_access') THEN
    ALTER TABLE estimate_options ENABLE ROW LEVEL SECURITY;
    CREATE POLICY estimate_options_org_access ON estimate_options
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM estimates e
          JOIN org_members om ON om.organization_id = e.organization_id
          WHERE e.id = estimate_options.estimate_id AND om.user_id = auth.uid()
        )
      );
    CREATE POLICY estimate_options_service_role ON estimate_options
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'option_line_items_org_access') THEN
    ALTER TABLE option_line_items ENABLE ROW LEVEL SECURITY;
    CREATE POLICY option_line_items_org_access ON option_line_items
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM estimate_options eo
          JOIN estimates e ON e.id = eo.estimate_id
          JOIN org_members om ON om.organization_id = e.organization_id
          WHERE eo.id = option_line_items.option_id AND om.user_id = auth.uid()
        )
      );
    CREATE POLICY option_line_items_service_role ON option_line_items
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'gen_requirements_org_access') THEN
    ALTER TABLE gen_requirements ENABLE ROW LEVEL SECURITY;
    CREATE POLICY gen_requirements_org_access ON gen_requirements
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM estimates e
          JOIN org_members om ON om.organization_id = e.organization_id
          WHERE e.id = gen_requirements.estimate_id AND om.user_id = auth.uid()
        )
      );
    CREATE POLICY gen_requirements_service_role ON gen_requirements
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'gen_conditions_org_access') THEN
    ALTER TABLE gen_conditions ENABLE ROW LEVEL SECURITY;
    CREATE POLICY gen_conditions_org_access ON gen_conditions
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM estimates e
          JOIN org_members om ON om.organization_id = e.organization_id
          WHERE e.id = gen_conditions.estimate_id AND om.user_id = auth.uid()
        )
      );
    CREATE POLICY gen_conditions_service_role ON gen_conditions
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sub_bid_scopes_org_access') THEN
    ALTER TABLE sub_bid_scopes ENABLE ROW LEVEL SECURITY;
    CREATE POLICY sub_bid_scopes_org_access ON sub_bid_scopes
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM estimates e
          JOIN org_members om ON om.organization_id = e.organization_id
          WHERE e.id = sub_bid_scopes.estimate_id AND om.user_id = auth.uid()
        )
      );
    CREATE POLICY sub_bid_scopes_service_role ON sub_bid_scopes
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sub_bids_org_access') THEN
    ALTER TABLE sub_bids ENABLE ROW LEVEL SECURITY;
    CREATE POLICY sub_bids_org_access ON sub_bids
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM sub_bid_scopes sbs
          JOIN estimates e ON e.id = sbs.estimate_id
          JOIN org_members om ON om.organization_id = e.organization_id
          WHERE sbs.id = sub_bids.scope_id AND om.user_id = auth.uid()
        )
      );
    CREATE POLICY sub_bids_service_role ON sub_bids
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_settings_org_access') THEN
    ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
    CREATE POLICY org_settings_org_access ON organization_settings
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM org_members om
          WHERE om.organization_id = organization_settings.org_id AND om.user_id = auth.uid()
        )
      );
    CREATE POLICY org_settings_service_role ON organization_settings
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;
