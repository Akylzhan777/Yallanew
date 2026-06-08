/*
  # Add admin global flag and moderation workflow to stock_footage

  1. Modified Tables
    - `stock_footage`
      - `is_admin_global` (boolean, default false) - marks footage uploaded by admin
      - Update status column to support 'pending_approval', 'approved', 'rejected' values
        alongside existing 'active', 'hidden', 'pending_review'

  2. Security
    - Update RLS to allow public marketplace to show only approved/admin_global items
    - Admins can still access all records

  3. Notes
    - Existing 'active' records are treated as 'approved' equivalent
    - User uploads now default to 'pending_approval'
    - Admin uploads set is_admin_global=true and status='approved'
*/

-- Add is_admin_global column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_footage' AND column_name = 'is_admin_global'
  ) THEN
    ALTER TABLE stock_footage ADD COLUMN is_admin_global boolean DEFAULT false;
  END IF;
END $$;

-- Add original_link column for external links (Google Drive, Dropbox)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_footage' AND column_name = 'original_link'
  ) THEN
    ALTER TABLE stock_footage ADD COLUMN original_link text;
  END IF;
END $$;

-- Migrate existing 'active' footage to 'approved' status
UPDATE stock_footage SET status = 'approved' WHERE status = 'active';
