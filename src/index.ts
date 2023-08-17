/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import express from 'express';

import { initSequelizeClient } from './sequelize';
import { initPostsRouter, initUsersRouter } from './routers';
import { initErrorRequestHandler, initNotFoundRequestHandler } from './middleware';
import { Dialect } from 'sequelize';

const PORT = 8080;
const { DB_HOST, DB_DIALECT, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE } = process.env;

async function main(): Promise<void> {
  const app = express();
  const sequelizeClient = await initSequelizeClient({
    dialect: DB_DIALECT as Dialect,
    host: DB_HOST,
    port: DB_PORT,
    username: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_DATABASE,
  });

  app.use(express.json());

  app.use('/users', initUsersRouter(sequelizeClient));
  app.use('/posts', initPostsRouter(sequelizeClient));

  app.use('/', initNotFoundRequestHandler());

  app.use(initErrorRequestHandler());

  return new Promise((resolve) => {
    app.listen(PORT, () => {
      console.info(`app listening on port: '${PORT}'`);

      resolve();
    });
  });
}

