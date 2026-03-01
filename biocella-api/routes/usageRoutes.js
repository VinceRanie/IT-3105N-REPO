const express = require("express");
const router = express.Router();
const usageController = require("../controllers/usageController");

router.post("/", usageController.create);
router.get("/", usageController.getAll);
router.get("/:id", usageController.getById);
router.put("/:id", usageController.update);
router.delete("/:id", usageController.remove);

module.exports = router;
