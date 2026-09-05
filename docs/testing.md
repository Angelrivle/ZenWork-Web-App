# ZenWork - Plan de Pruebas

## Estrategia General

| Tipo | Herramienta | Cobertura Objetivo | Frecuencia |
|---|---|---|---|
| Unitarias | Vitest | >80% servicios críticos | Cada commit |
| Integración | Vitest + Testcontainers | Auth, Webhooks, API | Cada PR |
| E2E | Playwright | Flujos principales | Pre-release |
| Carga | k6 | Endpoints públicos | Semanal |

## Pruebas Unitarias

### Servicios Críticos

```typescript
// packages/auth/src/__tests__/auth.test.ts
import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  generateTwoFactorSecret,
  verifyTwoFactorToken,
} from "../index";

describe("Auth Service", () => {
  describe("Password Hashing (Argon2id)", () => {
    it("should hash password with argon2id", async () => {
      const password = "SecurePass123!";
      const hash = await hashPassword(password);
      expect(hash).not.toBe(password);
      expect(hash).toMatch(/^\$argon2id\$/);
    });

    it("should verify correct password", async () => {
      const password = "SecurePass123!";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it("should reject incorrect password", async () => {
      const hash = await hashPassword("SecurePass123!");
      const isValid = await verifyPassword("WrongPassword", hash);
      expect(isValid).toBe(false);
    });
  });

  describe("2FA (TOTP)", () => {
    it("should generate valid TOTP secret", async () => {
      const { secret, otpauthUrl } = await generateTwoFactorSecret(
        "test@zenwork.com"
      );
      expect(secret).toBeDefined();
      expect(otpauthUrl).toContain("otpauth://totp/");
      expect(otpauthUrl).toContain("ZenWork");
    });

    it("should verify valid TOTP token", () => {
      const secret = "JBSWY3DPEHPK3PXP"; // Test secret
      const { authenticator } = require("otplib");
      const token = authenticator.generate(secret);
      const isValid = verifyTwoFactorToken(secret, token);
      expect(isValid).toBe(true);
    });
  });
});
```

### Validación de Schemas Zod

```typescript
// packages/shared/src/__tests__/schemas.test.ts
import { describe, it, expect } from "vitest";
import { registerSchema, createIssueSchema } from "../schemas";

describe("Zod Schemas", () => {
  describe("registerSchema", () => {
    it("should accept valid registration data", () => {
      const result = registerSchema.safeParse({
        email: "user@zenwork.com",
        password: "Secure123!",
        name: "Test User",
      });
      expect(result.success).toBe(true);
    });

    it("should reject weak password", () => {
      const result = registerSchema.safeParse({
        email: "user@zenwork.com",
        password: "weak",
        name: "Test",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid email", () => {
      const result = registerSchema.safeParse({
        email: "not-an-email",
        password: "Secure123!",
        name: "Test",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createIssueSchema", () => {
    it("should accept valid issue data", () => {
      const result = createIssueSchema.safeParse({
        projectId: "550e8400-e29b-41d4-a716-446655440000",
        title: "New issue",
        typeId: "550e8400-e29b-41d4-a716-446655440001",
        statusId: "550e8400-e29b-41d4-a716-446655440002",
        priority: "HIGH",
      });
      expect(result.success).toBe(true);
    });
  });
});
```

### Rate Limiter

```typescript
// packages/middleware/src/__tests__/rateLimit.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { checkRateLimit } from "../index";

describe("Rate Limiter", () => {
  it("should allow requests within limit", async () => {
    const result = await checkRateLimit("test:user1", {
      points: 5,
      duration: 60,
    });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
  });

  it("should block requests exceeding limit", async () => {
    // Simular 6 peticiones en una ventana de 60s
    for (let i = 0; i < 6; i++) {
      await checkRateLimit("test:exhaust", { points: 5, duration: 60 });
    }
    const result = await checkRateLimit("test:exhaust", {
      points: 5,
      duration: 60,
    });
    expect(result.allowed).toBe(false);
  });
});
```

