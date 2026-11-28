-- Update the books (Curriculum → Bookshelf → Update the books). Run once in the Supabase SQL Editor. Safe to re-run.
-- Creates the objectives table if it is missing, a catalogue version per book, and the two functions the page
-- calls: curriculum_replace_book swaps a book's units for the publisher's (moving every class's lengths, done
-- ticks, files and lesson-plan links to the matching new unit) and curriculum_split_book moves classes from the
-- old single Science of Reading book onto the nine level books. Each call is one transaction: all or nothing.
-- Design: docs/superpowers/specs/2026-11-28-book-rebuild-design.md

CREATE TABLE IF NOT EXISTS curriculum_unit_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  text TEXT NOT NULL,
  ccss_codes TEXT[] NOT NULL DEFAULT '{}',
  wida TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_curriculum_unit_objectives_unit ON curriculum_unit_objectives (unit_id, sort_order);
ALTER TABLE curriculum_unit_objectives ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "curriculum_unit_objectives_all" ON curriculum_unit_objectives;
CREATE POLICY "curriculum_unit_objectives_all" ON curriculum_unit_objectives FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE curriculum_books ADD COLUMN IF NOT EXISTS catalogue_version TEXT NOT NULL DEFAULT '';

-- A lesson plan's content (JSON text) with its subjects' unit links moved: p_units maps old unit id → new unit id,
-- or → null to drop the link (the row keeps its text). p_places maps "<old placement>|<new unit>" → new placement.
-- A lesson link is always dropped: lessons do not carry over one to one.
CREATE OR REPLACE FUNCTION curriculum_remap_plan_text(p_content TEXT, p_units JSONB, p_places JSONB) RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE j JSONB; s JSONB; subs JSONB := '[]'::jsonb; nu TEXT; pk TEXT;
BEGIN
  BEGIN j := p_content::jsonb; EXCEPTION WHEN others THEN RETURN p_content; END;
  IF jsonb_typeof(j) <> 'object' OR jsonb_typeof(j->'subjects') IS DISTINCT FROM 'array' THEN RETURN p_content; END IF;
  FOR s IN SELECT x FROM jsonb_array_elements(j->'subjects') AS x LOOP
    IF jsonb_typeof(s) = 'object' AND s ? 'unit_id' AND p_units ? (s->>'unit_id') THEN
      nu := p_units->>(s->>'unit_id');
      IF nu IS NULL THEN
        s := s - 'unit_id' - 'lesson_id' - 'placement_id';
      ELSE
        pk := (s->>'placement_id') || '|' || nu;
        IF pk IS NOT NULL AND p_places ? pk THEN s := jsonb_set(s, '{placement_id}', to_jsonb(p_places->>pk)); END IF;
        s := jsonb_set(s - 'lesson_id', '{unit_id}', to_jsonb(nu));
      END IF;
    END IF;
    subs := subs || jsonb_build_array(s);
  END LOOP;
  RETURN jsonb_set(j, '{subjects}', subs)::text;
END $$;

-- Every lesson plan that names one of the old units, rewritten with curriculum_remap_plan_text.
CREATE OR REPLACE FUNCTION curriculum_remap_plans(p_units JSONB, p_places JSONB) RETURNS INT LANGUAGE plpgsql AS $$
DECLARE kind TEXT; pattern TEXT; n INT;
BEGIN
  IF to_regclass('public.parent_calendar') IS NULL OR p_units = '{}'::jsonb THEN RETURN 0; END IF;
  SELECT data_type INTO kind FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'parent_calendar' AND column_name = 'content';
  SELECT string_agg(k, '|') INTO pattern FROM jsonb_object_keys(p_units) AS k;
  EXECUTE format('UPDATE parent_calendar SET content = curriculum_remap_plan_text(content::text, $1, $2)%s WHERE content::text ~ $3',
    CASE kind WHEN 'jsonb' THEN '::jsonb' WHEN 'json' THEN '::json' ELSE '' END)
    USING p_units, p_places, pattern;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

