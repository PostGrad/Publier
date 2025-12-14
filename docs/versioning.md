# API Versioning & Deprecation Policy

Publier uses explicit URL-based versioning for all public APIs.

## Versioning Strategy

- All endpoints are prefixed with a major version (e.g. `/v1`)
- No breaking changes will be introduced within a major version
- Backward compatibility is a strict guarantee

## What Counts as a Breaking Change

- Removing or renaming fields
- Changing field types or semantics
- Changing authentication or authorization behavior
- Modifying error codes or response structures

## Deprecation Process

When a breaking change is required:

1. A new major version is introduced (e.g. `/v2`)
2. The old version remains supported for a defined deprecation window
3. Deprecation notices are documented and communicated
4. Clients are given sufficient time to migrate

## Rationale

This approach prioritizes stability and trust for external developers who rely on Publier as a platform component in their systems.
