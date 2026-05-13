-- Create user_backups table
CREATE TABLE IF NOT EXISTS public.user_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    schema_version TEXT NOT NULL,
    backup_type TEXT NOT NULL DEFAULT 'manual',
    payload JSONB NOT NULL,
    summary JSONB,
    size_bytes INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_backups ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can insert their own backups" 
ON public.user_backups FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own backups" 
ON public.user_backups FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own backups" 
ON public.user_backups FOR DELETE 
USING (auth.uid() = user_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_backups_updated_at
    BEFORE UPDATE ON public.user_backups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_backups_user_id ON public.user_backups(user_id);
