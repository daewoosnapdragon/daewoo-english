-- Serious concern: change for the worse. Six change-over-time sentences for the serious tier. Safe to re-run.
INSERT INTO comment_phrases (seed_key, kind, area, tier, category, grades, doc, text, sort_order) VALUES
  ($q$behavior-073$q$, $q$sentence$q$, $q$behavior$q$, $q$serious concern$q$, $q$Change over time$q$, $q$all$q$, $q$both$q$, $q${name}'s focus has slipped since the October progress report, and {his} work shows it.$q$, 73),
  ($q$behavior-074$q$, $q$sentence$q$, $q$behavior$q$, $q$serious concern$q$, $q$Change over time$q$, $q$all$q$, $q$both$q$, $q${name} needed few reminders in September and now needs them in most lessons.$q$, 74),
  ($q$behavior-075$q$, $q$sentence$q$, $q$behavior$q$, $q$serious concern$q$, $q$Change over time$q$, $q$all$q$, $q$both$q$, $q${name}'s homework came in every week until October and has stopped coming in since.$q$, 75),
  ($q$behavior-076$q$, $q$sentence$q$, $q$behavior$q$, $q$serious concern$q$, $q$Change over time$q$, $q$all$q$, $q$both$q$, $q${name} took part readily in September and now sits out of most speaking activities.$q$, 76),
  ($q$behavior-077$q$, $q$sentence$q$, $q$behavior$q$, $q$serious concern$q$, $q$Change over time$q$, $q$all$q$, $q$both$q$, $q${name}'s behavior toward classmates has got worse since the progress report, not better.$q$, 77),
  ($q$behavior-078$q$, $q$sentence$q$, $q$behavior$q$, $q$serious concern$q$, $q$Change over time$q$, $q$all$q$, $q$both$q$, $q$The problems raised on the October progress report have not improved.$q$, 78)
ON CONFLICT (seed_key) DO NOTHING;
