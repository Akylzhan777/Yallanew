/*
  # Enable Realtime for operators table

  ## Summary
  Adds the operators table to Supabase Realtime publication so that
  the /booking page automatically refreshes when operators are added,
  updated, or removed from the admin panel.
*/

ALTER PUBLICATION supabase_realtime ADD TABLE operators;
