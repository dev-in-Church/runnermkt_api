const { query } = require("../config/database");

const SHIPPING_AUTHORIZATION_THRESHOLD_USD = 10000;

const createRequest = async (req, res) => {
  const client = await require("../config/database").pool.connect();
  try {
    const {
      items,
      contactName,
      contactCountry,
      contactPhone,
      contactEmail,
      deliveryAddress,
      cooperationDetails,
      customerNotes,
      shippingNotes,
    } = req.body;
    if (
      ![
        contactName,
        contactCountry,
        contactPhone,
        contactEmail,
        deliveryAddress,
        cooperationDetails,
      ].every((value) => typeof value === "string" && value.trim())
    ) {
      return res
        .status(400)
        .json({
          error:
            "Name, country, phone, email, address, and cooperation details are required.",
        });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ error: "Add at least one international product." });
    }

    await client.query("BEGIN");
    const productIds = items.map((item) => item.productId);
    const products = await client.query(
      `SELECT p.id, p.name, p.price, p.currency, p.is_active, vp.vendor_type
       FROM products p JOIN vendor_profiles vp ON vp.id = p.vendor_id
       WHERE p.id = ANY($1::uuid[]) AND p.is_active = true`,
      [productIds],
    );
    const byId = new Map(products.rows.map((product) => [product.id, product]));
    const normalized = items.map((item) => {
      const product = byId.get(item.productId);
      const quantity = Number(item.quantity);
      if (!product || product.vendor_type !== "international") {
        throw new Error(
          "International requests may only contain active international products.",
        );
      }
      if (!Number.isInteger(quantity) || quantity < 1) {
        throw new Error("Each quantity must be a positive whole number.");
      }
      if (product.currency !== "USD") {
        throw new Error("International products must be priced in USD.");
      }
      return { product, quantity, total: Number(product.price) * quantity };
    });
    const subtotal = normalized.reduce((sum, item) => sum + item.total, 0);
    const requestResult = await client.query(
      `INSERT INTO international_order_requests (customer_id, subtotal, customer_notes, shipping_notes, contact_name, contact_country, contact_phone, contact_email, delivery_address, cooperation_details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        req.user.id,
        subtotal,
        customerNotes || null,
        shippingNotes || null,
        contactName.trim(),
        contactCountry.trim(),
        contactPhone.trim(),
        contactEmail.trim().toLowerCase(),
        deliveryAddress.trim(),
        cooperationDetails.trim(),
      ],
    );
    const request = requestResult.rows[0];
    for (const item of normalized) {
      await client.query(
        `INSERT INTO international_order_request_items (request_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [request.id, item.product.id, item.quantity, item.product.price],
      );
    }
    await client.query("COMMIT");

    const adminUsers = await query("SELECT id FROM users WHERE role = 'admin'");
    const vendorUsers = await query(
      `SELECT DISTINCT vp.user_id FROM international_order_request_items ri JOIN products p ON p.id = ri.product_id JOIN vendor_profiles vp ON vp.id = p.vendor_id WHERE ri.request_id = $1`,
      [request.id],
    );
    const notifications = adminUsers.rows.map((admin) => [
      admin.id,
      "international_request",
      "New international sourcing request",
      `A new USD ${Number(subtotal).toLocaleString()} request is ready for review.`,
      `/admin/dashboard`,
    ]);
    vendorUsers.rows.forEach((vendor) =>
      notifications.push([
        vendor.user_id,
        "international_request",
        "New international product request",
        "A customer requested one of your international products.",
        `/vendor/dashboard/orders`,
      ]),
    );
    for (const [userId, type, title, message, link] of notifications) {
      await query(
        "INSERT INTO notifications (user_id, type, title, message, link, is_read) VALUES ($1, $2, $3, $4, $5, false)",
        [userId, type, title, message, link],
      );
    }
    res
      .status(201)
      .json({
        request,
        shippingAuthorizationThreshold: SHIPPING_AUTHORIZATION_THRESHOLD_USD,
      });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create international request error:", error);
    res
      .status(400)
      .json({
        error: error.message || "Unable to create international request.",
      });
  } finally {
    client.release();
  }
};

const listMyRequests = async (req, res) => {
  try {
    const result = await query(
      `SELECT r.*, COUNT(i.id)::int AS item_count
       FROM international_order_requests r
       LEFT JOIN international_order_request_items i ON i.request_id = r.id
       WHERE r.customer_id = $1
       GROUP BY r.id ORDER BY r.created_at DESC`,
      [req.user.id],
    );
    res.json({ requests: result.rows });
  } catch (error) {
    console.error("List international requests error:", error);
    res.status(500).json({ error: "Unable to load international requests." });
  }
};

module.exports = {
  createRequest,
  listMyRequests,
  SHIPPING_AUTHORIZATION_THRESHOLD_USD,
};
