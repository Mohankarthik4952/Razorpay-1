// ============================================================
// ELECTRONICS AI
// AUTHENTICATION ROUTES
// ============================================================

const express = require("express");

const router = express.Router();

const db = require("../database");

// ============================================================
// AUTH API TEST
// GET /api/auth/test
// ============================================================

router.get("/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Authentication API is working.",
  });
});

// ============================================================
// REGISTER
// POST /api/auth/register
// ============================================================

router.post("/register", async (req, res) => {
  try {
    console.log("");
    console.log("==========================================");
    console.log("REGISTER REQUEST");
    console.log("==========================================");

    const name = String(req.body.name || "").trim();

    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    const phone = String(req.body.phone || "").trim();

    console.log("Name  :", name);
    console.log("Email :", email);
    console.log("Phone :", phone);

    // ========================================================
    // VALIDATION
    // ========================================================

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required.",
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    // ========================================================
    // EMAIL VALIDATION
    // ========================================================

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    // ========================================================
    // PHONE VALIDATION
    // ========================================================

    if (phone && !/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must contain exactly 10 digits.",
      });
    }

    // ========================================================
    // CHECK EXISTING CUSTOMER
    // ========================================================

    console.log("Checking existing customer...");

    const existingCustomer = await db.query(
      `
      SELECT
        customer_id,
        name,
        email,
        phone,
        created_at
      FROM customers
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [email],
    );

    if (existingCustomer.rows.length > 0) {
      const customer = existingCustomer.rows[0];

      console.log("Customer already exists:", customer.customer_id);

      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
        customer,
      });
    }

    // ========================================================
    // CREATE CUSTOMER
    // ========================================================

    console.log("Creating new customer...");

    const result = await db.query(
      `
      INSERT INTO customers
      (
        name,
        email,
        phone
      )
      VALUES
      (
        $1,
        $2,
        $3
      )
      RETURNING
        customer_id,
        name,
        email,
        phone,
        created_at
      `,
      [name, email, phone || null],
    );

    const customer = result.rows[0];

    console.log("Customer created successfully.");

    console.log("Customer ID:", customer.customer_id);

    // ========================================================
    // RESPONSE
    // ========================================================

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      customer,
    });
  } catch (error) {
    console.error("");
    console.error("REGISTER ERROR");
    console.error(error);
    console.error("");

    // PostgreSQL duplicate value
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create your account.",
    });
  }
});

// ============================================================
// LOGIN
// POST /api/auth/login
//
// Current customers table:
//
// customer_id
// name
// email
// phone
// created_at
//
// There is currently no password column.
// ============================================================

router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    // ========================================================
    // VALIDATION
    // ========================================================

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    // ========================================================
    // FIND CUSTOMER
    // ========================================================

    const result = await db.query(
      `
      SELECT
        customer_id,
        name,
        email,
        phone,
        created_at
      FROM customers
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [email],
    );

    // ========================================================
    // CUSTOMER NOT FOUND
    // ========================================================

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email.",
      });
    }

    const customer = result.rows[0];

    // ========================================================
    // LOGIN SUCCESS
    // ========================================================

    console.log(`Customer ${customer.customer_id} logged in successfully.`);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      customer,
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to login. Please try again.",
    });
  }
});

// ============================================================
// GET CUSTOMER
// GET /api/auth/customer/:customerId
// ============================================================

router.get("/customer/:customerId", async (req, res) => {
  try {
    const customerId = Number(req.params.customerId);

    // ======================================================
    // VALIDATE CUSTOMER ID
    // ======================================================

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    // ======================================================
    // FIND CUSTOMER
    // ======================================================

    const result = await db.query(
      `
        SELECT
          customer_id,
          name,
          email,
          phone,
          created_at
        FROM customers
        WHERE customer_id = $1
        LIMIT 1
        `,
      [customerId],
    );

    // ======================================================
    // CUSTOMER NOT FOUND
    // ======================================================

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    // ======================================================
    // RESPONSE
    // ======================================================

    return res.status(200).json({
      success: true,
      customer: result.rows[0],
    });
  } catch (error) {
    console.error("GET CUSTOMER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load customer.",
    });
  }
});

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
