-- Add brand column to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand text;

-- Create brands table
CREATE TABLE IF NOT EXISTS brands (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brands_public_read" ON brands;
DROP POLICY IF EXISTS "brands_admin_all" ON brands;

CREATE POLICY "brands_public_read" ON brands
  FOR SELECT USING (active = true);

CREATE POLICY "brands_admin_all" ON brands
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Insert seed brands
INSERT INTO brands (name, slug) VALUES
  ('Emestudio',          'emestudio'),
  ('Nude Project',       'nude-project'),
  ('Scuffers',           'scuffers'),
  ('Essentials',         'essentials'),
  ('Valley',             'valley'),
  ('Corteiz',            'corteiz'),
  ('MixedEmotion',       'mixedemotion'),
  ('Supreme',            'supreme'),
  ('OFF White',          'off-white'),
  ('Syna by Central Cee','syna-by-central-cee'),
  ('OVO by Drake',       'ovo-by-drake'),
  ('Bape',               'bape')
ON CONFLICT (slug) DO NOTHING;
