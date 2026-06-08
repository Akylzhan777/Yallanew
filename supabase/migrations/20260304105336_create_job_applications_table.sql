/*
  # Create job_applications table

  1. New Tables
    - `job_applications`
      - `id` (uuid, primary key)
      - `full_name` (text, required)
      - `phone` (text, required)
      - `email` (text, optional)
      - `position` (text, required)
      - `experience` (text, optional)
      - `portfolio_link` (text, optional)
      - `about` (text, optional)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Allow anyone (public) to INSERT (submit an application)
    - Allow only authenticated admins to SELECT (read applications)
*/

CREATE TABLE IF NOT EXISTS job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  position text NOT NULL,
  email text,
  experience text,
  portfolio_link text,
  about text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a job application"
  ON job_applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read all job applications"
  ON job_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
