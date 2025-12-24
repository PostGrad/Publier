-- API keys are the programmatic credentials for accessing Publier's API.
-- They belong to Apps and have scoped permissions.

CREATE TABLE api_keys (
    id UUID PRIMARY KEY,
    app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    
    -- Key identification
    name TEXT NOT NULL,                    -- e.g., "Production Key"
    key_prefix TEXT NOT NULL,              -- e.g., "pub_live_abc" (first 12 chars, for display)
    key_hash TEXT NOT NULL UNIQUE,         -- SHA-256 hash of full key
    
    -- Permissions
    scopes TEXT[] NOT NULL DEFAULT '{}',   -- e.g., {'posts:read', 'posts:write'}
    
    -- Metadata
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,                -- null = never expires
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookup by key hash (for auth middleware)
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- List keys by app
CREATE INDEX idx_api_keys_app ON api_keys(app_id);