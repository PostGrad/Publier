-- Add email verification to users table

-- Add email_verified column only (email_verified_at already exists from migration 003)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;

-- Create email_verification_tokens table
-- Tokens are time-limited and single-use

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Token (hashed with SHA-256, like API keys)
    token_hash TEXT NOT NULL UNIQUE,
    
    -- Expiration
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_tokens_user ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_hash ON email_verification_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_expires ON email_verification_tokens(expires_at);

-- Enforce one pending token per user (without now() predicate)
-- Manual cleanup can be done via deleteExpiredTokens() function
CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_tokens_user_pending 
ON email_verification_tokens(user_id);

COMMENT ON TABLE email_verification_tokens IS 'Time-limited, single-use tokens for email verification';
COMMENT ON COLUMN users.email_verified IS 'Whether the user has verified their email address';
