-- Create groups table if it doesn't exist
CREATE TABLE IF NOT EXISTS groups (
  id bigint primary key generated by default as identity,
  name text not null unique,
  created_at timestamptz default now()
);

-- Add RLS policies
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to read groups
CREATE POLICY "Allow public read access" ON groups
  FOR SELECT USING (true);

-- Create policy to allow authenticated users to insert groups
CREATE POLICY "Allow authenticated insert" ON groups
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  
-- Create policy to allow authenticated users to delete their own groups
CREATE POLICY "Allow authenticated delete" ON groups
  FOR DELETE USING (auth.role() = 'authenticated');

-- Index on name for faster lookups
CREATE INDEX IF NOT EXISTS groups_name_idx ON groups (name);

-- If using anon user access, add explicit permissions
GRANT SELECT ON groups TO anon;
GRANT ALL ON groups TO postgres;
GRANT ALL ON groups TO service_role;

-- Ensure reactions table exists with proper constraints
CREATE TABLE IF NOT EXISTS reactions (
  id bigint primary key generated by default as identity,
  message_id bigint not null references messages(id) on delete cascade,
  username text not null,
  reaction text not null,
  created_at timestamptz default now()
);

-- Ensure RLS policies are enabled
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read reactions
CREATE POLICY IF NOT EXISTS "Allow public read access" ON reactions
  FOR SELECT USING (true);

-- Allow authenticated users to insert reactions
CREATE POLICY IF NOT EXISTS "Allow authenticated insert" ON reactions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Ensure index exists for faster lookups
CREATE INDEX IF NOT EXISTS reactions_message_id_idx ON reactions (message_id);
