/**
 * API Contract Schema Definitions (OpenAPI & GraphQL Specifications Representation)
 */
export const OPENAPI_SPECIFICATION = {
  openapi: "3.0.0",
  info: {
    title: "Aurelia Ops API Console",
    description: "Enterprise Operations Helpdesk & AI ticket triage hub",
    version: "1.0.0",
  },
  paths: {
    "/api/tickets": {
      get: {
        summary: "Retrieve ticket index feed",
        parameters: [
          { name: "workspaceId", in: "query", required: true, schema: { type: "string" } },
          { name: "status", in: "query", required: false, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Array of tickets matching queries" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        summary: "Exchange credentials for session tokens",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string" },
                  password: { type: "string" },
                },
                required: ["email", "password"],
              },
            },
          },
        },
        responses: {
          "200": { description: "Access token and metadata returned" },
        },
      },
    },
  },
};

export const GRAPHQL_SCHEMA = `
  type Ticket {
    id: ID!
    title: String!
    description: String
    status: String!
    priority: String!
    workspaceId: String!
    assignedTo: User
  }

  type User {
    id: ID!
    fullName: String!
    email: String!
  }

  type Query {
    getTicket(id: ID!): Ticket
    listTickets(workspaceId: ID!): [Ticket!]!
  }

  type Mutation {
    assignTicket(ticketId: ID!, assigneeId: ID!): Ticket!
  }
`;
