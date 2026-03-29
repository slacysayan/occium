# Occium Support & Email Integration

## Contact Information
- **Support Email**: support@occium.com
- **OAuth Representative**: Sayan Chowdhury
- **Help Documentation**: [Sitemap](./SITEMAP.md)

## Integration Flow
Occium uses a "zero-cloud" data model where user emails are only used for OAuth identification via Google/LinkedIn. We do not store email addresses in a central database; they reside within the user's browser local memory or environment variables for explicit session management.

## Support Status
For technical issues related to the analysis engine or video extraction, the production helper at `https://occium-yt-dlp-host.onrender.com` should be monitored for status:
1. Navigate to `/settings` in the application Dashboard.
2. Click the **Refresh Status** or **Test** button.
3. If it shows **"Helper reachable"**, the pipeline is healthy.
4. If it shows **"Offline"**, contact support at the email listed above.
