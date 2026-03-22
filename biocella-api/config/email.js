const nodemailer = require('nodemailer');

// Check if Gmail OAuth2 credentials are configured
const hasGmailConfig = !!(
  process.env.GMAIL_CLIENT_ID &&
  process.env.GMAIL_CLIENT_SECRET &&
  process.env.GMAIL_REFRESH_TOKEN &&
  process.env.GMAIL_USER
);

if (!hasGmailConfig) {
  console.warn('⚠️  Warning: Gmail OAuth2 credentials not fully configured. Email notifications will be skipped.');
}

// OAuth2 Configuration for Gmail (lazy loaded only when needed)
let oauth2Client = null;
let google = null;

const initializeGoogleAuth = () => {
  try {
    if (oauth2Client) return; // Already initialized
    
    if (!hasGmailConfig) {
      console.warn('Cannot initialize Google Auth: Gmail credentials are missing');
      return;
    }

    google = require('googleapis').google;
    oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });

    console.log('✅ Google OAuth2 initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Google OAuth2:', error.message);
    oauth2Client = null;
  }
};

// Create Gmail transporter with OAuth2
const createTransporter = async () => {
  try {
    // Initialize if needed
    if (!oauth2Client && hasGmailConfig) {
      initializeGoogleAuth();
    }

    if (!oauth2Client) {
      throw new Error('Gmail OAuth2 not configured. Please set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, and GMAIL_USER environment variables.');
    }

    const { credentials } = await oauth2Client.refreshAccessToken();
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        accessToken: credentials.access_token
      }
    });

    return transporter;
  } catch (error) {
    console.error('❌ Error creating email transporter:', error.message);
    throw error;
  }
};

// Helper function to send emails
const sendEmail = async (mailOptions) => {
  try {
    if (!hasGmailConfig) {
      console.warn('⚠️  Email sending skipped: Gmail credentials not configured');
      console.log(`📧 Email would have been sent to: ${mailOptions.to}`);
      console.log(`📧 Subject: ${mailOptions.subject}`);
      return { messageId: 'SKIPPED_NO_CONFIG' };
    }

    const transporter = await createTransporter();
    const info = await transporter.sendMail({
      from: process.env.GMAIL_USER,
      ...mailOptions
    });
    console.log('📧 Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    throw error;
  }
};

module.exports = {
  sendEmail,
  createTransporter,
  hasGmailConfig
};
