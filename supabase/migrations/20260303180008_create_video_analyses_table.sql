/*
  # Create video_analyses table

  ## New Tables
  - `video_analyses`
    - `id` (uuid, primary key, auto-generated)
    - `video_url` (text) — the YouTube or Reels URL that was analyzed
    - `transcript` (text) — full transcription of the video
    - `analysis` (text) — structured analysis (key takeaways, viral hook, action plan)
    - `requested_by` (text) — Telegram username or chat_id of who requested the analysis
    - `created_at` (timestamptz, default now())

  ## Security
  - RLS is disabled on this table as requested (internal admin use only)

  ## Notes
  1. This table stores all historical video analysis requests triggered via the Telegram /analyze command.
  2. RLS disabled intentionally — access is only via the service role key in the edge function.
*/

CREATE TABLE IF NOT EXISTS video_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_url TEXT,
  transcript TEXT,
  analysis TEXT,
  requested_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE video_analyses DISABLE ROW LEVEL SECURITY;
