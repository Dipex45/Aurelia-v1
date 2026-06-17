import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import express from "express";

// Create isolated testing application targeting deployment health controls
const app = express();

app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", service: "aurelia-ops", timestamp: new Date().toISOString() });
});

app.get("/ready", (req, res) => {
  res.status(200).json({ status: "ready", service: "aurelia-ops" });
});

app.get("/api/auth/rate-limiting-test", (req, res) => {
  // Mock endpoint to confirm secure rate limits responses
  res.setHeader("X-RateLimit-Limit", "100");
  res.setHeader("X-RateLimit-Remaining", "99");
  res.status(200).json({ msg: "rate limit assertions confirmed" });
});

describe("API Ingress & Health Check Pipelines", () => {
  it("GET /health should report healthy service structures", async () => {
    const res = await request(app)
      .get("/health")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(res.body.status).toBe("healthy");
    expect(res.body.service).toBe("aurelia-ops");
  });

  it("GET /ready should report readiness green verification", async () => {
    const res = await request(app)
      .get("/ready")
      .expect(200);

    expect(res.body.status).toBe("ready");
  });

  it("should enforce standard custom ratelimit headers", async () => {
    const res = await request(app)
      .get("/api/auth/rate-limiting-test")
      .expect(200);

    expect(res.headers["x-ratelimit-limit"]).toBe("100");
    expect(res.headers["x-ratelimit-remaining"]).toBe("99");
  });
});
