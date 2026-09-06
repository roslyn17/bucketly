/**
 * True for PostgREST errors that mean "this session's token isn't valid" --
 * expired, not-yet-valid, or (PGRST303) a JWT whose issued-at looks like
 * it's in the future relative to the database's clock. That last one in
 * particular can happen with a stale token left over from a concurrent
 * refresh, even when nothing's actually wrong with the user's account.
 * getUser() doesn't always catch this itself (the token can look "present"
 * client-side while still failing verification on the DB round-trip), so
 * callers doing their own queries need to check for it too -- and should
 * send the user back to /login for a fresh session rather than crash the
 * page with the raw error.
 */
export function isAuthError(error: { code?: string | null } | null | undefined): boolean {
  return typeof error?.code === "string" && error.code.startsWith("PGRST30");
}
