import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'speech_ai',
  waitForConnections: true,
  connectionLimit: 10,
});

export async function initDb() {
  await pool.query(`CREATE TABLE IF NOT EXISTS transcriptions (
    id CHAR(36) PRIMARY KEY,
    title VARCHAR(180) NOT NULL DEFAULT 'Untitled transcription',
    content TEXT NOT NULL,
    language VARCHAR(30) NOT NULL DEFAULT 'auto',
    duration_seconds INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`);
}