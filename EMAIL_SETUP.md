# Email Setup for Production

## Gmail Configuration Issues

The email delivery issue in production is likely due to Gmail's security restrictions. Here are the solutions:

### 1. Use Gmail App Password (Recommended)

1. Enable 2-Factor Authentication on your Gmail account
2. Go to Google Account Settings > Security > 2-Step Verification > App passwords
3. Generate an App Password for "Mail"
4. Use this App Password in `EMAIL_HOST_PASSWORD` environment variable

### 2. Environment Variables Required

```env
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-16-digit-app-password
```

### 3. Alternative Email Services

If Gmail continues to have issues, consider these alternatives:

#### SendGrid (Recommended for Production)
```env
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
```

#### Mailgun
```env
EMAIL_SERVICE=mailgun
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=your-mailgun-domain
EMAIL_FROM=noreply@yourdomain.com
```

### 4. Testing Email Configuration

Add this test endpoint to verify email setup:

```javascript
// Add to userRouter.js for testing
router.post('/test-email', async (req, res) => {
  try {
    await sendPasswordReset('test@example.com', 'http://test-link.com');
    res.json({ success: true, message: 'Test email sent' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

### 5. Production Deployment Notes

- Ensure all environment variables are set in your hosting platform (Render, Heroku, etc.)
- Check hosting platform logs for email-related errors
- Consider using a dedicated email service for better deliverability