-- Everything that points at unit p_old now points at p_new. A class that already has p_new keeps that row,
-- with p_old's weeks added on, and a done tick on either stays.
CREATE OR REPLACE FUNCTION curriculum_move_unit(p_old UUID, p_new UUID) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE curriculum_pacing t SET weeks = t.weeks + s.weeks, updated_at = now()
  FROM curriculum_pacing s
  WHERE s.unit_id = p_old AND t.unit_id = p_new AND t.placement_id = s.placement_id AND s.owner = 'master' AND t.owner = 'master';
  DELETE FROM curriculum_pacing s WHERE s.unit_id = p_old
    AND EXISTS (SELECT 1 FROM curriculum_pacing t WHERE t.unit_id = p_new AND t.placement_id = s.placement_id AND t.owner = s.owner);
  UPDATE curriculum_pacing SET unit_id = p_new, updated_at = now() WHERE unit_id = p_old;

  IF to_regclass('public.curriculum_unit_done') IS NOT NULL THEN
    DELETE FROM curriculum_unit_done s WHERE s.unit_id = p_old
      AND EXISTS (SELECT 1 FROM curriculum_unit_done t WHERE t.unit_id = p_new AND t.placement_id = s.placement_id);
    UPDATE curriculum_unit_done SET unit_id = p_new WHERE unit_id = p_old;
  END IF;

  UPDATE curriculum_resources SET unit_id = p_new, lesson_id = NULL
  WHERE unit_id = p_old OR lesson_id IN (SELECT id FROM curriculum_lessons WHERE unit_id = p_old);

  IF to_regclass('public.curriculum_here') IS NOT NULL THEN
    EXECUTE 'UPDATE curriculum_here SET unit_id = $1 WHERE unit_id = $2' USING p_new, p_old;
  END IF;
END $$;

