/*
  # Add final_cover_link column to video_units table

  1. New Columns
    - `final_cover_link` (text, nullable) - Cover photo link submitted by editor for review
  
  2. Purpose
    - Stores the final cover/poster image link that editors must provide before submitting for review
    - Makes cover photo a mandatory field for task submission
*/

ALTER TABLE video_units
ADD COLUMN IF NOT EXISTS final_cover_link text;
