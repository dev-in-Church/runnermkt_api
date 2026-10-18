const { query } = require("../config/database");
const { v4: uuidv4 } = require("uuid");

// Get all reviews for a product with aggregated rating
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    // Get reviews for product
    const reviewsRes = await query(
      `SELECT pr.*, u.first_name, u.last_name 
       FROM product_reviews pr
       JOIN users u ON pr.user_id = u.id
       WHERE pr.product_id = $1
       ORDER BY pr.created_at DESC
       LIMIT $2 OFFSET $3`,
      [productId, parseInt(limit), parseInt(offset)],
    );

    // Get total count
    const countRes = await query(
      "SELECT COUNT(*) as total, AVG(rating) as avg_rating FROM product_reviews WHERE product_id = $1",
      [productId],
    );

    const { total, avg_rating } = countRes.rows[0];

    res.json({
      reviews: reviewsRes.rows.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        verified_purchase: r.is_verified_purchase,
        user_name: `${r.first_name} ${r.last_name}`,
        created_at: r.created_at,
      })),
      total: parseInt(total),
      avg_rating: avg_rating ? parseFloat(avg_rating).toFixed(1) : 0,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (err) {
    console.error("Get product reviews error:", err);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
};

// Create a new review
const createReview = async (req, res) => {
  try {
    const { productId, rating, title, comment } = req.body;
    const userId = req.user.id;

    if (!productId || !rating) {
      return res
        .status(400)
        .json({ error: "Product ID and rating are required" });
    }

    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return res
        .status(400)
        .json({ error: "Rating must be an integer between 1 and 5" });
    }

    // Check if user already reviewed this product
    const existingRes = await query(
      "SELECT id FROM product_reviews WHERE product_id = $1 AND user_id = $2",
      [productId, userId],
    );

    if (existingRes.rows.length > 0) {
      return res
        .status(409)
        .json({ error: "You have already reviewed this product" });
    }

    // Check if user purchased this product (verified purchase)
    const purchaseRes = await query(
      `SELECT 1 FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE oi.product_id = $1 AND o.user_id = $2 AND o.status = 'confirmed'`,
      [productId, userId],
    );

    const is_verified_purchase = purchaseRes.rows.length > 0;

    // Create review
    const id = uuidv4();
    const result = await query(
      `INSERT INTO product_reviews (id, product_id, user_id, rating, title, comment, is_verified_purchase, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, rating, title, comment, is_verified_purchase, created_at`,
      [
        id,
        productId,
        userId,
        rating,
        title || null,
        comment || null,
        is_verified_purchase,
      ],
    );

    const review = result.rows[0];

    res.status(201).json({
      id: review.id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      verified_purchase: review.is_verified_purchase,
      created_at: review.created_at,
    });
  } catch (err) {
    console.error("Create review error:", err);
    res.status(500).json({ error: "Failed to create review" });
  }
};

// Update a review
const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, title, comment } = req.body;
    const userId = req.user.id;

    if (!rating) {
      return res.status(400).json({ error: "Rating is required" });
    }

    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return res
        .status(400)
        .json({ error: "Rating must be an integer between 1 and 5" });
    }

    // Check if review exists and belongs to user
    const reviewRes = await query(
      "SELECT id FROM product_reviews WHERE id = $1 AND user_id = $2",
      [reviewId, userId],
    );

    if (reviewRes.rows.length === 0) {
      return res.status(404).json({
        error: "Review not found or you do not have permission to edit it",
      });
    }

    // Update review
    const result = await query(
      `UPDATE product_reviews 
       SET rating = $1, title = $2, comment = $3, created_at = NOW()
       WHERE id = $4
       RETURNING id, rating, title, comment, created_at`,
      [rating, title || null, comment || null, reviewId],
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update review error:", err);
    res.status(500).json({ error: "Failed to update review" });
  }
};

// Delete a review
const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    // Check if review exists and belongs to user
    const reviewRes = await query(
      "SELECT id FROM product_reviews WHERE id = $1 AND user_id = $2",
      [reviewId, userId],
    );

    if (reviewRes.rows.length === 0) {
      return res.status(404).json({
        error: "Review not found or you do not have permission to delete it",
      });
    }

    // Delete review
    await query("DELETE FROM product_reviews WHERE id = $1", [reviewId]);

    res.json({ message: "Review deleted successfully" });
  } catch (err) {
    console.error("Delete review error:", err);
    res.status(500).json({ error: "Failed to delete review" });
  }
};

// Get user's own reviews
const getUserReviews = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10, offset = 0 } = req.query;

    const result = await query(
      `SELECT pr.*, p.name as product_name, p.image_url
       FROM product_reviews pr
       JOIN products p ON pr.product_id = p.id
       WHERE pr.user_id = $1
       ORDER BY pr.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit), parseInt(offset)],
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Get user reviews error:", err);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
};

module.exports = {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  getUserReviews,
};
