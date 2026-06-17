import { test, expect } from "@playwright/test";

/**
 * Aurelia Ops E2E Browser Testing Suite
 * Synthesizes a real user scenario verifying end-to-end flow coverage
 */
test.describe("Aurelia Ops - Core Operations & Compliance E2E", () => {
  const agentEmail = `playwright_agent_${Date.now()}@aureliaops.com`;
  const agentPassword = "AureliaSuperAdmin2026!";
  const agentName = "Playwright Automation Agent";

  test("should load the application, submit credentials, log in, create ticket, and read results", async ({ page }) => {
    // ----------------------------------------------------
    // 1. Visit Portal & Verify Visual Identity
    // ----------------------------------------------------
    await page.goto("/login");
    await expect(page).toHaveTitle(/Aurelia/i);

    // Assert that major layout indicators are visible
    const emailInput = page.locator("input[type='email']");
    const passwordInput = page.locator("input[type='password']");
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // ----------------------------------------------------
    // 2. Perform Account Registration Flow
    // ----------------------------------------------------
    await page.goto("/register");
    await page.fill("input[name='fullName']", agentName);
    await page.fill("input[name='email']", agentEmail);
    await page.fill("input[name='password']", agentPassword);
    
    // Attempt registration submission
    await page.click("button[type='submit']");
    
    // Wait for route navigation to either verify page or dashboard log
    await page.waitForTimeout(1000); 

    // ----------------------------------------------------
    // 3. User Login Execution
    // ----------------------------------------------------
    await page.goto("/login");
    await page.fill("input[type='email']", agentEmail);
    await page.fill("input[type='password']", agentPassword);
    
    // Command submission and wait for redirection
    await page.click("button[type='submit']");
    
    // We expect the user to be routed to dashboard page upon successful verification
    await expect(page).toHaveURL(/.*dashboard/);

    // ----------------------------------------------------
    // 4. Create Workspace Workspace context
    // ----------------------------------------------------
    // Wait for the workspace interface to load
    const createWorkspaceBtn = page.locator("button:has-text('New Workspace')");
    if (await createWorkspaceBtn.isVisible()) {
      await createWorkspaceBtn.click();
      await page.fill("input[placeholder*='Workspace Name']", "SME Pilot Core Hub");
      await page.fill("input[placeholder*='workspace-slug']", `sme-slug-${Date.now()}`);
      await page.click("button:has-text('Assemble Workspace')");
    }

    // ----------------------------------------------------
    // 5. Customer support ticket Dispatch
    // ----------------------------------------------------
    const createTicketBtn = page.locator("button:has-text('Report Incident')");
    if (await createTicketBtn.isVisible()) {
      await createTicketBtn.click();
      await page.fill("input[name='title']", "DB OUTAGE: Supabase Connection Timeout Exception");
      await page.fill("textarea[name='description']", "Critical transactional failures in customer lookup tables.");
      await page.selectOption("select[name='priority']", "critical");
      await page.click("button:has-text('Dispatch Incident')");
    }

    // ----------------------------------------------------
    // 6. Verification of UI State Changes & Persistence
    // ----------------------------------------------------
    // Let's assert that the newly dispatched ticket details render on screen
    const ticketCardTitle = page.locator("text=DB OUTAGE");
    await expect(ticketCardTitle).toBeVisible();

    // ----------------------------------------------------
    // 7. GDPR Security and Controls Inspection
    // ----------------------------------------------------
    await page.goto("/profile");
    const gdprBtn = page.locator("button:has-text('DOWNLOAD_GDPR_ARCHIVE')");
    await expect(gdprBtn).toBeVisible();

    // Test GDPR Portability event download triggers
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      gdprBtn.click()
    ]);
    expect(download.suggestedFilename()).toContain("gdpr-data-export");

    // Close page successfully
    await page.close();
  });
});
