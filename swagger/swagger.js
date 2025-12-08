
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

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
        url: "https://ecombackend-xpdc.onrender.com", // Change to your real server URL
      },
    ],
  },

  // Path where your route files are located
  apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

export { swaggerUi, swaggerSpec };