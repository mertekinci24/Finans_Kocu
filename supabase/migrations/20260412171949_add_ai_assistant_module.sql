/*
  # Add AI Assistant Chat Module

  1. New Tables
    - `chat_sessions` - User conversation sessions
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `title` (text) - Auto-generated conversation title
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `chat_messages` - Message history
      - `id` (uuid, primary key)
      - `session_id` (uuid, foreign key to chat_sessions)
      - `user_id` (uuid, foreign key to auth.users)
      - `role` (enum: 'user' | 'assistant') - Who sent the message
      - `content` (text) - Message text
      - `suggested_transaction` (text) - JSON: if AI suggested auto-parse {amount, category, description, date}
      - `tokens_used` (integer) - Claude API tokens for cost tracking
      - `created_at` (timestamp)
    - `assistant_context_cache` - Cache user context for RAG
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `context_hash` (text) - Hash of current financial state
      - `cached_data` (text) - JSON: {accounts summary, findeks, transactions trend, alerts}
      - `cached_at` (timestamp)
      - `expires_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Users can ONLY view/insert their own sessions and messages
    - Context cache is user-isolated

  3. Indexes
    - `idx_chat_sessions_user_created` on chat_sessions(user_id, created_at DESC)
    - `idx_chat_messages_session` on chat_messages(session_id, created_at ASC)
    - `idx_assistant_context_user` on assistant_context_cache(user_id)

  4. Key Features
    - Message history persistence (for conversation continuity)
    - Token tracking (for cost optimization)
    - Suggested transactions (AI-parsed natural language)
    - Context caching (5 min TTL — avoid redundant data fetches)
*/

CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Yeni Sohbet',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  suggested_transaction text,
  tokens_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assistant_context_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  context_hash text NOT NULL,
  cached_data text NOT NULL,
  cached_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '5 minutes')
);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_context_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat sessions"
  ON chat_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own chat sessions"
  ON chat_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat sessions"
  ON chat_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own chat messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own context cache"
  ON assistant_context_cache FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own context cache"
  ON assistant_context_cache FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own context cache"
  ON assistant_context_cache FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_chat_sessions_user_created ON chat_sessions(user_id, created_at DESC);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at ASC);
CREATE INDEX idx_assistant_context_user ON assistant_context_cache(user_id);
