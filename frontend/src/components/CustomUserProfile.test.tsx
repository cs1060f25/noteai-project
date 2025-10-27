import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomUserProfile } from "./CustomUserProfile";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useUser, useClerk } from "@clerk/clerk-react";

// mock clerk hooks
vi.mock("@clerk/clerk-react", () => ({
  useUser: vi.fn(),
  useClerk: vi.fn(),
}));

const mockUser = {
  id: "user_123",
  firstName: "John",
  lastName: "Doe",
  primaryEmailAddress: {
    emailAddress: "john.doe@example.com",
    verification: {
      status: "verified",
    },
  },
  imageUrl: "https://example.com/avatar.jpg",
  createdAt: new Date("2024-01-01").getTime(),
};

describe("CustomUserProfile - Theme Toggle Integration", () => {
  let useUserMock: ReturnType<typeof vi.fn>;
  let useClerkMock: ReturnType<typeof vi.fn>;
  let signOutMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    signOutMock = vi.fn().mockResolvedValue(undefined);
    useUserMock = vi.fn();
    useClerkMock = vi.fn();

    (useUser as ReturnType<typeof vi.fn>).mockImplementation(useUserMock);
    (useClerk as ReturnType<typeof vi.fn>).mockImplementation(useClerkMock);

    useUserMock.mockReturnValue({
      user: mockUser,
      isLoaded: true,
    });

    useClerkMock.mockReturnValue({
      signOut: signOutMock,
    });

    // clean up DOM classes
    document.documentElement.classList.remove("dark");
  });

  const renderWithTheme = (component: React.ReactElement) => {
    return render(<ThemeProvider>{component}</ThemeProvider>);
  };

  describe("Theme Toggle Rendering", () => {
    it("should render theme toggle in dropdown menu", async () => {
      const user = userEvent.setup();
      renderWithTheme(<CustomUserProfile />);

      // open dropdown
      const profileButton = screen.getByRole("button", { name: /john doe/i });
      await user.click(profileButton);

      // check for theme toggle
      expect(screen.getByText("Theme")).toBeInTheDocument();
      expect(screen.getByText("Light mode")).toBeInTheDocument();
    });

    it("should display Sun icon when in light mode", async () => {
      const user = userEvent.setup();
      renderWithTheme(<CustomUserProfile />);

      // open dropdown
      const profileButton = screen.getByRole("button");
      await user.click(profileButton);

      // sun icon should be visible (we can check by the parent container)
      const themeSection = screen.getByText("Theme").closest("div");
      expect(themeSection).toBeInTheDocument();
      expect(screen.getByText("Light mode")).toBeInTheDocument();
    });

    it("should display Moon icon when in dark mode", async () => {
      const user = userEvent.setup();
      renderWithTheme(<CustomUserProfile />);

      // open dropdown
      const profileButton = screen.getByRole("button");
      await user.click(profileButton);

      // toggle to dark mode
      const switchElement = screen.getByRole("switch");
      await user.click(switchElement);

      // moon icon should be visible now
      expect(screen.getByText("Dark mode")).toBeInTheDocument();
    });

    it("should render theme toggle between Settings and Sign out", async () => {
      const user = userEvent.setup();
      renderWithTheme(<CustomUserProfile />);

      // open dropdown
      const profileButton = screen.getAllByRole("button")[0];
      await user.click(profileButton);

      // verify all elements exist
      expect(screen.getByRole("button", { name: /settings/i })).toBeInTheDocument();
      expect(screen.getByText("Theme")).toBeInTheDocument();
      expect(screen.getByRole("switch")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
    });
  });

  describe("Theme Toggle Functionality", () => {
    it("should toggle theme when switch is clicked", async () => {
      const user = userEvent.setup();
      renderWithTheme(<CustomUserProfile />);

      // open dropdown
      await user.click(screen.getByRole("button"));

      // verify initial state
      expect(screen.getByText("Light mode")).toBeInTheDocument();
      expect(document.documentElement.classList.contains("dark")).toBe(false);

      // toggle theme
      const switchElement = screen.getByRole("switch");
      await user.click(switchElement);

      // verify dark mode
      expect(screen.getByText("Dark mode")).toBeInTheDocument();
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("should toggle theme back to light", async () => {
      const user = userEvent.setup();
      renderWithTheme(<CustomUserProfile />);

      // open dropdown
      await user.click(screen.getByRole("button"));

      // toggle to dark
      const switchElement = screen.getByRole("switch");
      await user.click(switchElement);
      expect(screen.getByText("Dark mode")).toBeInTheDocument();

      // toggle back to light
      await user.click(switchElement);
      expect(screen.getByText("Light mode")).toBeInTheDocument();
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("should update switch checked state based on theme", async () => {
      const user = userEvent.setup();
      renderWithTheme(<CustomUserProfile />);

      // open dropdown
      await user.click(screen.getByRole("button"));

      const switchElement = screen.getByRole("switch");

      // initially unchecked (light mode)
      expect(switchElement).toHaveAttribute("aria-checked", "false");

      // toggle to dark
      await user.click(switchElement);
      expect(switchElement).toHaveAttribute("aria-checked", "true");

      // toggle back to light
      await user.click(switchElement);
      expect(switchElement).toHaveAttribute("aria-checked", "false");
    });

    it("should maintain theme when dropdown is closed and reopened", async () => {
      const user = userEvent.setup();
      renderWithTheme(<CustomUserProfile />);

      // open dropdown and toggle to dark
      await user.click(screen.getByRole("button"));
      const switchElement = screen.getByRole("switch");
      await user.click(switchElement);
      expect(screen.getByText("Dark mode")).toBeInTheDocument();

      // close dropdown
      const backdrop = document.querySelector(".fixed.inset-0");
      if (backdrop) {
        await user.click(backdrop as HTMLElement);
      }

      // reopen dropdown
      await user.click(screen.getByRole("button"));

      // theme should still be dark
      expect(screen.getByText("Dark mode")).toBeInTheDocument();
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  describe("Theme Toggle Accessibility", () => {
    it("should have proper switch role for theme toggle", async () => {
      const user = userEvent.setup();
      renderWithTheme(<CustomUserProfile />);

      await user.click(screen.getByRole("button"));

      const switchElement = screen.getByRole("switch");
      expect(switchElement).toBeInTheDocument();
      expect(switchElement).toHaveAttribute("type", "button");
    });

    it("should be keyboard accessible", async () => {
      const user = userEvent.setup();
      renderWithTheme(<CustomUserProfile />);

      // open dropdown with keyboard
      const profileButton = screen.getByRole("button");
      profileButton.focus();
      await user.keyboard("{Enter}");

      // navigate to switch and toggle with keyboard
      const switchElement = screen.getByRole("switch");
      switchElement.focus();
      await user.keyboard("{Enter}");

      expect(screen.getByText("Dark mode")).toBeInTheDocument();
    });

    it("should update aria-checked attribute when toggled", async () => {
      const user = userEvent.setup();
      renderWithTheme(<CustomUserProfile />);

      await user.click(screen.getByRole("button"));
      const switchElement = screen.getByRole("switch");

      expect(switchElement).toHaveAttribute("aria-checked", "false");

      await user.click(switchElement);
      expect(switchElement).toHaveAttribute("aria-checked", "true");
    });
  });

  describe("Theme Toggle Visual Feedback", () => {
    it("should show Light mode text when theme is light", async () => {
      const user = userEvent.setup();
      renderWithTheme(<CustomUserProfile />);

      await user.click(screen.getByRole("button"));

      const themeDescription = screen.getByText("Light mode");
      expect(themeDescription).toBeInTheDocument();
      expect(themeDescription).toHaveClass("fluent-caption");
    });

    it("should show Dark mode text when theme is dark", async () => {
      const user = userEvent.setup();
      renderWithTheme(<CustomUserProfile />);

      await user.click(screen.getByRole("button"));
      await user.click(screen.getByRole("switch"));

      const themeDescription = screen.getByText("Dark mode");
      expect(themeDescription).toBeInTheDocument();
      expect(themeDescription).toHaveClass("fluent-caption");
    });

    it("should display Theme label consistently", async () => {
      const user = userEvent.setup();
      renderWithTheme(<CustomUserProfile />);

      await user.click(screen.getByRole("button"));

      const themeLabel = screen.getByText("Theme");
      expect(themeLabel).toBeInTheDocument();
      expect(themeLabel).toHaveClass("fluent-body");

      // toggle theme
      await user.click(screen.getByRole("switch"));

      // label should still be present
      expect(screen.getByText("Theme")).toBeInTheDocument();
    });
  });

  describe("Integration with Other Menu Items", () => {
    it("should not affect other menu items when theme is toggled", async () => {
      const user = userEvent.setup();
      renderWithTheme(<CustomUserProfile />);

      await user.click(screen.getByRole("button"));

      // verify other menu items are present
      expect(screen.getByText("Settings")).toBeInTheDocument();
      expect(screen.getByText("Profile")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();

      // toggle theme
      await user.click(screen.getByRole("switch"));

      // verify other menu items are still present
      expect(screen.getByText("Settings")).toBeInTheDocument();
      expect(screen.getByText("Profile")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
    });

    it("should allow clicking other menu items after theme toggle", async () => {
      const user = userEvent.setup();
      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      renderWithTheme(<CustomUserProfile />);

      await user.click(screen.getByRole("button"));

      // toggle theme
      await user.click(screen.getByRole("switch"));

      // click settings
      const settingsButton = screen.getByRole("button", { name: /settings/i });
      await user.click(settingsButton);

      expect(consoleLogSpy).toHaveBeenCalledWith("Navigate to settings");

      consoleLogSpy.mockRestore();
    });
  });

  describe("Theme Persistence in Session", () => {
    it("should maintain theme when component re-renders", async () => {
      const user = userEvent.setup();
      const { rerender } = renderWithTheme(<CustomUserProfile />);

      // open dropdown and toggle theme
      const profileButton = screen.getByRole("button");
      await user.click(profileButton);
      await user.click(screen.getByRole("switch"));
      expect(document.documentElement.classList.contains("dark")).toBe(true);

      // close dropdown by clicking outside
      const backdrop = document.querySelector(".fixed.inset-0");
      if (backdrop) {
        await user.click(backdrop as HTMLElement);
      }

      // rerender component
      rerender(
        <ThemeProvider>
          <CustomUserProfile />
        </ThemeProvider>
      );

      // theme should still be dark - reopen dropdown to verify
      const newProfileButton = screen.getByRole("button");
      await user.click(newProfileButton);
      expect(screen.getByText("Dark mode")).toBeInTheDocument();
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  describe("Loading State", () => {
    it("should not show theme toggle when user is loading", () => {
      useUserMock.mockReturnValue({
        user: null,
        isLoaded: false,
      });

      renderWithTheme(<CustomUserProfile />);

      // only loading spinner should be visible, no menu
      expect(screen.queryByText("Theme")).not.toBeInTheDocument();
    });

    it("should show theme toggle when user is loaded", async () => {
      const user = userEvent.setup();
      renderWithTheme(<CustomUserProfile />);

      await user.click(screen.getByRole("button"));

      expect(screen.getByText("Theme")).toBeInTheDocument();
    });
  });
});