-- Swaps one book's units for the catalogue's. p_units is the book file's units array; p_map pairs each old unit
-- that has a match with the index (0-based) of its new unit: [{"old": uuid, "new_index": n}]. Old units without a
-- pair lose their class rows and lesson-plan links (the page lists them first). p_absorb: other books of the same
-- series folded into this one (Hand in Hand "S" into Starter): their classes move here, then they are deleted.
CREATE OR REPLACE FUNCTION curriculum_replace_book(
  p_series JSONB, p_level TEXT, p_title TEXT, p_version TEXT, p_units JSONB, p_map JSONB, p_absorb UUID[] DEFAULT '{}'
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE sid UUID; bid UUID; u JSONB; l JSONB; o JSONB; uid UUID; i INT := 0; j INT; k INT;
  new_ids UUID[] := '{}'; old_ids UUID[]; m JSONB; umap JSONB := '{}'::jsonb;
BEGIN
  SELECT id INTO sid FROM curriculum_series WHERE lower(name) = lower(p_series->>'name');
  IF sid IS NULL THEN
    INSERT INTO curriculum_series (name, strand, color, kind, sort_order)
    VALUES (p_series->>'name', COALESCE(p_series->>'strand', 'other'), COALESCE(p_series->>'color', 'slate'), COALESCE(p_series->>'kind', 'sequence'), 90)
    RETURNING id INTO sid;
  END IF;
  SELECT id INTO bid FROM curriculum_books WHERE series_id = sid AND lower(level_number) = lower(p_level);
  IF bid IS NULL THEN
    INSERT INTO curriculum_books (series_id, level_number, title, status) VALUES (sid, p_level, COALESCE(p_title, ''), 'confirmed') RETURNING id INTO bid;
  ELSIF COALESCE(p_title, '') <> '' THEN
    UPDATE curriculum_books SET title = p_title WHERE id = bid;
  END IF;

  old_ids := ARRAY(SELECT id FROM curriculum_units WHERE book_id = bid OR book_id = ANY(COALESCE(p_absorb, '{}')));
  UPDATE curriculum_placements SET book_id = bid, updated_at = now() WHERE book_id = ANY(COALESCE(p_absorb, '{}'));

  FOR u IN SELECT x FROM jsonb_array_elements(p_units) AS x LOOP
    i := i + 1;
    INSERT INTO curriculum_units (book_id, sort_order, title, summary, skill_tags, ccss_codes, default_weeks, source)
    VALUES (bid, i, u->>'title', COALESCE(u->>'summary', ''),
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(u->'skill_tags', '[]'::jsonb))),
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(u->'ccss', '[]'::jsonb))),
      COALESCE((u->>'default_weeks')::numeric, 2), 'claude')
    RETURNING id INTO uid;
    new_ids := new_ids || uid;
    j := 0;
    FOR l IN SELECT x FROM jsonb_array_elements(COALESCE(u->'lessons', '[]'::jsonb)) AS x LOOP
      j := j + 1;
      INSERT INTO curriculum_lessons (unit_id, sort_order, title, objective, notes, source)
      VALUES (uid, j, l->>'title', '', COALESCE(l->>'notes', ''), 'claude');
    END LOOP;
    k := 0;
    FOR o IN SELECT x FROM jsonb_array_elements(COALESCE(u->'objectives', '[]'::jsonb)) AS x LOOP
      k := k + 1;
      INSERT INTO curriculum_unit_objectives (unit_id, sort_order, text, ccss_codes, wida)
      VALUES (uid, k, o->>'text',
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(o->'ccss', '[]'::jsonb))),
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(o->'wida', '[]'::jsonb))));
    END LOOP;
  END LOOP;

  FOR m IN SELECT x FROM jsonb_array_elements(COALESCE(p_map, '[]'::jsonb)) AS x LOOP
    IF NOT ((m->>'old')::uuid = ANY(old_ids)) THEN RAISE EXCEPTION 'Unit % is not in this book', m->>'old'; END IF;
    uid := new_ids[(m->>'new_index')::int + 1];
    IF uid IS NULL THEN RAISE EXCEPTION 'No new unit at index %', m->>'new_index'; END IF;
    PERFORM curriculum_move_unit((m->>'old')::uuid, uid);
    umap := umap || jsonb_build_object(m->>'old', uid::text);
  END LOOP;
  -- Old units with no pair: their lesson-plan links go (the rows keep their text).
  SELECT umap || COALESCE(jsonb_object_agg(x::text, NULL), '{}'::jsonb) INTO umap FROM unnest(old_ids) AS x WHERE NOT umap ? x::text;
  PERFORM curriculum_remap_plans(umap, '{}'::jsonb);

  DELETE FROM curriculum_units WHERE id = ANY(old_ids);
  DELETE FROM curriculum_books WHERE id = ANY(COALESCE(p_absorb, '{}')) AND id <> bid;
  UPDATE curriculum_books SET catalogue_version = COALESCE(p_version, ''), updated_at = now() WHERE id = bid;
  RETURN bid;
END $$;

-- Moves every class off p_old_book onto the books its units now live in (the nine Science of Reading levels).
-- p_map: [{"old": old unit id, "new": new unit id}]; several old units may share one new unit (their weeks add up).
-- Each class gets one placement per new book its units fall in, with the order, weeks, review weeks and done
-- ticks carried over and its lesson-plan links moved. The old book is retired (kept for past years), not deleted.
CREATE OR REPLACE FUNCTION curriculum_split_book(p_old_book UUID, p_map JSONB) RETURNS INT LANGUAGE plpgsql AS $$
DECLARE pl RECORD; nb UUID; npl UUID; umap JSONB := '{}'::jsonb; pmap JSONB := '{}'::jsonb; m JSONB; n INT := 0; old_ids UUID[];
  has_review BOOLEAN := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'curriculum_pacing' AND column_name = 'review_weeks');
