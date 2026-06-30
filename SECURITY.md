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

| Version | Support | Status |
|---------|---------|--------|
| 3.x | 🔮 Future | In development |
| 2.x | ✅ Active | Latest: 2.1.3 (see PUBLISH.md) |
| 1.x | ⚠️ End of life | No longer supported |
| < 1.0 | ❌ Not supported | — |

**Note:** All cryptographic primitives in SpeexJS are bindings to Node.js built-in `node:crypto` (AES-256-GCM, HMAC-SHA256, scrypt, PBKDF2). No custom reimplementation of cryptographic algorithms is used. Zero runtime dependencies means zero npm supply-chain risk, not zero algorithm reimplementation risk — the latter is mitigated by exclusively using Node.js native crypto.

## Responsible Disclosure

1. Report first — do not disclose publicly before a fix is available
2. Allow 30-90 days depending on complexity
3. We will credit you in release notes (if you consent)

## Security Scope

### Server
- CSRF double-submit cookie pattern
- Helmet security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- CORS with credential-aware origin validation
- Rate limiting (static, adaptive, per-route)
- Request body size limiting
- HTTP response splitting prevention

### Authentication (v3.0)
- **SAML2 Guard**: RSA-SHA256 signature verification, XML parsing security
- **OIDC Guard**: JWT validation (RS/ES algorithms), JWKS lookup, nonce verification
- **Session Guard**: AES-256-GCM encrypted session cookies
- **Token Guard**: HMAC-SHA256 hashed tokens, scrypt + PBKDF2 hashing
- **Sanctum SPA**: CSRF + HMAC token management
- **WebAuthn**: CBOR COSE key parsing, ES/RS signature verification
- **TOTP**: RFC 6238 compliant, 30s window, timing-safe comparison
- **OAuth**: State parameter validation, CSRF protection during OAuth flow
- **Account Lockout**: Brute force protection with exponential backoff

### Database
- **Parameterized queries**: All queries use parameterized SQL — no string concatenation
- **Input validation**: SQL injection prevention on whereRaw/orderByRaw
- **Migration safety**: Destructive change detection, code reference scanning
- **UUID validation**: Strict UUID format validation

### Schema Validation
- 29+ schema types with strict validation
- Input sanitization prevents injection attacks
- Type coercion with safety checks
- Refine and transform with error boundaries

### Crypto
- AES-256-GCM encryption for session data
- HMAC-SHA256 for signed URLs, webhooks, tokens
- scrypt + PBKDF2 for password hashing
- Constant-time comparison for sensitive values
- crypto.randomBytes for all token generation

### Storage
- Path traversal prevention for file operations
- Filename sanitization
- MIME type validation for uploads
- Size limitation with configurable max

### Zero Dependencies
- Zero runtime dependencies = minimal attack surface
- No supply chain risk from transitive dependencies
- No npm audit noise — zero dependencies means zero known vulnerabilities
