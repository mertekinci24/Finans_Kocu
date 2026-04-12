/*
  # Add Dashboard Layouts Table

  1. New Tables
    - `dashboard_layouts` - User's customized dashboard widget layouts
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `widgets` (jsonb) - Array of Widget objects with type, size, position, enabled
      - `grid_columns` (int) - Number of columns in the grid (default 4)
      - `last_updated` (timestamptz)
      - `version` (int) - Layout schema version for migrations

  2. Security
    - Enable RLS on dashboard_layouts table
    - Users can only view/modify their own layouts

  3. Indexes
    - idx_dashboard_layouts_user_id on dashboard_layouts(user_id)

  4. Purpose
    - Persist user's custom widget arrangement (drag-drop order)
    - Support for layout presets and reset functionality
    - Enable layout sync across devices
*/

CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  widgets jsonb NOT NULL DEFAULT '[]'::jsonb,
  grid_columns integer NOT NULL DEFAULT 4,
  last_updated timestamptz DEFAULT now(),
  version integer DEFAULT 1
);

ALTER TABLE dashboard_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dashboard layout"
  ON dashboard_layouts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own dashboard layout"
  ON dashboard_layouts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dashboard layout"
  ON dashboard_layouts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_dashboard_layouts_user_id ON dashboard_layouts(user_id);
