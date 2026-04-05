const authModel = require("../models/authModel");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { sendEmail } = require('../config/email');

// DB enum roles: student, faculty, staff (staff corresponds to RA)
const ALLOWED_ROLES = ["student", "faculty", "staff"];

// Normalize incoming role (accept 'ra' alias as 'staff')
const normalizeRole = (role) => {
  if (!role) return null;
  const r = role.toLowerCase();
  if (r === "ra") return "staff";
  return r;
};

const HttpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  CONFLICT: 409,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL_SERVER_ERROR: 500,
};

const JWT_SECRET = process.env.JWT_TOKEN || "your-secret-key-change-in-production";
const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_BASE_URL || "http://localhost:3000";
const RESET_LINK_TTL_MS = 60 * 60 * 1000; // 1 hour
const RESET_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const getAuthenticatedUserFromRequest = (req) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return null;
  }

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (_error) {
    return null;
  }
};

const didEmailSend = (result, expectedRecipient = "") => {
  if (!result) return false;
  if (result.error) return false;
  if (!result.messageId) return false;
  if (result.messageId === "SKIPPED_NO_CONFIG") return false;
  const accepted = Array.isArray(result.accepted)
    ? result.accepted.map((value) => String(value).toLowerCase())
    : [];
  const rejected = Array.isArray(result.rejected) ? result.rejected : [];

  if (rejected.length > 0) return false;
  if (expectedRecipient) {
    return accepted.includes(String(expectedRecipient).toLowerCase());
  }
  return true;
};

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
      const remainingMs = new Date(user.lockout_until).getTime() - Date.now();
      const minutes = Math.max(1, Math.ceil(remainingMs / 60000));
      const remainingText = `${minutes} minute${minutes === 1 ? "" : "s"}`;

      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: `Account is locked. Time remaining: ${remainingText}`,
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

    // Check existing account state.
    // Accounts without a password are treated as not yet finalized.
    const existingUser = await authModel.getUserByEmail(email);
    if (existingUser) {
      if (existingUser.password) {
        return res.status(HttpStatus.CONFLICT).json({
          message: "User already registered.",
          statusCode: HttpStatus.CONFLICT,
        });
      }

      return res.status(HttpStatus.CONFLICT).json({
        message: "Finish finalize setup.",
        statusCode: HttpStatus.CONFLICT,
      });
    }

    // Prepare reset token; create user only after email delivery succeeds.
    const resetToken = uuidv4();
    const tokenExpiry = new Date(Date.now() + RESET_LINK_TTL_MS);

    // Send email with verification link
    let emailResult;
    try {
      emailResult = await sendEmail({
        to: email,
        subject: "Finalize Your BIOCELLA Account Setup",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #113F67;">Welcome to BIOCELLA!</h2>
            <p>Hi there,</p>
            <p>Thank you for registering with your USC email. To complete your account setup, click the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${APP_BASE_URL}/signup/finalize?token=${resetToken}" 
                 style="background-color: #113F67; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Finalize Setup
              </a>
            </div>
            <p>You will be asked to sign in with your Google account (<strong>${email}</strong>) to verify your identity. Your name and profile photo will be fetched automatically.</p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you did not register for this service, please ignore this email.</p>
            <p>Sincerely,<br/><strong>BIOCELLA Team</strong></p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Email sending error:", emailError);
    }

    if (!didEmailSend(emailResult, email)) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        message: "Registration could not be completed because finalize email was not sent. Please try again later.",
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      });
    }

    const userId = await authModel.createUser(email, resetToken, tokenExpiry);

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

