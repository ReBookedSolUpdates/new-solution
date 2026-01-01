-- Quiz questions table
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice',
  options JSONB DEFAULT '[]',
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  points INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quiz questions"
ON public.quiz_questions FOR SELECT
USING (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.user_id = auth.uid()));

CREATE POLICY "Users can create quiz questions"
ON public.quiz_questions FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.user_id = auth.uid()));

CREATE POLICY "Users can update quiz questions"
ON public.quiz_questions FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.user_id = auth.uid()));

CREATE POLICY "Users can delete quiz questions"
ON public.quiz_questions FOR DELETE
USING (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON public.quiz_questions(quiz_id);

-- Quiz attempts table
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  score NUMERIC(5,2),
  max_score NUMERIC(5,2),
  percentage NUMERIC(5,2),
  time_taken_seconds INTEGER,
  answers JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quiz attempts"
ON public.quiz_attempts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own quiz attempts"
ON public.quiz_attempts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON public.quiz_attempts(quiz_id);

-- Lessons table
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  difficulty TEXT DEFAULT 'medium',
  estimated_duration_minutes INTEGER,
  is_ai_generated BOOLEAN DEFAULT false,
  total_sections INTEGER DEFAULT 0,
  order_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lessons"
ON public.lessons FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own lessons"
ON public.lessons FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lessons"
ON public.lessons FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lessons"
ON public.lessons FOR DELETE
USING (auth.uid() = user_id);

-- Lesson sections table
CREATE TABLE IF NOT EXISTS public.lesson_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text',
  content_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lesson_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lesson sections"
ON public.lesson_sections FOR SELECT
USING (EXISTS (SELECT 1 FROM public.lessons WHERE lessons.id = lesson_sections.lesson_id AND lessons.user_id = auth.uid()));

CREATE POLICY "Users can create lesson sections"
ON public.lesson_sections FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.lessons WHERE lessons.id = lesson_sections.lesson_id AND lessons.user_id = auth.uid()));

CREATE POLICY "Users can update lesson sections"
ON public.lesson_sections FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.lessons WHERE lessons.id = lesson_sections.lesson_id AND lessons.user_id = auth.uid()));

CREATE POLICY "Users can delete lesson sections"
ON public.lesson_sections FOR DELETE
USING (EXISTS (SELECT 1 FROM public.lessons WHERE lessons.id = lesson_sections.lesson_id AND lessons.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_lesson_sections_lesson ON public.lesson_sections(lesson_id);

-- Lesson completions table
CREATE TABLE IF NOT EXISTS public.lesson_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  completed_sections INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lesson_id, user_id)
);

ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lesson completions"
ON public.lesson_completions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own lesson completions"
ON public.lesson_completions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lesson completions"
ON public.lesson_completions FOR UPDATE
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_lesson_completions_user ON public.lesson_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_lesson ON public.lesson_completions(lesson_id);

-- Trigger to update quiz question count
CREATE OR REPLACE FUNCTION public.update_quiz_question_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.quizzes
  SET 
    total_questions = (SELECT COUNT(*) FROM public.quiz_questions WHERE quiz_id = COALESCE(NEW.quiz_id, OLD.quiz_id)),
    updated_at = now()
  WHERE id = COALESCE(NEW.quiz_id, OLD.quiz_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_quiz_question_change ON public.quiz_questions;
CREATE TRIGGER on_quiz_question_change
AFTER INSERT OR UPDATE OR DELETE ON public.quiz_questions
FOR EACH ROW
EXECUTE FUNCTION public.update_quiz_question_count();

-- Trigger to update lesson section count
CREATE OR REPLACE FUNCTION public.update_lesson_section_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.lessons
  SET 
    total_sections = (SELECT COUNT(*) FROM public.lesson_sections WHERE lesson_id = COALESCE(NEW.lesson_id, OLD.lesson_id)),
    updated_at = now()
  WHERE id = COALESCE(NEW.lesson_id, OLD.lesson_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_lesson_section_change ON public.lesson_sections;
CREATE TRIGGER on_lesson_section_change
AFTER INSERT OR UPDATE OR DELETE ON public.lesson_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_lesson_section_count();