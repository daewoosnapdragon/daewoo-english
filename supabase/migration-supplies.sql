-- ============================================================================
-- MIGRATION: Office supplies — stock, requests, receipts, counts
-- Run this in the Supabase SQL Editor.
--
-- Stock is a short list of staples with an on-hand number and a par level
-- (the least to keep). Stock goes up from receipts (lines pasted into the
-- app) and is reset by counts: a quick weekly count by whoever has the
-- chosen office job that week, and a monthly full count by admin. Nobody
-- records what they take; anyone can press "Low" instead. Requests are what
-- people need, with who needs it and a status. Every change to a number is
-- a movement, so the history is there.
-- ============================================================================

CREATE TABLE IF NOT EXISTS supply_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'each',            -- box, pack, each, bottle, roll
  category TEXT NOT NULL DEFAULT 'office',      -- office, classroom, kitchen, cleaning
  on_hand NUMERIC NOT NULL DEFAULT 0,
  par NUMERIC NOT NULL DEFAULT 1,               -- keep at least this many
  quick_check BOOLEAN NOT NULL DEFAULT true,    -- in the weekly quick count
  link TEXT NOT NULL DEFAULT '',
  aliases TEXT[] NOT NULL DEFAULT '{}',         -- other names receipts use for it
  notes TEXT NOT NULL DEFAULT '',
  low_flagged_at TIMESTAMPTZ,
  low_flagged_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
  last_counted_at TIMESTAMPTZ,
  last_counted_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
  last_count_kind TEXT,                         -- quick or full
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_supply_items_name ON supply_items (lower(name));

CREATE TABLE IF NOT EXISTS supply_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',              -- the lines as pasted
  lines JSONB NOT NULL DEFAULT '[]',            -- what was applied: [{name, qty, item_id}]
  applied_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supply_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES supply_items(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('receipt', 'count', 'adjust')),
  qty NUMERIC NOT NULL,                         -- the change (receipt, adjust) or the counted number (count)
  on_hand_after NUMERIC NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  receipt_id UUID REFERENCES supply_receipts(id) ON DELETE SET NULL,
  by UUID REFERENCES teachers(id) ON DELETE SET NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supply_movements_item ON supply_movements(item_id, at DESC);

CREATE TABLE IF NOT EXISTS supply_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES supply_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT '',
  purpose TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '',
  requested_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
  requesters UUID[] NOT NULL DEFAULT '{}',      -- everyone who needs it, the first included
  status TEXT NOT NULL DEFAULT 'needed' CHECK (status IN ('needed', 'ordered', 'arrived', 'dropped')),
  ordered_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
  ordered_at TIMESTAMPTZ,
  arrived_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
  arrived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supply_requests_status ON supply_requests(status, created_at DESC);

ALTER TABLE supply_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "supply_items_all" ON supply_items;
CREATE POLICY "supply_items_all" ON supply_items FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "supply_receipts_all" ON supply_receipts;
CREATE POLICY "supply_receipts_all" ON supply_receipts FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "supply_movements_all" ON supply_movements;
CREATE POLICY "supply_movements_all" ON supply_movements FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "supply_requests_all" ON supply_requests;
CREATE POLICY "supply_requests_all" ON supply_requests FOR ALL USING (true) WITH CHECK (true);

-- A starting list of staples. Edit freely on the Supplies page; nothing here is special.
INSERT INTO supply_items (name, unit, category, par, aliases) VALUES
  ('A4 paper', 'box', 'office', 1, '{"복사용지","A4 용지","copy paper"}'),
  ('Whiteboard markers', 'pack', 'classroom', 2, '{"보드마카","board marker","dry erase"}'),
  ('Glue sticks', 'pack', 'classroom', 1, '{"딱풀","glue"}'),
  ('Tape', 'roll', 'office', 2, '{"테이프","scotch tape"}'),
  ('Sticky notes', 'pack', 'office', 1, '{"포스트잇","post-it"}'),
  ('Pencils', 'box', 'classroom', 1, '{"연필"}'),
  ('Erasers', 'pack', 'classroom', 1, '{"지우개"}'),
  ('Printer toner', 'each', 'office', 1, '{"토너","toner"}'),
  ('Tissues', 'box', 'office', 2, '{"휴지","티슈","kleenex"}'),
  ('Paper towels', 'roll', 'kitchen', 2, '{"키친타올","kitchen towel"}'),
  ('Hand soap', 'bottle', 'kitchen', 1, '{"핸드워시","손세정제"}'),
  ('Dish soap', 'bottle', 'kitchen', 1, '{"주방세제"}'),
  ('Coffee', 'pack', 'kitchen', 1, '{"커피"}'),
  ('Milk', 'each', 'kitchen', 1, '{"우유"}')
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
