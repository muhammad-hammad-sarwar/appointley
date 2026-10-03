import { Pool } from 'pg';
// Create a pool using the DATABASE_URL environment variable
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
/**
 * Execute a query with optional parameters
 * @param text SQL query string
 * @param params Query parameters
 * @returns QueryResult
 */
export const query = async (text, params) => {
    const client = await pool.connect();
    try {
        return await client.query(text, params);
    }
    finally {
        client.release();
    }
};
/**
 * Execute a function within a transaction
 * @param callback Function that receives a transaction client and returns a promise
 * @returns Result of the callback
 */
export const withTransaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
};
export default pool;
