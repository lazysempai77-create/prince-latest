-- =============================================================================
-- Seed the single admin user.
-- Salt + hash were produced by the PowerShell PBKDF2-SHA256 script (200k iters,
-- matching lib/auth.ts hashPassword()).
--
-- Run locally (dev D1):
--   wrangler d1 execute prince-photography-db --local --file=seed-admin.sql
--
-- Run on production D1:
--   wrangler d1 execute prince-photography-db --remote --file=seed-admin.sql
-- =============================================================================

INSERT OR REPLACE INTO admin_users (username, password_hash, password_salt)
VALUES (
  'admin',
  'd50e74cac6fca96385a26d5365e71ace5173d03a46f267e1cbe7b04bea434537',
  'ad8ad790f2f625ab84f024debf272001'
);
