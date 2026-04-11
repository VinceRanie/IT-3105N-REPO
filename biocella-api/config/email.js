const nodemailer = require('nodemailer');

// 🔎 Debugging: log env variables at startup
console.log('🔎 Gmail OAuth2 config check:');
console.log('Client ID:', process.env.GMAIL_CLIENT_ID || '❌ Missing');
console.log('Client Secret:', process.env.GMAIL_CLIENT_SECRET ? '✅ Loaded' : '❌ Missing');
console.log('Refresh Token:', process.env.GMAIL_REFRESH_TOKEN ? '✅ Loaded' : '❌ Missing');
console.log('User Email:', process.env.GMAIL_USER || '❌ Missing');

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

const hasGmailConfig = hasGmailOAuthConfig || hasAppPasswordConfig;

if (!hasGmailOAuthConfig && !hasAppPasswordConfig) {
  console.warn('⚠️  Warning: No email credentials configured. Email notifications will be skipped.');
}

let oauth2Client = null;
let google = null;
let googleInitError = null;
let cachedTransporter = null;

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
    if (oauth2Client) return;

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
    console.error('❌ Error initializing Google OAuth2:', error);
    oauth2Client = null;
    throw error;
  }
};

const createTransporter = async () => {
  if (cachedTransporter) return cachedTransporter;

  try {
    if (!oauth2Client && hasGmailOAuthConfig) {
      initializeGoogleAuth();
    }

    if (!oauth2Client) {
      throw new Error(
        'Gmail OAuth2 not configured. Please set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, and GMAIL_USER environment variables.'
      );
    }

    let accessToken;
    try {
      accessToken = await oauth2Client.getAccessToken();
    } catch (error) {
      console.error("❌ Refresh token failed:", error);
      console.error("Details:", error.response?.data || error.code || error.toString());
      throw error; // rethrow so the caller knows it failed
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        accessToken: accessToken?.token
      },
      tls: { rejectUnauthorized: true },
      connectionTimeout: 10000
    });

    cachedTransporter = transporter;
    return transporter;
  } catch (error) {
    console.error('❌ Error creating email transporter:', error);
    throw error;
  }
};


const createAppPasswordTransporter = async () => {
  if (!hasAppPasswordConfig) {
    throw new Error('App password transport not configured. Please set EMAIL_USER and EMAIL_PASS.');
  }

  const appPassword = String(process.env.EMAIL_PASS || '').replace(/\s+/g, '');
  if (!appPassword) {
    throw new Error('App password transport not configured. Please set a valid EMAIL_PASS value.');
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: String(process.env.EMAIL_USER || '').trim(),
      pass: appPassword
    },
    tls: { rejectUnauthorized: true },
    connectionTimeout: 10000
  });
};

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
        if (!hasAppPasswordConfig) throw oauthError;
      }
    }

    if (!transporter && hasAppPasswordConfig) {
      transporter = await createAppPasswordTransporter();
      senderEmail = process.env.EMAIL_USER;
    }

    if (!transporter) throw new Error('No email transport available.');

    const info = await transporter.sendMail({
      from: `"BIOCELLA" <${senderEmail}>`,
      ...mailOptions
    });
    console.log('📧 Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { error: error.message, messageId: null };
  }
};

// 🔹 New helper to test refresh token
const testRefreshToken = async () => {
  try {
    if (!oauth2Client && hasGmailOAuthConfig) {
      initializeGoogleAuth();
    }
    if (!oauth2Client) {
      console.error('❌ No OAuth2 client available. Check Gmail OAuth2 config.');
      return;
    }

    const accessToken = await oauth2Client.getAccessToken();
    console.log('✅ Refresh token worked. Access token:', accessToken.token);
  } catch (err) {
    console.error('❌ Refresh token failed:', err.message || err);
  }
};

module.exports = {
  sendEmail,
  createTransporter,
  hasGmailConfig,
  testRefreshToken // export helper
};
