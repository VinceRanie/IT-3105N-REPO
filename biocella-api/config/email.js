const nodemailer = require('nodemailer');

// OAuth2 credentials for Gmail send
const hasGmailOAuthConfig = !!(
  process.env.GMAIL_CLIENT_ID &&
  process.env.GMAIL_CLIENT_SECRET &&
  process.env.GMAIL_REFRESH_TOKEN &&
  process.env.GMAIL_USER
);

// App password fallback credentials
const hasAppPasswordConfig = !!(
  process.env.EMAIL_USER && process.env.EMAIL_PASS
);

// Backward-compatible exported flag: true when either transport mode is available
const hasGmailConfig = hasGmailOAuthConfig || hasAppPasswordConfig;

if (!hasGmailOAuthConfig && !hasAppPasswordConfig) {
  console.warn('⚠️  Warning: No email credentials configured. Email notifications will be skipped.');
}

// OAuth2 Configuration for Gmail (lazy loaded only when needed)
let oauth2Client = null;
let google = null;
let googleInitError = null;

// Try to load google module - but don't crash if it fails
try {
  google = require('googleapis').google;
  console.log('✅ googleapis module loaded successfully');
} catch (error) {
  console.warn('⚠️  Warning: googleapis module not available. Gmail notifications will be disabled.');
  console.warn('   Install with: npm install googleapis');
  googleInitError = error;
}

const initializeGoogleAuth = () => {
  try {
    if (oauth2Client) {
      return; // Already initialized
    }
    
    if (!google) {
      if (googleInitError) {
        throw new Error('googleapis module failed to load: ' + googleInitError.message);
      }
      throw new Error('googleapis module not available');
    }
    
    if (!hasGmailOAuthConfig) {
      console.warn('Cannot initialize Google Auth: Gmail credentials are missing');
      return;
    }

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
    throw error;
  }
};

// Create Gmail transporter with OAuth2
const createTransporter = async () => {
  try {
    // Initialize if needed
    if (!oauth2Client && hasGmailOAuthConfig) {
      initializeGoogleAuth();
    }

    if (!oauth2Client) {
      throw new Error('Gmail OAuth2 not configured. Please set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, and GMAIL_USER environment variables.');
    }

    const { credentials } = await oauth2Client.refreshAccessToken().catch((err) => {
      throw new Error('Failed to refresh access token: ' + err.message);
    });
    
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

// Create Gmail transporter with app password (fallback mode)
const createAppPasswordTransporter = async () => {
  if (!hasAppPasswordConfig) {
    throw new Error('App password transport not configured. Please set EMAIL_USER and EMAIL_PASS.');
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Helper function to send emails - NEVER crash the main process
const sendEmail = async (mailOptions) => {
  try {
    if (!hasGmailConfig) {
      console.warn('⚠️  Email sending skipped: no mail transport is configured');
      console.log(`📧 Email would have been sent to: ${mailOptions.to}`);
      console.log(`📧 Subject: ${mailOptions.subject}`);
      return { messageId: 'SKIPPED_NO_CONFIG' };
    }

    let transporter;
    let senderEmail;

    if (hasGmailOAuthConfig) {
      try {
        transporter = await createTransporter();
        senderEmail = process.env.GMAIL_USER;
      } catch (oauthError) {
        console.warn('⚠️  OAuth transport failed, trying app password fallback:', oauthError.message);
        if (!hasAppPasswordConfig) {
          throw oauthError;
        }
      }
    }

    if (!transporter) {
      transporter = await createAppPasswordTransporter();
      senderEmail = process.env.EMAIL_USER;
    }

    const info = await transporter.sendMail({
      from: `"BIOCELLA" <${senderEmail}>`,
      ...mailOptions
    });
    console.log('📧 Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    // IMPORTANT: Don't throw - let the calling function know but don't crash
    return { error: error.message, messageId: null };
  }
};

module.exports = {
  sendEmail,
  createTransporter,
  hasGmailConfig
};
