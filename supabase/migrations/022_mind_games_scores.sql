-- 022: Create mind_games_scores table
CREATE TABLE IF NOT EXISTS public.mind_games_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL, -- 'number_memory', 'word_match', 'color_recall', 'quiz'
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mind_games_scores ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own scores"
  ON public.mind_games_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scores"
  ON public.mind_games_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public leaderboard view"
  ON public.mind_games_scores FOR SELECT
  USING (true); -- Allow everyone to see scores for leaderboard
