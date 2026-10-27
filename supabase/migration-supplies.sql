-- ============================================================================
-- MIGRATION: Office supplies — stock, requests, receipts, purchases, budgets
-- Run this in the Supabase SQL Editor. Safe to run again: it only adds.
--
-- Stock is a short list of staples with an on-hand number and a par level
-- (the least to keep). An item can come in packs (a box of 5 reams, a pack
-- of 12 markers); the number on hand is kept in single units and shown as
-- packs and loose. Stock goes up from receipts (lines pasted into the app,
-- with prices) and is reset by counts: a quick weekly count by whoever has
-- the chosen office job that week, and a monthly full count by admin.
-- Nobody records what they take; anyone can press "Low" instead.
-- Requests are what people need, with who needs it and a status.
-- Every receipt line is a purchase: stock (the office's money) or one-off
-- (for a teacher, or an event such as open class), with its price, so the
-- Budget page can add them up by teacher and by month against each
-- teacher's allowance for the semester.
-- Items carry a cabinet and shelf for when the materials are organised;
-- empty until then.
-- ============================================================================

CREATE TABLE IF NOT EXISTS supply_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'each',            -- the single unit: ream, marker, roll, bottle
  category TEXT NOT NULL DEFAULT 'office',      -- office, classroom, kitchen, cleaning, other
  on_hand NUMERIC NOT NULL DEFAULT 0,           -- in single units
  par NUMERIC NOT NULL DEFAULT 1,               -- keep at least this many single units
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
ALTER TABLE supply_items ADD COLUMN IF NOT EXISTS pack_size NUMERIC;                       -- single units per pack; null when it is not bought in packs
ALTER TABLE supply_items ADD COLUMN IF NOT EXISTS pack_name TEXT NOT NULL DEFAULT '';      -- box, pack, bag
ALTER TABLE supply_items ADD COLUMN IF NOT EXISTS cabinet TEXT NOT NULL DEFAULT '';        -- where it lives, once the materials are organised
ALTER TABLE supply_items ADD COLUMN IF NOT EXISTS shelf TEXT NOT NULL DEFAULT '';
ALTER TABLE supply_items ADD COLUMN IF NOT EXISTS last_price NUMERIC;                      -- won per single unit, from the latest receipt
ALTER TABLE supply_items ADD COLUMN IF NOT EXISTS last_price_at DATE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_supply_items_name ON supply_items (lower(name));

CREATE TABLE IF NOT EXISTS supply_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  note TEXT NOT NULL DEFAULT '',                -- the shop, or anything
  source TEXT NOT NULL DEFAULT '',              -- the lines as pasted
  applied_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE supply_receipts ADD COLUMN IF NOT EXISTS total NUMERIC NOT NULL DEFAULT 0;     -- won, the sum of its lines
ALTER TABLE supply_receipts DROP COLUMN IF EXISTS lines;                                   -- lines are rows in supply_purchases now

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

-- One row per receipt line. Stock lines add to an item; one-off lines are
-- charged to a teacher (or to an event, with no teacher) and never touch
-- the stock. A line can also close the request it answers.
CREATE TABLE IF NOT EXISTS supply_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES supply_receipts(id) ON DELETE CASCADE,
  date DATE NOT NULL,                           -- the receipt's date, copied for grouping
  kind TEXT NOT NULL CHECK (kind IN ('stock', 'oneoff')),
  name TEXT NOT NULL,                           -- as written on the receipt line
  qty NUMERIC NOT NULL DEFAULT 1,               -- single units (packs already multiplied out)
  as_bought TEXT NOT NULL DEFAULT '',           -- "2 boxes", the way it was bought
  price NUMERIC NOT NULL DEFAULT 0,             -- won, the line total
  item_id UUID REFERENCES supply_items(id) ON DELETE SET NULL,
  request_id UUID REFERENCES supply_requests(id) ON DELETE SET NULL,
  for_teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,   -- whose budget a one-off goes to
  purpose TEXT NOT NULL DEFAULT '',             -- "Open class", "Halloween", the request's purpose
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supply_purchases_date ON supply_purchases(date DESC);
CREATE INDEX IF NOT EXISTS idx_supply_purchases_teacher ON supply_purchases(for_teacher_id, date DESC);

CREATE TABLE IF NOT EXISTS supply_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES supply_items(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('receipt', 'count', 'adjust')),
  qty NUMERIC NOT NULL,                         -- the change (receipt, adjust) or the counted number (count), single units
  on_hand_after NUMERIC NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  receipt_id UUID REFERENCES supply_receipts(id) ON DELETE SET NULL,
  by UUID REFERENCES teachers(id) ON DELETE SET NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supply_movements_item ON supply_movements(item_id, at DESC);

-- Each teacher's allowance for a semester. A row with no teacher is the
-- office's own budget for stock.
CREATE TABLE IF NOT EXISTS supply_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,            -- won
  note TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_supply_budgets_teacher ON supply_budgets(semester_id, teacher_id) WHERE teacher_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_supply_budgets_office ON supply_budgets(semester_id) WHERE teacher_id IS NULL;

ALTER TABLE supply_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "supply_items_all" ON supply_items;
CREATE POLICY "supply_items_all" ON supply_items FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "supply_receipts_all" ON supply_receipts;
CREATE POLICY "supply_receipts_all" ON supply_receipts FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "supply_requests_all" ON supply_requests;
CREATE POLICY "supply_requests_all" ON supply_requests FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "supply_purchases_all" ON supply_purchases;
CREATE POLICY "supply_purchases_all" ON supply_purchases FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "supply_movements_all" ON supply_movements;
CREATE POLICY "supply_movements_all" ON supply_movements FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "supply_budgets_all" ON supply_budgets;
CREATE POLICY "supply_budgets_all" ON supply_budgets FOR ALL USING (true) WITH CHECK (true);

-- A starting list of staples. Edit freely on the Supplies page; nothing here is special.
INSERT INTO supply_items (name, unit, pack_name, pack_size, category, par, aliases) VALUES
  ('A4 paper', 'ream', 'box', 5, 'office', 5, '{"복사용지","A4 용지","copy paper"}'),
  ('Whiteboard markers', 'marker', 'pack', 12, 'classroom', 12, '{"보드마카","board marker","dry erase"}'),
  ('Glue sticks', 'stick', 'pack', 10, 'classroom', 10, '{"딱풀","glue"}'),
  ('Tape', 'roll', 'pack', 6, 'office', 2, '{"테이프","scotch tape"}'),
  ('Sticky notes', 'pad', 'pack', 12, 'office', 6, '{"포스트잇","post-it"}'),
  ('Pencils', 'pencil', 'box', 12, 'classroom', 12, '{"연필"}'),
  ('Erasers', 'eraser', 'pack', 10, 'classroom', 5, '{"지우개"}'),
  ('Printer toner', 'cartridge', '', NULL, 'office', 1, '{"토너","toner"}'),
  ('Tissues', 'box', 'pack', 6, 'office', 4, '{"휴지","티슈","kleenex"}'),
  ('Paper towels', 'roll', 'pack', 6, 'kitchen', 4, '{"키친타올","kitchen towel"}'),
  ('Hand soap', 'bottle', '', NULL, 'kitchen', 1, '{"핸드워시","손세정제"}'),
  ('Dish soap', 'bottle', '', NULL, 'kitchen', 1, '{"주방세제"}'),
  ('Coffee', 'pack', '', NULL, 'kitchen', 1, '{"커피"}'),
  ('Milk', 'carton', '', NULL, 'kitchen', 1, '{"우유"}')
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