// FORGOT PASSWORD
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Valid email is required.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const user = await authModel.getUserByEmail(email);

    // Return a generic response to avoid exposing whether an email exists.
    if (!user) {
      return res.status(HttpStatus.OK).json({
        message: "If an account exists, a reset link has been sent to your email.",
        statusCode: HttpStatus.OK,
      });
    }

    // Enforce cooldown after a successful password reset.
    // After reset, token is cleared but reset_token_expires stores next allowed request time.
    if (user.reset_token_expires) {
      const expiresAtMs = new Date(user.reset_token_expires).getTime();
      const remainingMs = expiresAtMs - Date.now();

      // During cooldown (7 days), do not send another reset email.
      // Also covers inconsistent token state if cooldown timestamp exists.
      const isCooldownWindow = remainingMs > RESET_LINK_TTL_MS;
      if (remainingMs > 0 && (!user.reset_token || isCooldownWindow)) {
        return res.status(429).json({
          message: "You can only change your password once every 7 days.",
          statusCode: 429,
        });
      }
    }

    const resetToken = uuidv4();
    const tokenExpiry = new Date(Date.now() + RESET_LINK_TTL_MS);
    await authModel.setResetToken(user.user_id, resetToken, tokenExpiry);

    let emailResult;
    try {
      emailResult = await sendEmail({
        to: email,
        subject: "Reset Your BIOCELLA Password",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #113F67;">BIOCELLA Password Reset</h2>
            <p>We received a request to reset your password.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${APP_BASE_URL}/forgot-password/reset?token=${resetToken}"
                 style="background-color: #113F67; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you did not request this, you can safely ignore this email.</p>
            <p>Sincerely,<br/><strong>BIOCELLA Team</strong></p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Forgot password email error:", emailError);
    }

    if (!didEmailSend(emailResult, email)) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        message: "If an account exists, we could not send the reset email right now. Please try again later.",
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      });
    }

    return res.status(HttpStatus.OK).json({
      message: "If an account exists, a reset link has been sent to your email.",
      statusCode: HttpStatus.OK,
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "An unexpected error occurred during forgot password.",
      error: error.message || error,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};

// ADMIN INVITE (bypass USC email restriction, custom role)
exports.adminInvite = async (req, res) => {
  try {
    const { email, role = "student" } = req.body;
    const normalizedRole = normalizeRole(role);

    if (!email || typeof email !== "string") {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Valid email is required.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    if (!normalizedRole || !ALLOWED_ROLES.includes(normalizedRole)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Invalid role. Use student, faculty, or ra.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const existingUser = await authModel.userExists(email);
    if (existingUser) {
      return res.status(HttpStatus.CONFLICT).json({
        message: "User already exists.",
        statusCode: HttpStatus.CONFLICT,
      });
    }

    const resetToken = uuidv4();
    const tokenExpiry = new Date(Date.now() + RESET_LINK_TTL_MS);

    let emailResult;
    try {
      emailResult = await sendEmail({
        to: email,
        subject: "Set your password to access BIOCELLA",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #113F67;">You're invited to BIOCELLA</h2>
            <p>Hi,</p>
            <p>An administrator created an account for you with the role: <strong>${normalizedRole.toUpperCase()}</strong>.</p>
            <p>Please click the link below to set your password and finish setup:</p>
            <p>
              <a href="${APP_BASE_URL}/signup/finalize?token=${resetToken}" 
                 style="display: inline-block; padding: 10px 20px; background-color: #113F67; color: white; text-decoration: none; border-radius: 5px;">
                Complete your account
              </a>
            </p>
            <p style="color: #666; font-size: 12px;">If you did not expect this invitation, please ignore this email.</p>
            <p>Sincerely,<br>BIOCELLA Team</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Admin invite email error:", emailError);
    }

    if (!didEmailSend(emailResult, email)) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        message: "Invitation could not be completed because setup email was not sent. Please try again later.",
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      });
    }

    const userId = await authModel.createUserByAdmin(email, resetToken, normalizedRole, tokenExpiry);

    return res.status(HttpStatus.CREATED).json({
      message: "User invited successfully. A password setup link has been sent to the email.",
      userId,
      email,
      role: normalizedRole,
      statusCode: HttpStatus.CREATED,
    });
  } catch (error) {
    console.error("Admin Invite Error:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "An unexpected error occurred during admin invite.",
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
          "Password must be at least 8 characters long and contain at least one uppercase, one lowercase, and a number.",
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

    // Only registered accounts can use forgot-password reset.
    if (!user.password) {
      return res.status(HttpStatus.CONFLICT).json({
        message: "Account is not registered.",
        statusCode: HttpStatus.CONFLICT,
      });
    }

    if (user.reset_token_expires && new Date() > new Date(user.reset_token_expires)) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: "This reset link has expired.",
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    const isSameAsOld = await authModel.comparePassword(newPassword, user.password);
    if (isSameAsOld) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "New password must be different from your current password.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    // Hash new password and update user
    const hashedPassword = await authModel.hashPassword(newPassword);
    const nextResetAllowedAt = new Date(Date.now() + RESET_COOLDOWN_MS);
    await authModel.setPassword(user.user_id, hashedPassword, nextResetAllowedAt);

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
    const { token, email, first_name, last_name, profile_photo, department, course, password, retypePassword } = req.body;

    // Validate required fields
    if (!token || !email || !first_name || !last_name || !department || !course || !password || !retypePassword) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "All fields are required.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const userByToken = await authModel.getUserByResetToken(token);
    if (!userByToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: "Invalid or expired token.",
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    if (userByToken.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Email does not match this setup token.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    if (userByToken.password) {
      return res.status(HttpStatus.CONFLICT).json({
        message: "Account setup is already complete. Please log in.",
        statusCode: HttpStatus.CONFLICT,
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
          "Password must be at least 8 characters long and contain at least one uppercase, one lowercase, and a number.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    // Hash password
    const hashedPassword = await authModel.hashPassword(password);

    // Update user with profile information
    await authModel.finalizeUserSetup(
      userByToken.user_id,
      first_name,
      last_name,
      profile_photo || null,
      department,
      course,
      hashedPassword
    );

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
    const authUser = getAuthenticatedUserFromRequest(req);
    const userId = authUser?.userId;

    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: "User not authenticated.",
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    const user = await authModel.getUserProfileById(userId);

    if (!user) {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: "User profile not found.",
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    return res.status(HttpStatus.OK).json({
      message: "User profile retrieved.",
      user,
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

// UPDATE USER PROFILE
exports.updateUserProfile = async (req, res) => {
  try {
    const authUser = getAuthenticatedUserFromRequest(req);
    const userId = authUser?.userId;

    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: "User not authenticated.",
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    const existingUser = await authModel.getUserProfileById(userId);
    if (!existingUser) {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: "User profile not found.",
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const {
      department,
      course,
      profile_photo,
      newPassword,
      confirmPassword,
    } = req.body || {};

    const nextDepartment = typeof department === "string" ? department.trim() : (existingUser.department || "");
    const nextCourse = typeof course === "string" ? course.trim() : (existingUser.course || "");
    const nextProfilePhoto = typeof profile_photo === "string"
      ? profile_photo.trim()
      : (existingUser.profile_photo || null);

    if (!nextDepartment || !nextCourse) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Department and course are required.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    let hashedPassword = null;
    const hasPasswordInput = Boolean(newPassword || confirmPassword);

    if (hasPasswordInput) {
      if (!newPassword || !confirmPassword) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: "Both newPassword and confirmPassword are required.",
          statusCode: HttpStatus.BAD_REQUEST,
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: "Passwords do not match.",
          statusCode: HttpStatus.BAD_REQUEST,
        });
      }

      if (!authModel.validatePasswordStrength(newPassword)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: "Password must be at least 8 characters long and contain at least one uppercase, one lowercase, and a number.",
          statusCode: HttpStatus.BAD_REQUEST,
        });
      }

      hashedPassword = await authModel.hashPassword(newPassword);
    }

    await authModel.updateUserProfile({
      userId,
      department: nextDepartment,
      course: nextCourse,
      profilePhoto: nextProfilePhoto || null,
      hashedPassword,
    });

    const updatedUser = await authModel.getUserProfileById(userId);

    return res.status(HttpStatus.OK).json({
      message: "Profile updated successfully.",
      user: updatedUser,
      statusCode: HttpStatus.OK,
    });
  } catch (error) {
    console.error("Update User Profile Error:", error);
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
        is_setup_complete: user.is_setup_complete || 0,
        profile_photo: user.profile_photo || null,
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

// GET ALL NON-ADMIN USERS
exports.getUsers = async (_req, res) => {
  try {
    const users = await authModel.getAllNonAdminUsers();
    return res.status(HttpStatus.OK).json({ users, statusCode: HttpStatus.OK });
  } catch (error) {
    console.error("Get Users Error:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Failed to fetch users.",
      error: error.message || error,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};

// UPDATE USER ROLE
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const { id } = req.params;

    const normalizedRole = normalizeRole(role);

    if (!normalizedRole) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Role is required.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    if (!ALLOWED_ROLES.includes(normalizedRole)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Invalid role. Use student, faculty, or ra.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const affected = await authModel.updateUserRole(id, normalizedRole);

    if (!affected) {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: "User not found or cannot update admin role.",
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    return res.status(HttpStatus.OK).json({
      message: "User role updated successfully.",
      statusCode: HttpStatus.OK,
    });
  } catch (error) {
    console.error("Update User Role Error:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Failed to update user role.",
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

// VERIFY GOOGLE ID TOKEN AND RETURN PROFILE (for finalize signup prefill)
exports.verifyGoogleProfile = async (req, res) => {
  try {
    const { token, email } = req.body;

    if (!token) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Google ID token is required.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const profile = await new Promise((resolve, reject) => {
      const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`;
      const https = require('https');
      https
        .get(url, (resp) => {
          let data = '';
          resp.on('data', (chunk) => (data += chunk));
          resp.on('end', () => {
            if (resp.statusCode !== 200) {
              return reject(new Error('Invalid Google token'));
            }
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        })
        .on('error', reject);
    });

    // Optional: enforce email match if provided
    if (email && profile.email && profile.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Google email does not match the signup email.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    return res.status(HttpStatus.OK).json({
      message: "Google profile verified",
      profile: {
        email: profile.email,
        email_verified: profile.email_verified,
        name: profile.name,
        first_name: profile.given_name,
        last_name: profile.family_name,
        picture: profile.picture,
      },
      statusCode: HttpStatus.OK,
    });
  } catch (error) {
    console.error("Verify Google Profile Error:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Failed to verify Google token.",
      error: error.message || error,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};
