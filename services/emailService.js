const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

// Order notification emails - set via RESEND_ORDERS_EMAIL env var (e.g., orders@runnermkt.com)
const ORDERS_EMAIL = process.env.RESEND_ORDERS_EMAIL || "onboarding@resend.dev";

// Verification & account emails - set via RESEND_NOREPLY_EMAIL env var (e.g., noreply@runnermkt.com)
const NOREPLY_EMAIL =
  process.env.RESEND_NOREPLY_EMAIL || "onboarding@resend.dev";

// Send vendor notification email
const sendVendorOrderNotification = async (vendor) => {
  try {
    console.log("[v0] Sending vendor notification to:", vendor.email);

    const itemsHTML = vendor.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;">${item.productName}</td>
        <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${item.quantity}</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">KES ${item.totalPrice.toLocaleString()}</td>
      </tr>
    `,
      )
      .join("");

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Order Received</h2>
        <p>Hi ${vendor.vendorName},</p>
        <p>A customer has placed an order containing your products:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Product</th>
              <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Qty</th>
              <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #28a745;">
          <p><strong>Order Details:</strong></p>
          <p>Order Number: <strong>#${vendor.orderNumber}</strong></p>
          <p>Customer: <strong>${vendor.customerName}</strong></p>
          <p>Shipping Address: <strong>${vendor.shippingAddress}</strong></p>
          <p>Phone: <strong>${vendor.shippingPhone}</strong></p>
        </div>

        <p style="margin-top: 20px; color: #666;">Please prepare the items for shipment and update the order status.</p>
        <p>Thank you for using RunnerMKT!</p>
      </div>
    `;

    const result = await resend.emails.send({
      from: ORDERS_EMAIL,
      to: vendor.email,
      subject: `New Order #${vendor.orderNumber} - Products Ordered`,
      html: html,
    });

    console.log("[v0] Vendor notification sent successfully:", result);
  } catch (err) {
    console.error("[v0] Failed to send vendor notification:", err.message);
  }
};

// Send admin notification email
const sendAdminOrderNotification = async (adminEmail, order) => {
  try {
    console.log("[v0] Sending admin notification to:", adminEmail);

    const itemsHTML = order.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;">${item.productName}</td>
        <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${item.quantity}</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${item.vendorName || "N/A"}</td>
      </tr>
    `,
      )
      .join("");

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Order Placed</h2>
        
        <div style="background-color: #e8f4f8; padding: 15px; border-left: 4px solid #0066cc; margin: 15px 0;">
          <p><strong>Order #${order.orderNumber}</strong></p>
          <p>Total Amount: <strong>KES ${order.total.toLocaleString()}</strong></p>
          <p>Payment Status: <strong>${order.paymentStatus}</strong></p>
        </div>

        <h3 style="color: #333; margin-top: 20px;">Order Items (${order.items.length} items):</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Product</th>
              <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Qty</th>
              <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Vendor</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <div style="background-color: #f9f9f9; padding: 15px; margin-top: 20px; border: 1px solid #ddd;">
          <p><strong>Customer Information:</strong></p>
          <p>Name: ${order.customerName}</p>
          <p>Email: ${order.customerEmail}</p>
          <p>Phone: ${order.shippingPhone}</p>
          <p>Address: ${order.shippingAddress}</p>
        </div>

        <p style="margin-top: 20px; color: #666;">Please review this order and take necessary action.</p>
      </div>
    `;

    const result = await resend.emails.send({
      from: ORDERS_EMAIL,
      to: adminEmail,
      subject: `New Order #${order.orderNumber} - Admin Alert`,
      html: html,
    });

    console.log("[v0] Admin notification sent successfully:", result);
  } catch (err) {
    console.error("[v0] Failed to send admin notification:", err.message);
  }
};

