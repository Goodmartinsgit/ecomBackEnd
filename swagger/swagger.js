const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Grandeur API Documentation",
      version: "1.0.0",
      description: "API documentation for Grandeur",
    },
    servers: [
      {
        url: "https://ecombackend-xpdc.onrender.com",
      },
    ],
  },
  apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerUi, swaggerSpec };