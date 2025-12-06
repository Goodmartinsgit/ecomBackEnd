# Security Guidelines

## Important Security Notes

### 1. Environment Variables
- **NEVER** commit the `.env` file to version control
- The `.env` file contains sensitive credentials that should be kept secret
- Use `.env.example` as a template for required variables
- Rotate all credentials regularly

### 2. Current Security Issues to Address

⚠️ **CRITICAL**: Your `.env` file currently contains exposed credentials:
- Database connection string with password
- Cloudinary API credentials
- Email password
- JWT secret key
- Flutterwave secret key

**Action Required:**
1. Rotate all credentials immediately
2. Add `.env` to `.gitignore` if not already present
3. Remove `.env` from git history if it was committed
4. Use environment-specific secrets management in production

### 3. Best Practices

- Use strong, randomly generated JWT secrets (minimum 256 bits)
- Enable 2FA on all third-party services (Cloudinary, Flutterwave, etc.)
- Use app-specific passwords for email services
- Implement proper HTTPS in production
- Keep dependencies updated regularly
- Monitor for security vulnerabilities

### 4. Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use secure database connections (SSL/TLS)
- [ ] Enable CORS only for trusted domains
- [ ] Implement proper logging and monitoring
- [ ] Set up rate limiting (already configured)
- [ ] Use helmet for security headers (already configured)
- [ ] Implement input validation on all endpoints
- [ ] Set up automated security scanning

## Reporting Security Issues

If you discover a security vulnerability, please email the security team immediately.
Do not create public GitHub issues for security vulnerabilities.
