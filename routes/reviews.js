const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");
const { authenticateToken } = require("../middleware/auth");

// Get product reviews (public)
router.get("/product/:productId", reviewController.getProductReviews);

// Get user's own reviews (auth required)
router.get("/user", authenticateToken, reviewController.getUserReviews);

// Create review (auth required)
router.post("/", authenticateToken, reviewController.createReview);

// Update review (auth required)
router.put("/:reviewId", authenticateToken, reviewController.updateReview);

// Delete review (auth required)
router.delete("/:reviewId", authenticateToken, reviewController.deleteReview);

module.exports = router;