## Pruebas de Integración

### Auth Flow completo

```typescript
// apps/web/__tests__/auth.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@zenwork/db";

describe("Auth Integration", () => {
  beforeAll(async () => {
    // Setup test database
    await prisma.$executeRaw`TRUNCATE TABLE users CASCADE`;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should register user and create organization", async () => {
    const response = await fetch("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "Secure123!",
        name: "Test User",
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.user.email).toBe("test@example.com");

    // Verificar que se creó la organización
    const user = await prisma.user.findUnique({
      where: { email: "test@example.com" },
      include: { memberships: true },
    });
    expect(user?.memberships).toHaveLength(1);
  });

  it("should login and set cookies", async () => {
    const response = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "Secure123!",
      }),
    });

    expect(response.status).toBe(200);
    const cookies = response.headers.get("set-cookie");
    expect(cookies).toContain("zenwork_session");
    expect(cookies).toContain("zenwork_refresh_token");
  });
});
```

### Webhook Signature Verification

```typescript
// packages/integrations/src/__tests__/webhook.test.ts
import { describe, it, expect } from "vitest";
import { signWebhookPayload, verifyWebhookSignature } from "@zenwork/middleware";

describe("Webhook Signatures", () => {
  const secret = "test-webhook-secret-key";

  it("should sign and verify payload correctly", () => {
    const payload = JSON.stringify({ event: "issue.created", data: {} });
    const signature = signWebhookPayload(payload, secret);

    const isValid = verifyWebhookSignature(payload, signature, secret);
    expect(isValid).toBe(true);
  });

  it("should reject tampered payload", () => {
    const payload = JSON.stringify({ event: "issue.created", data: {} });
    const signature = signWebhookPayload(payload, secret);

    const tamperedPayload = JSON.stringify({
      event: "issue.deleted",
      data: {},
    });
    const isValid = verifyWebhookSignature(tamperedPayload, signature, secret);
    expect(isValid).toBe(false);
  });
});
```

## Pruebas E2E (Playwright)

```typescript
// e2e/auth.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("should register new user", async ({ page }) => {
    await page.goto("/register");

    await page.fill('[name="email"]', "newuser@zenwork.com");
    await page.fill('[name="password"]', "Secure123!");
    await page.fill('[name="name"]', "New User");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL("/dashboard");
    await expect(page.locator("text=New User")).toBeVisible();
  });

  test("should login existing user", async ({ page }) => {
    await page.goto("/login");

    await page.fill('[name="email"]', "admin@zenwork.com");
    await page.fill('[name="password"]', "Admin123!");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL("/dashboard");
  });

  test("should create issue", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.fill('[name="email"]', "admin@zenwork.com");
    await page.fill('[name="password"]', "Admin123!");
    await page.click('button[type="submit"]');

    // Navigate to project
    await page.click("text=ZenWork Platform");
    await page.click("text=New Issue");

    await page.fill('[name="title"]', "E2E Test Issue");
    await page.selectOption('[name="type"]', "Tarea");
    await page.click('button[type="submit"]');

    await expect(page.locator("text=E2E Test Issue")).toBeVisible();
  });
});
```

## Scripts de Prueba

```json
// packages/db/package.json (scripts adicionales)
{
  "scripts": {
    "test:db": "vitest run --reporter=verbose",
    "test:db:coverage": "vitest run --coverage"
  }
}

// packages/auth/package.json (scripts adicionales)
{
  "scripts": {
    "test:auth": "vitest run --reporter=verbose",
    "test:auth:watch": "vitest watch"
  }
}
```

## Cobertura Mínima Requerida

| Módulo | Cobertura Mínima | Prioridad |
|---|---|---|
| Auth (login, register, 2FA) | 95% | Crítica |
| Rate Limiting | 90% | Alta |
| Issue CRUD | 85% | Alta |
| Board operations | 80% | Media |
| Document editing | 75% | Media |
| Webhook handling | 85% | Alta |
| Notification sending | 70% | Media |
