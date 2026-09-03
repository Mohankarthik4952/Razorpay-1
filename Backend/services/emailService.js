// ============================================================
// ELECTRONICS AI
// SMTP EMAIL SERVICE
// ============================================================

const nodemailer = require("nodemailer");

// ============================================================
// SMTP TRANSPORTER
// ============================================================

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),

  secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// ============================================================
// VERIFY SMTP CONNECTION
// ============================================================

async function verifyEmailConnection() {
  try {
    await transporter.verify();

    console.log("SMTP email service connected successfully.");

    return true;
  } catch (error) {
    console.error("SMTP connection failed:", error.message);

    return false;
  }
}

// ============================================================
// FORMAT CURRENCY
// ============================================================

function formatCurrency(value) {
  const amount = Number(value || 0);

  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ============================================================
// SEND ORDER CONFIRMATION EMAIL
// ============================================================

async function sendOrderConfirmationEmail({
  customer,
  order,
  payment,
  items = [],
  paymentMethod,
}) {
  if (!customer?.email) {
    throw new Error("Customer email is required.");
  }

  const customerName = customer.name || "Customer";

  const orderId = order?.order_id || order?.orderId;

  const totalAmount = Number(
    order?.total_amount ?? order?.total ?? payment?.amount ?? 0,
  );

  const method = String(paymentMethod || "")
    .trim()
    .toLowerCase();

  const isCOD = method === "cod";

  const paymentMethodText = isCOD ? "Cash on Delivery" : "Online Payment";

  const paymentStatusText = isCOD ? "COD Pending" : "Paid";

  // ==========================================================
  // ITEMS HTML
  // ==========================================================

  let itemsHtml = "";

  if (items.length > 0) {
    itemsHtml = items
      .map((item) => {
        const name = item.name || `Product ${item.product_id}`;

        const quantity = Number(item.quantity || 1);

        const price = Number(item.price ?? item.unit_price ?? 0);

        const itemTotal = price * quantity;

        return `
          <tr>
            <td
              style="
                padding:12px 8px;
                border-bottom:1px solid #e5e7eb;
                color:#111827;
              "
            >
              ${name}
            </td>

            <td
              style="
                padding:12px 8px;
                border-bottom:1px solid #e5e7eb;
                text-align:center;
                color:#374151;
              "
            >
              ${quantity}
            </td>

            <td
              style="
                padding:12px 8px;
                border-bottom:1px solid #e5e7eb;
                text-align:right;
                color:#111827;
              "
            >
              ${formatCurrency(itemTotal)}
            </td>
          </tr>
        `;
      })
      .join("");
  } else {
    itemsHtml = `
      <tr>
        <td
          colspan="3"
          style="
            padding:16px;
            text-align:center;
            color:#64748b;
          "
        >
          Order items are available in your order details.
        </td>
      </tr>
    `;
  }

  // ==========================================================
  // EMAIL HTML
  // ==========================================================

  const html = `
<!DOCTYPE html>

<html>

<head>

  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>Order Confirmation</title>

</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f6f7f9;
    font-family:Arial,Helvetica,sans-serif;
    color:#172033;
  "
>

  <div
    style="
      max-width:680px;
      margin:40px auto;
      padding:20px;
    "
  >

    <!-- CARD -->

    <div
      style="
        background:#ffffff;
        border-radius:14px;
        padding:32px;
        box-shadow:0 4px 18px rgba(15,23,42,0.08);
      "
    >

      <!-- BRAND -->

      <div
        style="
          font-size:22px;
          font-weight:800;
          color:#111827;
          margin-bottom:30px;
        "
      >
        Electronics AI
      </div>

      <!-- SUCCESS -->

      <div
        style="
          text-align:center;
          padding:24px 10px;
          background:#f0fdf4;
          border-radius:12px;
          margin-bottom:28px;
        "
      >

        <div
          style="
            font-size:40px;
            margin-bottom:10px;
          "
        >
          ✓
        </div>

        <h1
          style="
            margin:0;
            font-size:25px;
            color:#166534;
          "
        >
          Order Successfully Confirmed
        </h1>

        <p
          style="
            margin:10px 0 0;
            color:#475569;
            font-size:14px;
          "
        >
          Thank you for shopping with Electronics AI.
        </p>

      </div>

      <!-- GREETING -->

      <p
        style="
          font-size:15px;
          line-height:1.7;
          margin:0 0 20px;
        "
      >
        Hello <strong>${customerName}</strong>,
      </p>

      <p
        style="
          font-size:14px;
          line-height:1.7;
          color:#475569;
          margin:0 0 24px;
        "
      >
        Your order has been successfully placed.
        Here are your order details:
      </p>

      <!-- ORDER INFORMATION -->

      <table
        width="100%"
        cellpadding="0"
        cellspacing="0"
        style="
          margin-bottom:28px;
          border-collapse:collapse;
        "
      >

        <tr>

          <td
            style="
              padding:10px 0;
              color:#64748b;
              font-size:14px;
            "
          >
            Order ID
          </td>

          <td
            style="
              padding:10px 0;
              text-align:right;
              font-weight:700;
              font-size:14px;
            "
          >
            #${orderId}
          </td>

        </tr>

        <tr>

          <td
            style="
              padding:10px 0;
              color:#64748b;
              font-size:14px;
            "
          >
            Payment Method
          </td>

          <td
            style="
              padding:10px 0;
              text-align:right;
              font-weight:700;
              font-size:14px;
            "
          >
            ${paymentMethodText}
          </td>

        </tr>

        <tr>

          <td
            style="
              padding:10px 0;
              color:#64748b;
              font-size:14px;
            "
          >
            Payment Status
          </td>

          <td
            style="
              padding:10px 0;
              text-align:right;
              font-weight:700;
              font-size:14px;
            "
          >
            ${paymentStatusText}
          </td>

        </tr>

      </table>

      <!-- ITEMS -->

      <h2
        style="
          font-size:18px;
          margin:0 0 12px;
        "
      >
        Order Items
      </h2>

      <table
        width="100%"
        cellpadding="0"
        cellspacing="0"
        style="
          border-collapse:collapse;
          margin-bottom:24px;
        "
      >

        <thead>

          <tr>

            <th
              style="
                padding:12px 8px;
                border-bottom:2px solid #e5e7eb;
                text-align:left;
                font-size:13px;
                color:#64748b;
              "
            >
              Product
            </th>

            <th
              style="
                padding:12px 8px;
                border-bottom:2px solid #e5e7eb;
                text-align:center;
                font-size:13px;
                color:#64748b;
              "
            >
              Qty
            </th>

            <th
              style="
                padding:12px 8px;
                border-bottom:2px solid #e5e7eb;
                text-align:right;
                font-size:13px;
                color:#64748b;
              "
            >
              Amount
            </th>

          </tr>

        </thead>

        <tbody>

          ${itemsHtml}

        </tbody>

      </table>

      <!-- TOTAL -->

      <div
        style="
          background:#f8fafc;
          border-radius:10px;
          padding:18px;
          margin-bottom:28px;
        "
      >

        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
        >

          <tr>

            <td
              style="
                font-size:16px;
                font-weight:700;
              "
            >
              Total Amount
            </td>

            <td
              style="
                text-align:right;
                font-size:20px;
                font-weight:800;
              "
            >
              ${formatCurrency(totalAmount)}
            </td>

          </tr>

        </table>

      </div>

      <!-- COD MESSAGE -->

      ${
        isCOD
          ? `
            <div
              style="
                background:#fff7ed;
                border:1px solid #fed7aa;
                border-radius:10px;
                padding:16px;
                margin-bottom:24px;
                color:#9a3412;
                font-size:14px;
                line-height:1.6;
              "
            >
              <strong>Cash on Delivery:</strong>
              Please keep the required amount ready when
              your order is delivered.
            </div>
          `
          : `
            <div
              style="
                background:#eff6ff;
                border:1px solid #bfdbfe;
                border-radius:10px;
                padding:16px;
                margin-bottom:24px;
                color:#1e40af;
                font-size:14px;
                line-height:1.6;
              "
            >
              Your online payment has been successfully
              processed.
            </div>
          `
      }

      <!-- FOOTER -->

      <p
        style="
          margin:0;
          color:#64748b;
          font-size:13px;
          line-height:1.7;
        "
      >
        Thank you for choosing Electronics AI.
        We appreciate your business.
      </p>

      <div
        style="
          margin-top:30px;
          padding-top:20px;
          border-top:1px solid #e5e7eb;
          text-align:center;
          color:#94a3b8;
          font-size:11px;
        "
      >
        AI-powered electronics shopping
      </div>

    </div>

  </div>

</body>

</html>
`;

  // ==========================================================
  // SEND EMAIL
  // ==========================================================

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,

    to: customer.email,

    subject: `Electronics AI - Order Confirmed #${orderId}`,

    html,
  });

  console.log(`✅ Order confirmation email sent to ${customer.email}`);

  console.log("Message ID:", info.messageId);

  return info;
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  transporter,
  verifyEmailConnection,
  sendOrderConfirmationEmail,
};
