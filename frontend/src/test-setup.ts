import "@testing-library/jest-dom";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// cleanup after each test case
afterEach(() => {
  cleanup();
});

// mock environment variables if needed
if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY = "pk_test_mock_key_for_testing";
}
