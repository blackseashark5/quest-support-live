
-- 1) Restrict profiles SELECT to own profile (was USING true, leaking emails)
DROP POLICY IF EXISTS "profiles select all authenticated" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- 2) Lock down has_role(): callable by authenticated (needed by RLS) but not anon/public.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 3) Ensure user_roles cannot be modified from the Data API by clients.
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;
-- service_role retains full access for admin operations.
