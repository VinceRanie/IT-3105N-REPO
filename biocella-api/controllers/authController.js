const authModel = require("../models/authModel");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { sendEmail } = require('../config/email');

const HttpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

const JWT_SECRET = process.env.JWT_TOKEN || "your-secret-key-change-in-production";
const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_BASE_URL || "http://localhost:3000";

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Email and password are required.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    // Get user from database
    const user = await authModel.getUserByEmail(email);

    if (!user) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: "Invalid credentials",
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    // Check if account is locked
    if (user.lockout_until && new Date() < new Date(user.lockout_until)) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: "Account is locked. Please try again later.",
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    // Compare password
    const passwordMatch = await authModel.comparePassword(password, user.password);

    if (passwordMatch) {
      // Reset failed login attempts
      await authModel.resetFailedLoginAttempts(user.user_id);

      // Create JWT token
      const token = jwt.sign(
        {
          userId: user.user_id,
          email: user.email,
          role: user.role,
        },
        JWT_SECRET,
        { expiresIn: "1h" }
      );

      return res.status(HttpStatus.OK).json({
        message: "Login was successful!",
        token,
        role: user.role,
        userId: user.user_id,
        email: user.email,
        statusCode: HttpStatus.OK,
      });
    } else {
      // Handle failed login attempt
      const newAttempts = user.failed_login_attempts + 1;
      let message = "Invalid email or password.";
      let lockoutTime = null;

      if (newAttempts >= 5) {
        lockoutTime = new Date(new Date().getTime() + 15 * 60000); // 15 minutes
        message = "Maximum login attempts exceeded. Account locked for 15 minutes.";
      }

      await authModel.incrementFailedLoginAttempts(user.user_id, newAttempts, lockoutTime);

      return res.status(HttpStatus.UNAUTHORIZED).json({
        message,
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "An unexpected error occurred during login.",
      error: error.message || error,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};

// REGISTER
exports.register = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email || typeof email !== "string") {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Valid email is required.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    // Validate email domain
    if (!authModel.validateEmailDomain(email)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Invalid email format or not USC email. Please use a valid USC email address.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    // Check if user already exists
    const existingUser = await authModel.userExists(email);
    if (existingUser) {
      return res.status(HttpStatus.CONFLICT).json({
        message: "User already exists.",
        statusCode: HttpStatus.CONFLICT,
      });
    }

    // Create reset token and insert user
    const resetToken = uuidv4();
    const userId = await authModel.createUser(email, resetToken);

    // Send email with verification link
    try {
      await sendEmail({
        to: email,
        subject: "Set Your Password to Complete Registration",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #113F67;">Welcome to BIOCELLA!</h2>
            <p>Hi,</p>
            <p>Thank you for registering for our application!</p>
            <p>Please click the link below to set your secure password and complete your registration:</p>
            <p>
              <a href="${APP_BASE_URL}/signup/finalize?token=${resetToken}" 
                 style="display: inline-block; padding: 10px 20px; background-color: #113F67; color: white; text-decoration: none; border-radius: 5px;">
                Set Your Password Now
              </a>
            </p>
            <p style="color: #666; font-size: 12px;">
              Or copy and paste this link in your browser:<br>
              ${APP_BASE_URL}/signup/finalize?token=${resetToken}
            </p>
            <p>This link will expire in 24 hours.</p>
            <p>If you did not register for this service, please ignore this email.</p>
            <p>Sincerely,<br>BIOCELLA Team</p>
          </div>
        `,
      });

      console.log(`Registration email sent to ${email}`);
    } catch (emailError) {
      console.error("Email sending error:", emailError);
      // Don't fail the registration if email fails, but log the error
      // In production, you might want to retry or queue the email
    }

    return res.status(HttpStatus.CREATED).json({
      message: "User registered successfully. A password setup link has been sent to your email.",
      userId,
      email,
      statusCode: HttpStatus.CREATED,
    });
  } catch (error) {
    console.error("Registration Error:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "An unexpected error occurred during registration.",
      error: error.message || error,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};

// RESET PASSWORD
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Validate required fields
    if (!token || !newPassword) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Token and new password are required.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    // Validate password strength
    if (!authModel.validatePasswordStrength(newPassword)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message:
          "Password must be at least 6 characters long and contain at least one uppercase, one lowercase, and a number.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    // Get user by reset token
    const user = await authModel.getUserByResetToken(token);

    if (!user) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: "Invalid or expired token.",
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    // Hash new password and update user
    const hashedPassword = await authModel.hashPassword(newPassword);
    await authModel.setPassword(user.user_id, hashedPassword);

    return res.status(HttpStatus.OK).json({
      message: "Password has been successfully reset.",
      statusCode: HttpStatus.OK,
    });
  } catch (error) {
    console.error("Password Reset Error:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "An unexpected error occurred during password reset.",
      error: error.message || error,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};

// FINALIZE SETUP
exports.finalizeSetup = async (req, res) => {
  try {
    const { email, first_name, last_name, department, course, password, retypePassword } = req.body;

    // Validate required fields
    if (!email || !first_name || !last_name || !department || !course || !password || !retypePassword) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "All fields are required.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    // Validate passwords match
    if (password !== retypePassword) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Passwords do not match.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    // Validate password strength
    if (!authModel.validatePasswordStrength(password)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message:
          "Password must be at least 6 characters long and contain at least one uppercase, one lowercase, and a number.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    // Hash password
    const hashedPassword = await authModel.hashPassword(password);

    // Update user with profile information
    await authModel.finalizeUserSetup(email, first_name, last_name, department, course, hashedPassword);

    return res.status(HttpStatus.OK).json({
      message: "Signup finalized successfully.",
      statusCode: HttpStatus.OK,
    });
  } catch (error) {
    console.error("Finalize Setup Error:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "An unexpected error occurred during setup finalization.",
      error: error.message || error,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};

// GET USER PROFILE
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user?.userId; // Assuming middleware extracts this from JWT

    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: "User not authenticated.",
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    // TODO: Implement get user profile logic
    return res.status(HttpStatus.OK).json({
      message: "User profile retrieved.",
      statusCode: HttpStatus.OK,
    });
  } catch (error) {
    console.error("Get User Profile Error:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "An unexpected error occurred.",
      error: error.message || error,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};

// GET USER BY TOKEN (for finalize setup form)
exports.getUserByToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Token is required.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const user = await authModel.getUserByResetToken(token);

    if (!user) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: "Invalid or expired token.",
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    return res.status(HttpStatus.OK).json({
      message: "User data retrieved successfully.",
      user: {
        user_id: user.user_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        department: user.department,
        course: user.course,
        role: user.role,
      },
      statusCode: HttpStatus.OK,
    });
  } catch (error) {
    console.error("Get User By Token Error:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "An unexpected error occurred.",
      error: error.message || error,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};

// LOGOUT
exports.logout = async (req, res) => {
  try {
    // JWT tokens are stateless, so logout is just a client-side operation
    // This endpoint can be used for logging purposes or blacklisting tokens if needed
    return res.status(HttpStatus.OK).json({
      message: "Logout successful.",
      statusCode: HttpStatus.OK,
    });
  } catch (error) {
    console.error("Logout Error:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "An unexpected error occurred during logout.",
      error: error.message || error,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};

// VERIFY TOKEN
exports.verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Token is required.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    return res.status(HttpStatus.OK).json({
      message: "Token is valid.",
      user: decoded,
      statusCode: HttpStatus.OK,
    });
  } catch (error) {
    console.error("Token Verification Error:", error);
    if (error.name === "TokenExpiredError") {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: "Token has expired.",
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    return res.status(HttpStatus.UNAUTHORIZED).json({
      message: "Invalid token.",
      statusCode: HttpStatus.UNAUTHORIZED,
    });
  }
};