// Send customer order confirmation email
const sendCustomerOrderConfirmation = async (customer) => {
  try {
    console.log("[v0] Sending customer confirmation to:", customer.email);

    const itemsHTML = customer.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;">${item.productName}</td>
        <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${item.quantity}</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">KES ${item.totalPrice.toLocaleString()}</td>
      </tr>
    `,
      )
      .join("");

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; padding: 20px; background-color: #28a745; color: white;">
          <h1 style="margin: 0;">Order Confirmed!</h1>
        </div>

        <div style="padding: 20px;">
          <p>Hi ${customer.customerName},</p>
          <p>Thank you for your order! We've received your purchase and are processing it right away.</p>

          <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0;">
            <p><strong>Order Number:</strong> #${customer.orderNumber}</p>
            <p><strong>Order Date:</strong> ${new Date().toLocaleDateString("en-KE")}</p>
            <p><strong>Total Amount:</strong> KES ${customer.total.toLocaleString()}</p>
            <p><strong>Payment Method:</strong> ${customer.paymentMethod}</p>
          </div>

          <h3 style="color: #333;">Order Items:</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Product</th>
                <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Qty</th>
                <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>

          <div style="background-color: #f0f0f0; padding: 15px; margin-top: 20px; text-align: right; font-size: 18px;">
            <p><strong>Total: KES ${customer.total.toLocaleString()}</strong></p>
          </div>

          <div style="background-color: #e8f4f8; padding: 15px; margin-top: 20px; border-left: 4px solid #0066cc;">
            <h4 style="margin-top: 0;">Delivery Information</h4>
            <p>Delivery Address: ${customer.shippingAddress}</p>
            <p>Contact Number: ${customer.shippingPhone}</p>
            <p>Estimated Delivery: Within 3-5 business days</p>
          </div>

          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            You will receive updates about your order via email. If you have any questions, please contact us.
          </p>
          <p style="color: #28a745; font-weight: bold;">Thank you for shopping with RunnerMKT!</p>
        </div>
      </div>
    `;

    const result = await resend.emails.send({
      from: ORDERS_EMAIL,
      to: customer.email,
      subject: `Order Confirmation #${customer.orderNumber} - RunnerMKT`,
      html: html,
    });

    console.log("[v0] Customer confirmation sent successfully:", result);
  } catch (err) {
    console.error("[v0] Failed to send customer confirmation:", err.message);
  }
};

// Send email verification link
const sendVerificationEmail = async ({ email, userName, verificationLink }) => {
  try {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background-color: #1a1a1a; color: white; padding: 32px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 600;">Verify Your Email</h1>
            <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">RunnerMKT - Complete Your Registration</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 32px 20px; color: #333333; line-height: 1.6;">
            <p style="margin: 0 0 16px 0; font-size: 16px;">Hi ${userName || "User"},</p>
            
            <p style="margin: 0 0 24px 0; font-size: 15px; color: #555555;">
                Thank you for creating an account with RunnerMKT. To complete your registration and activate your account, please verify your email address.
            </p>
            
            <!-- CTA Button -->
            <div style="margin: 32px 0; text-align: center;">
                <a href="${verificationLink}" style="background-color: #1a1a1a; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 15px;">
                    Verify Email Address
                </a>
            </div>
            
            <!-- Alternative link text -->
            <p style="margin: 24px 0 0 0; font-size: 13px; color: #999999; word-break: break-all;">
                Or copy this link into your browser: ${verificationLink}
            </p>
            
            <!-- Security note -->
            <p style="margin: 24px 0 0 0; padding-top: 24px; border-top: 1px solid #e5e5e5; font-size: 13px; color: #999999;">
                This verification link expires in 24 hours for security purposes. If you didn&apos;t create this account, please disregard this email.
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9f9f9; padding: 24px 20px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e5e5;">
            <p style="margin: 0; font-size: 12px; color: #999999;">
                © 2026 RunnerMKT. All rights reserved.
            </p>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #999999;">
                This is an automated message. Please do not reply to this email.
            </p>
        </div>
    </div>
</body>
</html>`;

    console.log(
      "[v0] Sending verification email FROM:",
      NOREPLY_EMAIL,
      "TO:",
      email,
    );

    const response = await resend.emails.send({
      from: NOREPLY_EMAIL,
      to: email,
      subject: "Verify Your RunnerMKT Account",
      html,
    });

    console.log("[v0] Verification email response:", response);
    console.log("[v0] Verification email sent to:", email);
  } catch (err) {
    console.error("[v0] Verification email send error:", err);
    throw err;
  }
};

module.exports = {
  sendVendorOrderNotification,
  sendAdminOrderNotification,
  sendCustomerOrderConfirmation,
  sendVerificationEmail,
};
