# App PIN lock

Enable in Profile > Settings > App PIN lock. Verify the account password, then choose and confirm a six-digit PIN. Existing users keep PIN disabled until they enable it. Demo mode cannot enable PIN.

After fifteen minutes without trusted input, IFT removes the finance UI from memory and requires the PIN. Returning from a suspended browser checks elapsed time before input can extend the timeout. Refresh retains an unexpired, server-validated grant in the current tab only. Authentication remains signed in. Verification needs an internet connection; failures stay locked. Forgot PIN uses fresh account-password authentication to set a new PIN.

Supabase enforces the gate through restrictive RLS policies on accounts and transactions. Six-digit PINs use bcrypt; random 256-bit grant secrets use SHA-256 hashes at rest and are bound to an active auth session and user. Five incorrect attempts trigger a five-minute cooldown. Changing or disabling PIN requires password AMR within five minutes and revokes all prior grants. Browser activity renews a valid grant; expired grants cannot renew. A retiring token can revoke only itself.

The standalone SQL source is in supabase/pin-lock.sql. It was applied using tracked remote migrations add_idle_pin_lock and bind_pin_revocation_to_retiring_grant. The transactional regression script supabase/pin-lock.test.sql creates synthetic users and rolls back all fixtures. Run only against a controlled database as an administrative role.

Validation: node unit tests cover timer suspension and token origin isolation. Playwright uses WebKit at 390px and 440px with a mocked backend for PIN UI, idle behavior, and setup. SQL tests cover actual RLS denial, token/session binding, cooldown, expiry, password verification and revocation races. WebKit automation is not a physical iPhone test.
