# ADR-014: Email Verification System

## Status

Accepted

## Context

As a platform that issues API keys with programmatic access to user data, we need to ensure that users actually control the email addresses they register with. Without email verification:

1. **Account takeover risk** - Users could register with someone else's email
2. **Support issues** - No way to verify account ownership for password resets
3. **Abuse prevention** - Makes it harder to create throwaway accounts
4. **Trust signal** - Demonstrates professional security practices

We need a verification system that is:

- Secure (tokens can't be guessed or replayed)
- User-friendly (simple flow, clear expiration)
- Maintainable (clean separation from auth system)

## Decision

We will implement a **time-limited, single-use token system** for email verification with the following characteristics:

### Token Design

- **Format**: `evt_<base64url>` (32 random bytes, 43 characters)
- **Storage**: SHA-256 hashed in database
- **Expiration**: 24 hours
- **Single-use**: Token deleted after successful verification
- **Replacement**: Requesting a new token invalidates the old one

### Flow

1. On registration → Generate token → Send verification email
2. User clicks link → `GET /v1/auth/verify-email?token=evt_xxx`
3. Backend verifies token → Mark `email_verified = true` → Delete token
4. Users can resend via `POST /v1/auth/resend-verification` (authenticated)

### Email Abstraction

- `EmailService` interface for pluggability
- `ConsoleEmailService` for development (logs to stdout)
- Production can swap in SendGrid, SES, etc. without code changes

### Database Schema

```sql
-- Users table
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;

-- Verification tokens
CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
);

-- One pending token per user
CREATE UNIQUE INDEX ON email_verification_tokens(user_id);
```

## Rationale

### Why SHA-256 instead of Argon2?

Verification tokens are **randomly generated**, not user-provided:

- No brute-force risk (attacker has no input control)
- 32 bytes of randomness = 2^256 possibilities
- SHA-256 is faster and sufficient for this use case
- Argon2 is for passwords (designed to be slow to resist brute-force)

### Why 24-hour expiration?

- Long enough for users in different time zones
- Short enough to limit exposure window
- Industry standard (GitHub, GitLab, etc. use similar)
- Prevents token accumulation in database

### Why single-use tokens?

- **Security**: Prevents replay attacks
- **Simplicity**: Clear state machine (pending → verified)
- **Cleanup**: Reduces database clutter
- Users can always request a new token if needed

### Why separate from session tokens?

- **Lifecycle**: Verification tokens are 24h, sessions are 7 days
- **Use case**: Verification tokens sent to unverified emails
- **Security model**: Different threat models and expiration needs
- **Clarity**: Separate concerns = easier to reason about

### Why require one token per user?

- Prevents token spam/abuse
- Simplifies user experience (only one valid link at a time)
- Forces replacement on resend (clearer intent)
- Implemented via unique index on `user_id`

## Alternatives Considered

### Magic links (passwordless login)

- **Rejected**: Doesn't verify ownership, just proves email access once
- Our tokens are specifically for verification, not authentication

### JWT tokens

- **Rejected**: Stateless tokens can't be revoked
- We need ability to invalidate tokens on resend
- Database-backed tokens give us more control

### 6-digit codes (like 2FA)

- **Rejected**: Harder to automate, worse UX
- Email links are more convenient (one-click)
- Industry standard for email verification

### No expiration

- **Rejected**: Security risk (tokens valid forever)
- Database bloat over time
- Standard practice is to expire verification tokens

## Enforcement Strategy

**Current**: Email verification is **optional**

- Users can use API without verification
- `email_verified` field returned in `/v1/auth/me`
- Platform can decide enforcement later

**Future Options**:

1. **Soft enforcement**: Warn unverified users in responses
2. **Hard enforcement**: Require verification before API key generation
3. **Tiered**: Free tier requires verification, paid doesn't
4. **Rate limiting**: Higher limits for verified users

We chose optional for MVP to reduce friction, but the infrastructure is ready for enforcement.

## Security Considerations

### Protections in place

- Tokens hashed in database (DB compromise doesn't expose tokens)
- Show-once pattern (token never retrievable after generation)
- Time-limited validity (reduces exposure window)
- Single-use (prevents replay)
- Token replacement (invalidates old tokens)

### Production TODO

- **Rate limiting** on resend endpoint (prevent email spam)
- **Email queue** (async sending via Redis/Bull)
- **Delivery tracking** (log email send attempts)
- **Monitoring** (track verification rates)
- **SPF/DKIM** (prevent email spoofing)

### Attack Scenarios

**Scenario**: Attacker tries to brute-force token

- **Mitigation**: 32 bytes randomness = 2^256 combinations, computationally infeasible

**Scenario**: Attacker intercepts email

- **Mitigation**: Single-use token, 24h expiration. User can request new token.

**Scenario**: Attacker spams resend endpoint

- **Mitigation**: (Future) Rate limiting on resend, CAPTCHA, email send throttling

## Future Considerations

### Enhancements

1. **Email templates**: Branded HTML emails with proper styling
2. **Locale support**: Verification emails in user's language
3. **Analytics**: Track verification funnel (sent → opened → clicked → verified)
4. **Reminders**: Auto-send reminder after 24 hours if unverified
5. **Admin tools**: Manually verify users for support cases

### Production Integration

```typescript
// Example: SendGrid integration
import sgMail from '@sendgrid/mail';

export class SendGridEmailService implements EmailService {
  async sendEmail(message: EmailMessage): Promise<void> {
    await sgMail.send({
      to: message.to,
      from: 'noreply@publier.io',
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}
```

### Enforcement Options

```typescript
// Example: Require verification before API key generation
if (!user.email_verified) {
  throw new ApiError(
    403,
    "FORBIDDEN",
    "Please verify your email before generating API keys"
  );
}
```

## References

- [OWASP: Email Verification](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- [Auth0: Email Verification Best Practices](https://auth0.com/docs/customize/email/email-templates)
- SHA-256 security: [NIST FIPS 180-4](https://csrc.nist.gov/publications/detail/fips/180/4/final)

## Related ADRs

- [ADR-009: Developer Authentication Strategy](./ADR-009-developer-auth.md) - Session-based auth
- [ADR-011: API Key Security](./ADR-011-api-key-security.md) - Token hashing patterns
