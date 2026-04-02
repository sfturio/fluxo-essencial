-- Fluxo Essencial - allow authenticated users to insert their own profile row
-- Date: 2026-04-02
-- Safe/idempotent migration

begin;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles_insert_own'
  ) THEN
    CREATE POLICY profiles_insert_own ON public.profiles
      FOR INSERT
      WITH CHECK (id = auth.uid());
  END IF;
END$$;

commit;
