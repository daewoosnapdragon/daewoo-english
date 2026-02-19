-- ============================================================================
-- MIGRATION: Grade 1 Level Test Structure
-- Daewoo English Program - Spring 2026
-- ============================================================================
-- This migration updates the level_tests config to support the Grade 1
-- two-part test structure (Written + Oral) with adaptive passage levels,
-- CCSS standards mapping, and Grade 1-specific placement bands.
-- ============================================================================

-- 1. Create a Grade 1 Spring level test with the correct config
-- (Only inserts if no Spring Grade 1 test exists yet for 2025-2026)

INSERT INTO level_tests (name, grade, academic_year, semester, config, status)
SELECT
  'Spring 2026 - Grade 1',
  1,
  '2025-2026',
  'spring',
  '{
    "test_format": "grade1_spring",
    "parts": {
      "written": {
        "label": "Written Test",
        "administration": "whole_class",
        "total_points": 30,
        "sections": [
          {"key": "w_letter_names", "label": "Letter Names", "max": 5, "standards": ["RF.K.1d"]},
          {"key": "w_letter_sounds", "label": "Letter Sounds", "max": 5, "standards": ["RF.K.3a"]},
          {"key": "w_word_picture", "label": "Word-Picture Match", "max": 10, "standards": ["RF.K.3c", "RF.1.3g", "L.K.5c", "L.1.5c"]},
          {"key": "w_passage_comp", "label": "Passage Comprehension", "max": 5, "standards": ["RL.K.1", "RI.K.1", "SL.K.2", "SL.1.2"]},
          {"key": "w_writing", "label": "Writing", "max": 5, "standards": ["W.K.2", "W.1.2", "L.K.2c", "L.K.2d", "L.1.2d"]}
        ]
      },
      "oral": {
        "label": "Oral Test",
        "administration": "one_on_one",
        "sections": [
          {"key": "o_alpha_names", "label": "Alphabet Names", "max": 16, "standards": ["RF.K.1d"]},
          {"key": "o_alpha_sounds", "label": "Alphabet Sounds", "max": 16, "standards": ["RF.K.3a"]},
          {"key": "o_alpha_words", "label": "Alphabet Words", "max": 5, "standards": ["RF.K.3a", "L.K.5c"]},
          {"key": "o_phoneme", "label": "Phoneme Manipulation", "max": 12, "standards": ["RF.K.2", "RF.1.2"]},
          {"key": "o_passage_level", "label": "Passage Level", "max": null, "type": "select", "options": ["A", "B", "C", "D", "E", "F"]},
          {"key": "o_orf_raw", "label": "ORF Raw Score", "max": null, "note": "Level-dependent: A=/4, B=/20, C=/15, D-F=CWPM"},
          {"key": "o_orf_words_read", "label": "Words Read (:60)", "max": null, "note": "For levels D-F only"},
          {"key": "o_orf_errors", "label": "Errors", "max": null, "note": "For levels D-F only"},
          {"key": "o_orf_time_seconds", "label": "Time (seconds)", "max": null, "note": "If finished before 60s"},
          {"key": "o_naep", "label": "NAEP Rating", "max": 4, "min": 1, "note": "For levels D-F only", "standards": ["RF.1.4"]},
          {"key": "o_comp_q1", "label": "Comprehension Q1", "max": 2},
          {"key": "o_comp_q2", "label": "Comprehension Q2", "max": 2},
          {"key": "o_comp_q3", "label": "Comprehension Q3", "max": 2},
          {"key": "o_comp_q4", "label": "Comprehension Q4", "max": 2},
          {"key": "o_comp_q5", "label": "Comprehension Q5", "max": 2, "note": "Levels E-F only"},
          {"key": "o_open_response", "label": "Open Response", "max": 5, "standards": ["SL.K.4", "SL.1.4", "SL.K.6", "SL.1.6"]}
        ],
        "passage_configs": {
          "A": {
            "label": "Level A: Oral Interview",
            "orf_max": 4,
            "has_cwpm": false,
            "has_naep": false,
            "comp_questions": 0,
            "bump_up_threshold": 4,
            "standards": ["SL.K.1", "SL.K.6"]
          },
          "B": {
            "label": "Level B: HF Word List",
            "orf_max": 20,
            "has_cwpm": false,
            "has_naep": false,
            "comp_questions": 0,
            "bump_up_threshold": 15,
            "bump_down_threshold": 0,
            "standards": ["RF.K.3c"]
          },
          "C": {
            "label": "Level C: Simple Sentences",
            "orf_max": 15,
            "has_cwpm": false,
            "has_naep": false,
            "comp_questions": 0,
            "bump_down_threshold": 0,
            "standards": ["RF.K.4", "RF.1.3"]
          },
          "D": {
            "label": "Level D: My Cat (25 words)",
            "word_count": 25,
            "has_cwpm": true,
            "has_naep": true,
            "comp_questions": 4,
            "comp_max": 8,
            "passage_weight": 1.1,
            "bump_down_words_30s": 10,
            "standards": ["RF.1.4", "RL.1.1", "RL.1.2"]
          },
          "E": {
            "label": "Level E: Lunch Time (47 words)",
            "word_count": 47,
            "has_cwpm": true,
            "has_naep": true,
            "comp_questions": 5,
            "comp_max": 10,
            "passage_weight": 1.2,
            "bump_down_words_30s": 10,
            "standards": ["RF.1.4", "RL.1.1", "RL.1.2", "RL.1.3"]
          },
          "F": {
            "label": "Level F: Rainy Day (59 words)",
            "word_count": 59,
            "has_cwpm": true,
            "has_naep": true,
            "comp_questions": 5,
            "comp_max": 10,
            "passage_weight": 1.3,
            "bump_down_words_30s": 10,
            "standards": ["RF.1.4", "RL.1.1", "RL.1.2", "RL.1.3", "RL.1.7"]
          }
        }
      }
    },
    "weights": {
      "oral_test": 0.50,
      "written_test": 0.35,
      "teacher_impression": 0.15
    },
    "placement_bands": {
      "Lily": {
        "description": "Pre-reader / minimal English",
        "indicators": ["Passage level A", "Letter names < 8/16", "Written total < 10/30", "Cannot segment sounds"]
      },
      "Camellia": {
        "description": "Emerging letter knowledge, some sight words",
        "indicators": ["Passage level A-B", "Letter names 8-14/16", "Some letter sounds", "Written 10-15/30"]
      },
      "Daisy": {
        "description": "Solid letter knowledge, beginning reader",
        "indicators": ["Passage level B-C", "Most letters known", "Phoneme segmenting emerging", "Written 14-19/30"]
      },
      "Sunflower": {
        "description": "Reading simple connected text",
        "indicators": ["Passage level C-D", "Full alphabet mastery", "Can segment CVC", "Written 18-23/30"]
      },
      "Marigold": {
        "description": "Reading with developing fluency",
        "indicators": ["Passage level D-E", "CWPM 15-35", "Comprehension 5+/8", "Written 22-27/30"]
      },
      "Snapdragon": {
        "description": "Fluent reader, strong comprehension",
        "indicators": ["Passage level E-F", "CWPM 30+", "Comprehension 7+/10", "Written 25+/30", "Writing score 4-5"]
      }
    },
    "standards_baseline": {
      "RF.K.1d": {"test_section": "w_letter_names", "mastery_threshold": 4, "also_checks": "o_alpha_names"},
      "RF.K.3a": {"test_section": "w_letter_sounds", "mastery_threshold": 4, "also_checks": "o_alpha_sounds"},
      "RF.K.3c": {"test_section": "w_word_picture", "mastery_threshold": 7},
      "RF.1.3g": {"test_section": "w_word_picture", "mastery_threshold": 8},
      "RF.K.2":  {"test_section": "o_phoneme", "mastery_threshold": 8},
      "RF.1.2":  {"test_section": "o_phoneme", "mastery_threshold": 10},
      "SL.K.2":  {"test_section": "w_passage_comp", "mastery_threshold": 3},
      "RL.K.1":  {"test_section": "w_passage_comp", "mastery_threshold": 4},
      "W.K.2":   {"test_section": "w_writing", "mastery_threshold": 2},
      "W.1.2":   {"test_section": "w_writing", "mastery_threshold": 4},
      "L.K.2d":  {"test_section": "w_writing", "mastery_threshold": 2},
      "RF.1.4":  {"test_section": "o_naep", "mastery_threshold": 3}
    },
    "naep_multipliers": {"1": 0.85, "2": 0.95, "3": 1.0, "4": 1.1},
    "passage_weights": {"D": 1.1, "E": 1.2, "F": 1.3}
  }'::jsonb,
  'draft'
WHERE NOT EXISTS (
  SELECT 1 FROM level_tests
  WHERE grade = 1 AND semester = 'spring' AND academic_year = '2025-2026'
);

-- 2. Add teacher_impression field to teacher_anecdotal_ratings
-- This is a quick 1-5 holistic rating from the oral test session
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teacher_anecdotal_ratings' AND column_name = 'teacher_impression'
  ) THEN
    ALTER TABLE teacher_anecdotal_ratings
      ADD COLUMN teacher_impression INTEGER CHECK (teacher_impression BETWEEN 1 AND 5);
    COMMENT ON COLUMN teacher_anecdotal_ratings.teacher_impression IS
      'Quick 1-5 holistic impression from oral test session (Grade 1 placement)';
  END IF;
END $$;
