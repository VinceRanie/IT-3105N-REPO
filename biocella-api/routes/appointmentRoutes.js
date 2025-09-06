const express = require("express");
const router = express.Router();
const appointmentController = require("../controllers/appointmentController");

router.post("/", appointmentController.create);
router.get("/", appointmentController.getAll);
router.get("/:id", appointmentController.getById);
router.put("/:id", appointmentController.update);
router.delete("/:id", appointmentController.remove);

module.exports = router;
