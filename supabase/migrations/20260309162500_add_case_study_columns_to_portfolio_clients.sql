/*
  # Add Case Study columns to portfolio_clients

  ## Summary
  Adds three new text columns to the `portfolio_clients` table to support a structured
  Case Study display on the public-facing portfolio client modal.

  ## New Columns
  - `case_task` (text, nullable) — Describes the client's original goal/challenge ("Задача")
  - `case_solution` (text, nullable) — Describes what was done to solve it ("Решение")
  - `case_result` (text, nullable) — Describes the measurable outcome achieved ("Результат")

  ## Notes
  - All three columns are nullable so existing clients remain unaffected
  - No RLS changes needed; the existing policies on portfolio_clients already cover these columns
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'portfolio_clients' AND column_name = 'case_task'
  ) THEN
    ALTER TABLE portfolio_clients ADD COLUMN case_task text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'portfolio_clients' AND column_name = 'case_solution'
  ) THEN
    ALTER TABLE portfolio_clients ADD COLUMN case_solution text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'portfolio_clients' AND column_name = 'case_result'
  ) THEN
    ALTER TABLE portfolio_clients ADD COLUMN case_result text DEFAULT '';
  END IF;
END $$;
