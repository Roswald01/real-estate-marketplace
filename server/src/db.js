import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;
//pool manages multiple reusable connections to postgress

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for secure cloud connections like Neon/Supabase
  }
});


// Test the database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error("Error acquiring client from PostgreSQL pool:", err.stack);
  } else {
    console.log(" Connected to PostgreSQL database successfully!");
    release(); // Return client to pool
  }
});
// Helper function to run SQL queries anywhere in our app
export const query = (text, params) => pool.query(text, params);
export default pool;