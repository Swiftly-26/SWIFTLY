import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import bootstrap from './main.server';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

/**
 * Prerendering configuration for parameterized routes
 * This function provides the parameters for the '/requests/:id' route during prerendering
 */
export const prerenderParams = {
  '/requests/:id': async () => {
    try {
      // Option 1: Fetch from API if you have a backend
      // const response = await fetch('https://api.example.com/requests');
      // const requests = await response.json();
      // return requests.map(req => ({ id: req.id.toString() }));
      
      // Option 2: Use static IDs (replace with your actual request IDs)
      const requestIds = ['1', '2', '3', '4', '5']; // Add your actual request IDs here
      return requestIds.map(id => ({ id }));
    } catch (error) {
      console.error('Error fetching request IDs for prerendering:', error);
      return []; // Return empty array to skip prerendering for this route
    }
  }
};

export default bootstrap;