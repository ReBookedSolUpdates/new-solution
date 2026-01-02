-- Create the knowledge_base table
CREATE TABLE public.knowledge_base (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text',
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  source_file_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT knowledge_title_length CHECK (char_length(title) <= 500),
  CONSTRAINT knowledge_content_length CHECK (char_length(content) <= 50000)
);

-- Create indexes for better query performance
CREATE INDEX idx_knowledge_user_id ON public.knowledge_base(user_id);
CREATE INDEX idx_knowledge_created_at ON public.knowledge_base(created_at DESC);
CREATE INDEX idx_knowledge_is_active ON public.knowledge_base(is_active);
CREATE INDEX idx_knowledge_subject_id ON public.knowledge_base(subject_id);

-- Enable Row Level Security
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for SELECT (users can only see their own knowledge)
CREATE POLICY "Users can view their own knowledge"
  ON public.knowledge_base
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create RLS policy for INSERT (users can create their own knowledge)
CREATE POLICY "Users can create their own knowledge"
  ON public.knowledge_base
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policy for UPDATE (users can update their own knowledge)
CREATE POLICY "Users can update their own knowledge"
  ON public.knowledge_base
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policy for DELETE (users can delete their own knowledge)
CREATE POLICY "Users can delete their own knowledge"
  ON public.knowledge_base
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_knowledge_base_updated_at
  BEFORE UPDATE ON public.knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();