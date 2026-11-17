import { describe, expect, it } from "vitest";
import { TestDriver } from "testdriverai/vitest/hooks";

describe("AME Church Reporting App", () => {
  it("renders sign-in page, toggles password reset, and handles login feedback", async (context) => {
    const testdriver = TestDriver(context);

    await testdriver.provision.chrome({
      url: process.env.APP_URL || "https://pulling-deposits-dosage-insights.trycloudflare.com",
    });

    const initialAssert = await testdriver.assert(
      "the sign in page for AME Monthly Church Reporting is visible with email and password fields"
    );
    expect(initialAssert).toBeTruthy();

    await testdriver.find("Forgot your password? link").click();

    const resetAssert = await testdriver.assert(
      "the password reset form is displayed with Send reset link and Back to sign in buttons"
    );
    expect(resetAssert).toBeTruthy();

    await testdriver.find("Back to sign in button").click();

    await testdriver.find("Email address input field").click();
    await testdriver.type("pastor@amechurch.example.com");

    await testdriver.find("Password input field").click();
    await testdriver.type("password123");

    await testdriver.find("Sign in button").click();

    const errorAssert = await testdriver.assert(
      'an error message stating "Sign-in failed. Please try again." is displayed'
    );
    expect(errorAssert).toBeTruthy();
  });
});
