# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in IMaxart Platform, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

### How to Report

Email: **security@imaxart.com**

Include:

- Description of the vulnerability
- Steps to reproduce
- Impact assessment
- Suggested fix (if any)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Assessment**: Within 7 days
- **Fix**: Depends on severity, typically within 30 days

### Scope

The following are in scope:

- `apps/platform` (main dashboard application)
- `apps/status` (public status page)
- `packages/sdk` (client-side SDK)
- `packages/db` (database schemas and migrations)
- `packages/auth` (authentication)
- Docker configurations
- CI/CD pipeline security

### Out of Scope

- Vulnerabilities in third-party dependencies (report to the upstream project)
- Self-hosted instances with modified code
- Social engineering

## Supported Versions

| Version | Supported |
| ------- | --------- |
| Latest  | Yes       |

## Disclosure Policy

We follow coordinated disclosure. We will credit reporters in the release notes unless anonymity is requested.
