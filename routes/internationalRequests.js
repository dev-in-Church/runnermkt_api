const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const controller = require("../controllers/internationalRequestController");

router.use(authenticate);
router.get("/", controller.listMyRequests);
router.post("/", controller.createRequest);

module.exports = router;
