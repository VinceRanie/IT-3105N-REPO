const express = require("express");
const router = express.Router();
const appointmentController = require("../controllers/appointmentController");

router.post("/", appointmentController.create);
router.get("/", appointmentController.getAll);
router.get("/status/:status", appointmentController.getByStatus);
router.get("/verify", appointmentController.getByQRToken);
router.get("/:id", appointmentController.getById);
router.put("/:id", appointmentController.update);
router.post("/:id/approve", appointmentController.approve);
router.post("/:id/deny", appointmentController.deny);
router.post("/verify-qr", appointmentController.verifyQR);
router.delete("/:id", appointmentController.remove);

module.exports = router;
