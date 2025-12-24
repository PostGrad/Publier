-- Each app represents an integration built on Publier.
-- Apps own API keys and provide isolation for:
-- - Rate limits
-- - Scopes
-- - Metrics
-- - Revocation

CREATE TABLE apps (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    
    -- Environment separation (future use)
    environment TEXT NOT NULL DEFAULT 'development' 
        CHECK (environment IN ('development', 'production')),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- List apps by user
CREATE INDEX idx_apps_user ON apps(user_id);

-- Auto-update updated_at
CREATE TRIGGER apps_updated_at
    BEFORE UPDATE ON apps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();