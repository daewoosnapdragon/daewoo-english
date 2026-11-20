// When a feature's tables are not in the database yet, the reader is a
// teacher or the admin, not whoever runs SQL. These say what is missing and
// who can fix it, in words an admin can pass on. Each call site keeps the
// migration file's name in a code comment, so the person who manages the
// database can match "the overtime update" to supabase/migration-overtime.sql.

export interface Feature { en: string; ko: string }

/** "This needs a database update. Ask … to run the overtime update." */
export function needsUpdate(feature: Feature, ko: boolean): string {
  return ko
    ? `이 기능에는 데이터베이스 업데이트가 필요합니다. 앱 데이터베이스 담당자에게 "${feature.ko}" 업데이트를 요청하세요.`
    : `This needs a database update. Ask the person who manages the app’s database to run the ${feature.en} update.`
}

/** The same, for a part of a page that still works without it: `what` is the part that waits. */
export function partNeedsUpdate(what: Feature, feature: Feature, ko: boolean): string {
  return ko
    ? `${what.ko}에는 데이터베이스 업데이트가 필요합니다. 앱 데이터베이스 담당자에게 "${feature.ko}" 업데이트를 요청하세요.`
    : `${what.en} needs a database update. Ask the person who manages the app’s database to run the ${feature.en} update.`
}
