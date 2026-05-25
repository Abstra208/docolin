/**
 * Normalizes a database timestamp to an ISO string.
 *
 * The drizzle query builder maps timestamp columns to `Date`, but a raw `sql`
 * execute (which `searchGuides` uses) returns them as the driver's raw strings.
 * So a value sourced from raw SQL can be either a `Date` or a string, and code
 * that blindly called `.toISOString()` crashed once the column was non-null.
 * An unparseable string yields null rather than throwing.
 */
export function toIsoString(value: Date | string | null): string | null {
  if (value === null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
