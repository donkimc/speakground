import { expect, test } from "@playwright/test";

test("home page renders with Korean helper text", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Your daily English");
  await expect(page.locator('[lang="ko"]')).toBeVisible();
  await expect(page.getByRole("link", { name: /join with invite/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /^log in$/i })).toBeVisible();
});

test("login skips the invite code", async ({ page }) => {
  await page.goto("/join?intent=login");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Log in");
  await expect(page.getByRole("button", { name: "Join with an invite code" })).toBeVisible();
});

test("join page accepts an invite code field", async ({ page }) => {
  await page.goto("/join");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Join with an invite");
  await expect(page.getByLabel("Invite code")).toBeVisible();
});

test("placement requires sign-in", async ({ page }) => {
  await page.goto("/placement");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Join with an invite");
});

test("health endpoint responds", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  expect(await response.json()).toEqual({ status: "ok" });
});

test("security headers are set", async ({ request }) => {
  const response = await request.get("/");
  expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
});
