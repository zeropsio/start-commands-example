import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { v4 as uuidv4 } from 'uuid';

const app = express();

const connectDB = async () => {
  return open({
    filename: 'database.db',
    driver: sqlite3.Database
  });
};

app.get('/', async (_, res) => {
  const client = await connectDB();

  await client.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL
    )
  `);

  const data = uuidv4();

  await client.run(`INSERT INTO entries(data) VALUES (?)`, [data]);

  const result = await client.get(`SELECT COUNT(*) as count FROM entries`);
  const count = result?.count ?? 0;

  res.status(201).send({
    message: `This is a simple, basic Node.js / Express.js application running on Zerops.io,
      each request adds an entry to the SQLite database and returns a count.
      See the source repository (https://github.com/zeropsio/recipe-nodejs) for more information.`,
    newEntry: data,
    count: count
  });

  await client.close();
});

app.get('/status', (_, res) => {
  res.status(200).send({ status: 'UP' });
});

export default app;
