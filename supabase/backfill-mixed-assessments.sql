-- ============================================================================
-- BACKFILL: route existing assessments by the standards on their question map
-- Run in the Supabase SQL Editor after migration-mixed-assessments.sql.
-- Safe to run twice.
--
-- Routing used to be an opt-in box that most teachers never saw, so papers
-- tagged with another domain's standards (L.4.3 on a Reading test) were saved
-- as single-domain. This recomputes `mixed` and `domain_split` from each
-- question map the same way the app now does on save, then fills
-- `domain_scores` on every grade row that has item detail. Rows entered as
-- one plain total have no item detail and keep the proportional fallback.
--
-- Prefix → domain: RL/RI reading, RF phonics, W writing, SL speaking,
-- L language; anything else (or no tag) → the assessment's own domain.
-- A rubric item is 4 points per criterion, routed by the criterion's own
-- standard, else the question's.
-- ============================================================================

CREATE OR REPLACE FUNCTION _ccss_domain(code TEXT, fallback TEXT) RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE upper(split_part(coalesce(code, ''), '.', 1))
    WHEN 'RL' THEN 'reading' WHEN 'RI' THEN 'reading' WHEN 'RF' THEN 'phonics'
    WHEN 'W' THEN 'writing' WHEN 'SL' THEN 'speaking' WHEN 'L' THEN 'language'
    ELSE fallback END
$$;

-- 1. Possible points per domain for every assessment with a question map.
WITH pts AS (
  SELECT a.id, _ccss_domain(q->>'standard', a.domain) AS dom, coalesce((q->>'max_points')::numeric, 0) AS pts
  FROM assessments a, jsonb_array_elements(a.question_map) q
  WHERE jsonb_typeof(a.question_map) = 'array'
    AND NOT (q->>'type' = 'rubric' AND jsonb_typeof(q->'rubric'->'criteria') = 'array' AND jsonb_array_length(q->'rubric'->'criteria') > 0)
  UNION ALL
  SELECT a.id, _ccss_domain(coalesce(nullif(c->>'standard', ''), q->>'standard'), a.domain), 4
  FROM assessments a, jsonb_array_elements(a.question_map) q, jsonb_array_elements(q->'rubric'->'criteria') c
  WHERE jsonb_typeof(a.question_map) = 'array'
    AND q->>'type' = 'rubric' AND jsonb_typeof(q->'rubric'->'criteria') = 'array'
), split AS (
  SELECT id, jsonb_object_agg(dom, total) AS domain_split, count(*) FILTER (WHERE total > 0) AS domains
  FROM (SELECT id, dom, sum(pts) AS total FROM pts GROUP BY id, dom) t
  GROUP BY id
)
UPDATE assessments a
SET mixed = (s.domains > 1), domain_split = CASE WHEN s.domains > 1 THEN s.domain_split ELSE NULL END
FROM split s WHERE s.id = a.id
  AND (a.mixed IS DISTINCT FROM (s.domains > 1) OR a.domain_split IS DISTINCT FROM CASE WHEN s.domains > 1 THEN s.domain_split ELSE NULL END);

-- Assessments that lost their map (or never had one) carry no routing.
UPDATE assessments SET mixed = false, domain_split = NULL
WHERE (mixed OR domain_split IS NOT NULL)
  AND (question_map IS NULL OR jsonb_typeof(question_map) <> 'array' OR jsonb_array_length(question_map) = 0);

-- 2. Earned points per domain for every marked paper on a mixed assessment.
WITH earned AS (
  SELECT g.id, _ccss_domain(q->>'standard', a.domain) AS dom, coalesce((r->>'points')::numeric, 0) AS pts
  FROM grades g
  JOIN assessments a ON a.id = g.assessment_id AND a.mixed
  CROSS JOIN jsonb_array_elements(a.question_map) q
  JOIN jsonb_array_elements(g.item_responses) r ON (r->>'q')::int = (q->>'num')::int
  WHERE jsonb_typeof(g.item_responses) = 'array'
    AND NOT (q->>'type' = 'rubric' AND jsonb_typeof(q->'rubric'->'criteria') = 'array' AND jsonb_array_length(q->'rubric'->'criteria') > 0 AND r->'levels' IS NOT NULL)
  UNION ALL
  SELECT g.id, _ccss_domain(coalesce(nullif(c->>'standard', ''), q->>'standard'), a.domain), (r->'levels'->>(c->>'key'))::numeric
  FROM grades g
  JOIN assessments a ON a.id = g.assessment_id AND a.mixed
  CROSS JOIN jsonb_array_elements(a.question_map) q
  JOIN jsonb_array_elements(g.item_responses) r ON (r->>'q')::int = (q->>'num')::int
  CROSS JOIN jsonb_array_elements(q->'rubric'->'criteria') c
  WHERE jsonb_typeof(g.item_responses) = 'array'
    AND q->>'type' = 'rubric' AND jsonb_typeof(q->'rubric'->'criteria') = 'array' AND r->'levels' IS NOT NULL
    AND (r->'levels'->>(c->>'key')) IS NOT NULL
), scores AS (
  SELECT id, jsonb_object_agg(dom, total) AS domain_scores
  FROM (SELECT id, dom, sum(pts) AS total FROM earned GROUP BY id, dom) t
  GROUP BY id
)
UPDATE grades g SET domain_scores = s.domain_scores
FROM scores s WHERE s.id = g.id AND g.domain_scores IS DISTINCT FROM s.domain_scores;

-- Rows on assessments that are no longer mixed carry no per-domain points.
UPDATE grades g SET domain_scores = NULL
FROM assessments a WHERE a.id = g.assessment_id AND NOT a.mixed AND g.domain_scores IS NOT NULL;

DROP FUNCTION _ccss_domain(TEXT, TEXT);

-- Check: every mixed assessment and how its points split.
SELECT name, english_class, grade, domain, max_score, domain_split,
  (SELECT count(*) FROM grades g WHERE g.assessment_id = a.id AND g.domain_scores IS NOT NULL) AS rows_with_domain_points,
  (SELECT count(*) FROM grades g WHERE g.assessment_id = a.id AND g.score IS NOT NULL) AS rows_scored
FROM assessments a WHERE mixed ORDER BY english_class, grade, name;
