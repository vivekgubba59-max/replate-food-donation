/**
 * Vercel Serverless Function Entrypoint
 * Forwards all incoming HTTP requests to Express app
 */

const app = require('../server.js');

module.exports = app;
