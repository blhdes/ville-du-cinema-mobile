-- ============================================================
-- Fix RLS policies: scope to 'authenticated' role only,
-- remove redundant SELECT policies, ensure ownership checks.
-- ============================================================

-- ----------------------------------------
-- user_clippings: drop all existing policies
-- ----------------------------------------
DROP POLICY IF EXISTS "Authenticated users can read any clipping" ON public.user_clippings;
DROP POLICY IF EXISTS "Public clippings are readable by authenticated users" ON public.user_clippings;
DROP POLICY IF EXISTS "Users can view their own clippings" ON public.user_clippings;
DROP POLICY IF EXISTS "Users can delete their own clippings" ON public.user_clippings;
DROP POLICY IF EXISTS "Users can insert their own clippings" ON public.user_clippings;

-- user_clippings: create clean policies
CREATE POLICY "Authenticated users can read all clippings"
  ON public.user_clippings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own clippings"
  ON public.user_clippings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clippings"
  ON public.user_clippings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ----------------------------------------
-- user_data: drop all existing policies
-- ----------------------------------------
DROP POLICY IF EXISTS "Public profiles are viewable" ON public.user_data;
DROP POLICY IF EXISTS "Users can view own data" ON public.user_data;
DROP POLICY IF EXISTS "Users can insert own data" ON public.user_data;
DROP POLICY IF EXISTS "Users can update own data" ON public.user_data;
DROP POLICY IF EXISTS "Users can delete own data" ON public.user_data;

-- user_data: create clean policies
CREATE POLICY "Authenticated users can view profiles"
  ON public.user_data
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own data"
  ON public.user_data
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data"
  ON public.user_data
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own data"
  ON public.user_data
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