BEGIN
  FOR m IN SELECT x FROM jsonb_array_elements(COALESCE(p_map, '[]'::jsonb)) AS x LOOP
    umap := umap || jsonb_build_object(m->>'old', m->>'new');
  END LOOP;
  old_ids := ARRAY(SELECT id FROM curriculum_units WHERE book_id = p_old_book);
  SELECT umap || COALESCE(jsonb_object_agg(x::text, NULL), '{}'::jsonb) INTO umap FROM unnest(old_ids) AS x WHERE NOT umap ? x::text;

  FOR pl IN SELECT * FROM curriculum_placements WHERE book_id = p_old_book LOOP
    FOR nb IN
      SELECT DISTINCT nu.book_id FROM curriculum_pacing pc JOIN curriculum_units nu ON nu.id = (umap->>pc.unit_id::text)::uuid
      WHERE pc.placement_id = pl.id AND pc.owner = 'master'
    LOOP
      SELECT id INTO npl FROM curriculum_placements
      WHERE book_id = nb AND english_class = pl.english_class AND grade = pl.grade AND academic_year = pl.academic_year AND term = pl.term AND is_master = pl.is_master;
      IF npl IS NULL THEN
        INSERT INTO curriculum_placements (book_id, english_class, grade, academic_year, term, is_master, created_by, aim_date)
        VALUES (nb, pl.english_class, pl.grade, pl.academic_year, pl.term, pl.is_master, pl.created_by, pl.aim_date)
        RETURNING id INTO npl;
      END IF;
      -- review_weeks only where migration-curriculum-review-weeks.sql has been run.
      EXECUTE format(
        'INSERT INTO curriculum_pacing (placement_id, unit_id, sort_order, weeks, owner%1$s)
         SELECT $1, nu.id, min(pc.sort_order), sum(pc.weeks), ''master''%2$s
         FROM curriculum_pacing pc JOIN curriculum_units nu ON nu.id = ($2->>pc.unit_id::text)::uuid
         WHERE pc.placement_id = $3 AND pc.owner = ''master'' AND nu.book_id = $4
         GROUP BY nu.id
         ON CONFLICT DO NOTHING',
        CASE WHEN has_review THEN ', review_weeks' ELSE '' END,
        CASE WHEN has_review THEN ', max(pc.review_weeks)' ELSE '' END)
      USING npl, umap, pl.id, nb;
      IF to_regclass('public.curriculum_unit_done') IS NOT NULL THEN
        INSERT INTO curriculum_unit_done (placement_id, unit_id, done_at, done_by)
        SELECT DISTINCT ON (nu.id) npl, nu.id, d.done_at, d.done_by
        FROM curriculum_unit_done d JOIN curriculum_units nu ON nu.id = (umap->>d.unit_id::text)::uuid
        WHERE d.placement_id = pl.id AND nu.book_id = nb
        ORDER BY nu.id, d.done_at
        ON CONFLICT DO NOTHING;
      END IF;
      SELECT pmap || COALESCE(jsonb_object_agg(pl.id::text || '|' || nu.id::text, npl::text), '{}'::jsonb) INTO pmap
      FROM curriculum_units nu WHERE nu.book_id = nb;
    END LOOP;
    n := n + 1;
  END LOOP;

  PERFORM curriculum_remap_plans(umap, pmap);
  UPDATE curriculum_resources r SET unit_id = (umap->>r.unit_id::text)::uuid, lesson_id = NULL
  WHERE r.unit_id = ANY(old_ids) AND umap->>r.unit_id::text IS NOT NULL;
  UPDATE curriculum_resources r SET unit_id = (umap->>l.unit_id::text)::uuid, lesson_id = NULL
  FROM curriculum_lessons l WHERE r.lesson_id = l.id AND l.unit_id = ANY(old_ids) AND umap->>l.unit_id::text IS NOT NULL;

  DELETE FROM curriculum_placements WHERE book_id = p_old_book;
  UPDATE curriculum_books SET status = 'retired', updated_at = now() WHERE id = p_old_book;
  RETURN n;
END $$;

GRANT EXECUTE ON FUNCTION curriculum_remap_plan_text(TEXT, JSONB, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION curriculum_remap_plans(JSONB, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION curriculum_move_unit(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION curriculum_replace_book(JSONB, TEXT, TEXT, TEXT, JSONB, JSONB, UUID[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION curriculum_split_book(UUID, JSONB) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
