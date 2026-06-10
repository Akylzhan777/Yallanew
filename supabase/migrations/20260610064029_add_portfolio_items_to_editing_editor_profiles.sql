-- Add portfolio_items JSONB column to editing_editor_profiles
-- Each item: { url: string; type: 'image' | 'video'; title?: string }
ALTER TABLE editing_editor_profiles
  ADD COLUMN IF NOT EXISTS portfolio_items jsonb NOT NULL DEFAULT '[]'::jsonb;
