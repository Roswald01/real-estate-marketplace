import { query } from "./db.js";

export const initDB = async () => {
  try {
    console.log(" Initializing database tables...");

    // 1. Properties Table
    await query(`
      CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        city VARCHAR(100) NOT NULL,
        rent INTEGER NOT NULL,
        bedrooms INTEGER NOT NULL,
        description TEXT,
        is_available BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Leads (Tenant Applicants) Table
    await query(`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        monthly_income INTEGER,
        qualification_status VARCHAR(50) DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Viewings (Appointments) Table with Foreign Keys
    await query(`
      CREATE TABLE IF NOT EXISTS viewings (
        id SERIAL PRIMARY KEY,
        property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
        lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
        slot_time TIMESTAMP NOT NULL,
        status VARCHAR(50) DEFAULT 'CONFIRMED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(property_id, slot_time) -- Prevents double booking
      );
    `);

    // 4. Seed sample properties if table is empty
    const { rows } = await query("SELECT COUNT(*) FROM properties;");
    if (parseInt(rows[0].count) === 0) {
      console.log(" Seeding initial properties...");
      await query(`
        INSERT INTO properties (title, city, rent, bedrooms, description)
        VALUES 
          ('Spacious 2-Room Flat in Berlin-Mitte', 'Berlin', 1350, 2, 'Furnished 2-bedroom with balcony, fast fiber internet, near Alexanderplatz. Minimum net household income required: 4050 EUR.'),
          ('Sunny 1-Room Studio in Friedrichshain', 'Berlin', 850, 1, 'Cozy modern studio apartment ideal for single professionals. Close to U-Bahn. Minimum net household income: 2550 EUR.'),
          ('Luxury 3-BHK Villa with Pool in Anjuna', 'Goa', 75000, 3, 'Peaceful gated villa with private pool, solar backup, 5 mins from beach. Perfect for remote tech workers.'),
          ('Modern 2-BHK Sea-View Flat in Miramar', 'Panaji', 42000, 2, 'High-rise apartment facing the Mandovi river, covered parking, 24/7 security.');
      `);
      console.log("Seed properties inserted!");
    }

    console.log(" Database schema initialized successfully!");
  } catch (error) {
    console.error("Failed to initialize schema:", error);
  }
};