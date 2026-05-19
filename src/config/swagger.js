// Minimal Swagger/OpenAPI setup. We expose a baseline spec with auth and
// envelope schemas, then collect route-level JSDoc annotations from
// src/modules/**/*.routes.js as you add them.
//
// Mount in app.js with:
//   const { mountSwagger } = require('./config/swagger');
//   mountSwagger(app, '/api-docs');

const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const env = require('./env');
const pkg = require('../../package.json');

const baseOptions = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'GK Health Care CRM Backend',
      version: pkg.version,
      description:
        'Internal CRM backend for GK Health Care. Modular monolith over Node.js/Express/Mongo.',
    },
    servers: [
      { url: `http://localhost:${env.port}${env.apiPrefix}`, description: 'Local' },
      { url: `${env.apiPrefix}`, description: 'Same-origin' },
    ],
    tags: [
      { name: 'Auth' },
      { name: 'Users' },
      { name: 'Roles' },
      { name: 'Locations' },
      { name: 'Customers' },
      { name: 'Customer Contacts' },
      { name: 'Products' },
      { name: 'Spare Parts' },
      { name: 'Customer Machines' },
      { name: 'Leads' },
      { name: 'Tasks' },
      { name: 'Uploads' },
      { name: 'Reports' },
      { name: 'Quotations' },
      { name: 'Payments' },
      { name: 'Outstandings' },
      { name: 'Expenses' },
      { name: 'Notifications' },
      { name: 'Dashboard' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ApiSuccess: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: {},
            meta: { type: 'object' },
          },
        },
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: { type: 'array', items: {} },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [
    path.resolve(__dirname, '..', 'modules', '**', '*.routes.js'),
    path.resolve(__dirname, '..', 'modules', '**', '*.controller.js'),
  ],
};

const spec = swaggerJsdoc(baseOptions);

function mountSwagger(app, mountPath = '/api-docs') {
  // The interactive UI
  app.use(
    mountPath,
    swaggerUi.serve,
    swaggerUi.setup(spec, {
      explorer: true,
      customSiteTitle: 'GK Health Care API',
    })
  );
  // Raw spec for tools / Postman
  app.get(`${mountPath}.json`, (req, res) => res.json(spec));
}

module.exports = { mountSwagger, spec };
