import express from "express";
import { query } from "../db.js";

const router = express.Router();

//fetch all properties
router.get("/", async (req, res) => {
  try {
    const { city } = req.query; // Optional filter: e.g. /api/properties?city=Panjim
    
    let sql = "SELECT * FROM properties WHERE is_available = TRUE";
    const params = [];

    if (city) {
      sql += " AND LOWER(city) = LOWER($1)";
      params.push(city);
    }

    sql += " ORDER BY id ASC;";

    const { rows } = await query(sql, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error("Error fetching properties:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

//Fetch single property details
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query("SELECT * FROM properties WHERE id = $1;", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Error fetching property:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;