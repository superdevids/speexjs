# Security Policy

## Reporting a Vulnerability

We take the security of SpeexJS seriously. If you discover a security vulnerability:

**DO NOT** report it via public GitHub Issues.

Report it via email: **adityasuperdev@gmail.com** with subject `[SECURITY]` and a brief description.

Include:
- Vulnerability description
- Reproduction steps
- Affected versions
- Potential impact
- Suggested fix (optional)

We will respond within **48 hours** to confirm receipt.

## Supported Versions

| Version | Support |
|---------|---------|
| 1.x | ✅ Active |
| 0.6.x - 0.9.x | ⚠️ Limited |
| < 0.6 | ❌ Not supported |

## Responsible Disclosure

1. Report first — do not disclose publicly before a fix is available
2. Allow 30-90 days depending on complexity
3. We will credit you in release notes (if you consent)

## Security Scope

- **Server:** CSRF, Helmet, session security, rate limiting
- **Auth:** scrypt/PBKDF2, token management
- **Schema:** Input validation prevents injection
- **Crypto:** AES-256-GCM, constant-time comparison
- **Database:** Parameterized queries prevent SQL injection
- **Storage:** Path traversal prevention
- **Dependencies:** Zero runtime dependencies = minimal attack surface
