const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Authentication endpoints
router.post("/login", authController.login);
router.post("/register", authController.register);
router.post("/reset-password", authController.resetPassword);
router.post("/finalize-setup", authController.finalizeSetup);
router.post("/get-user-by-token", authController.getUserByToken);
router.post("/logout", authController.logout);
router.get("/verify-token", authController.verifyToken);
router.get("/profile", authController.getUserProfile);

module.exports = router;
