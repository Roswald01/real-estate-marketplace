import { query } from "./db.js";


// 1. TOOL DECLARATIONS (What Gemini (AI) sees)

export const toolsConfig = [
  {
    functionDeclarations: [
      {
        name: "getAvailableProperties",
        description: "Fetch real estate listings from the database. Can optionally filter by city (e.g. 'Berlin', 'Panaji', 'Goa').",
        parameters: {
          type: "OBJECT",
          properties: {
            city: {
              type: "STRING",
              description: "The city to filter properties by, e.g. Berlin or Panaji"
            }
          }
        }
      },
      {
        name: "bookViewing",
        description: "Qualify a tenant and book an apartment viewing appointment. In Germany/Europe, monthly income must be at least 3x the monthly rent.",
        parameters: {
          type: "OBJECT",
          properties: {
            propertyId: {
              type: "INTEGER",
              description: "The ID of the property the tenant wants to view"
            },
            tenantName: {
              type: "STRING",
              description: "Full name of the tenant"
            },
            tenantEmail: {
              type: "STRING",
              description: "Email address of the tenant"
            },
            monthlyIncome: {
              type: "INTEGER",
              description: "Tenant's monthly net household income in EUR or INR"
            },
            slotTime: {
              type: "STRING",
              description: "The requested date and time for viewing in ISO format (e.g., '2026-11-10T14:00:00Z')"
            }
          },
          required: ["propertyId", "tenantName", "tenantEmail", "monthlyIncome", "slotTime"]
        }
      }
    ]
  }
];


// 2. REAL FUNCTIONS (What executes in Postgres)


// Tool 1: Fetch listings from PostgreSQL
export const getAvailableProperties = async ({ city }) => {
  let sql = "SELECT id, title, city, rent, bedrooms, description FROM properties WHERE is_available = TRUE";
  const params = [];

  if (city) {
    sql += " AND LOWER(city) = LOWER($1)";
    params.push(city);
  }

  sql += " ORDER BY id ASC;";
  const { rows } = await query(sql, params);
  return { properties: rows };
};

// Tool 2: Qualify tenant and book viewing slot
export const bookViewing = async ({ propertyId, tenantName, tenantEmail, monthlyIncome, slotTime }) => {
  // A. Check if the property exists
  const propRes = await query("SELECT * FROM properties WHERE id = $1 AND is_available = TRUE", [propertyId]);
  if (propRes.rows.length === 0) {
    return { error: "Property not found or is no longer available." };
  }

  const property = propRes.rows[0];

  // B. German Rental Qualification Rule: Income must be >= 3x rent
  const requiredIncome = property.rent * 3;
  const isQualified = monthlyIncome >= requiredIncome;

  // C. Insert or update the lead in PostgreSQL
  const leadRes = await query(
    `INSERT INTO leads (name, email, monthly_income, qualification_status)
     VALUES ($1, $2, $3, $4)
     RETURNING id;`,
    [tenantName, tenantEmail, monthlyIncome, isQualified ? "QUALIFIED" : "REJECTED"]
  );
  const leadId = leadRes.rows[0].id;

  // D. If not qualified, inform the agent
  if (!isQualified) {
    return {
      status: "REJECTED",
      message: `Tenant income (${monthlyIncome}) is below the required 3x rent threshold (${requiredIncome}). Cannot confirm booking.`
    };
  }

  // E. Try to book viewing slot (PostgreSQL UNIQUE constraint catches double-booking)
  try {
    const viewingRes = await query(
      `INSERT INTO viewings (property_id, lead_id, slot_time, status)
       VALUES ($1, $2, $3, 'CONFIRMED')
       RETURNING id, slot_time;`,
      [propertyId, leadId, slotTime]
    );

    return {
      status: "CONFIRMED",
      bookingId: viewingRes.rows[0].id,
      propertyTitle: property.title,
      slotTime: viewingRes.rows[0].slot_time,
      message: "Viewing booked successfully!"
    };
  } catch (err) {
    // Error code '23505' in PostgreSQL is a Unique Constraint Violation
    if (err.code === "23505") {
      return {
        error: "This time slot is already booked for this property. Please ask the tenant for an alternate time."
      };
    }
    throw err;
  }
};