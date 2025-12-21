-- Add updated_at column to posts table
-- Defaults to created_at for existing rows, then updates automatically

ALTER TABLE posts
ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill existing rows: set updated_at = created_at
UPDATE posts SET updated_at = created_at;

-- Create a trigger to auto-update on any row change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();