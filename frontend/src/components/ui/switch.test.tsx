import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Switch } from "./switch";

describe("Switch Component", () => {
  describe("Rendering", () => {
    it("should render with unchecked state by default", () => {
      render(<Switch />);
      const switchButton = screen.getByRole("switch");
      expect(switchButton).toBeInTheDocument();
      expect(switchButton).toHaveAttribute("aria-checked", "false");
      expect(switchButton).toHaveAttribute("data-state", "unchecked");
    });

    it("should render with checked state when checked prop is true", () => {
      render(<Switch checked={true} />);
      const switchButton = screen.getByRole("switch");
      expect(switchButton).toHaveAttribute("aria-checked", "true");
      expect(switchButton).toHaveAttribute("data-state", "checked");
    });

    it("should apply custom className", () => {
      render(<Switch className="custom-class" />);
      const switchButton = screen.getByRole("switch");
      expect(switchButton).toHaveClass("custom-class");
    });

    it("should maintain base classes when custom className is provided", () => {
      render(<Switch className="custom-class" />);
      const switchButton = screen.getByRole("switch");
      expect(switchButton).toHaveClass("peer");
      expect(switchButton).toHaveClass("inline-flex");
      expect(switchButton).toHaveClass("custom-class");
    });
  });

  describe("Interactions", () => {
    it("should call onCheckedChange with true when unchecked switch is clicked", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Switch checked={false} onCheckedChange={handleChange} />);

      const switchButton = screen.getByRole("switch");
      await user.click(switchButton);

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it("should call onCheckedChange with false when checked switch is clicked", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Switch checked={true} onCheckedChange={handleChange} />);

      const switchButton = screen.getByRole("switch");
      await user.click(switchButton);

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith(false);
    });

    it("should toggle between states on multiple clicks", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      const { rerender } = render(<Switch checked={false} onCheckedChange={handleChange} />);

      const switchButton = screen.getByRole("switch");

      // first click: false -> true
      await user.click(switchButton);
      expect(handleChange).toHaveBeenLastCalledWith(true);

      // simulate state update
      rerender(<Switch checked={true} onCheckedChange={handleChange} />);

      // second click: true -> false
      await user.click(switchButton);
      expect(handleChange).toHaveBeenLastCalledWith(false);

      expect(handleChange).toHaveBeenCalledTimes(2);
    });

    it("should not call onCheckedChange when disabled", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Switch checked={false} onCheckedChange={handleChange} disabled />);

      const switchButton = screen.getByRole("switch");
      await user.click(switchButton);

      expect(handleChange).not.toHaveBeenCalled();
    });

    it("should work without onCheckedChange callback", async () => {
      const user = userEvent.setup();
      render(<Switch checked={false} />);

      const switchButton = screen.getByRole("switch");
      // should not throw error
      await user.click(switchButton);

      expect(switchButton).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should be keyboard accessible with Enter key", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Switch checked={false} onCheckedChange={handleChange} />);

      const switchButton = screen.getByRole("switch");
      switchButton.focus();
      expect(switchButton).toHaveFocus();

      await user.keyboard("{Enter}");
      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it("should be keyboard accessible with Space key", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Switch checked={false} onCheckedChange={handleChange} />);

      const switchButton = screen.getByRole("switch");
      switchButton.focus();

      await user.keyboard(" ");
      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it("should have proper role attribute", () => {
      render(<Switch />);
      const switchButton = screen.getByRole("switch");
      expect(switchButton).toHaveAttribute("role", "switch");
    });

    it("should update aria-checked when checked state changes", () => {
      const { rerender } = render(<Switch checked={false} />);
      const switchButton = screen.getByRole("switch");
      expect(switchButton).toHaveAttribute("aria-checked", "false");

      rerender(<Switch checked={true} />);
      expect(switchButton).toHaveAttribute("aria-checked", "true");
    });

    it("should have type button to prevent form submission", () => {
      render(<Switch />);
      const switchButton = screen.getByRole("switch");
      expect(switchButton).toHaveAttribute("type", "button");
    });
  });

  describe("Disabled State", () => {
    it("should render as disabled when disabled prop is true", () => {
      render(<Switch disabled />);
      const switchButton = screen.getByRole("switch");
      expect(switchButton).toBeDisabled();
    });

    it("should apply disabled styling classes", () => {
      render(<Switch disabled />);
      const switchButton = screen.getByRole("switch");
      expect(switchButton).toHaveClass("disabled:cursor-not-allowed");
      expect(switchButton).toHaveClass("disabled:opacity-50");
    });

    it("should prevent focus when disabled", () => {
      render(<Switch disabled />);
      const switchButton = screen.getByRole("switch");
      switchButton.focus();
      expect(switchButton).not.toHaveFocus();
    });
  });

  describe("Visual States", () => {
    it("should apply correct data-state attribute for unchecked state", () => {
      render(<Switch checked={false} />);
      const switchButton = screen.getByRole("switch");
      const thumb = switchButton.querySelector("span");

      expect(switchButton).toHaveAttribute("data-state", "unchecked");
      expect(thumb).toHaveAttribute("data-state", "unchecked");
    });

    it("should apply correct data-state attribute for checked state", () => {
      render(<Switch checked={true} />);
      const switchButton = screen.getByRole("switch");
      const thumb = switchButton.querySelector("span");

      expect(switchButton).toHaveAttribute("data-state", "checked");
      expect(thumb).toHaveAttribute("data-state", "checked");
    });

    it("should render thumb element inside switch", () => {
      render(<Switch />);
      const switchButton = screen.getByRole("switch");
      const thumb = switchButton.querySelector("span");

      expect(thumb).toBeInTheDocument();
      expect(thumb).toHaveClass("rounded-full");
      expect(thumb).toHaveClass("bg-[var(--color-background)]");
    });

    it("should apply transition classes to thumb", () => {
      render(<Switch />);
      const switchButton = screen.getByRole("switch");
      const thumb = switchButton.querySelector("span");

      expect(thumb).toHaveClass("transition-transform");
    });
  });

  describe("Props Forwarding", () => {
    it("should forward ref to button element", () => {
      const ref = { current: null as HTMLButtonElement | null };
      render(<Switch ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
      expect(ref.current?.getAttribute("role")).toBe("switch");
    });

    it("should forward additional button props", () => {
      render(<Switch data-testid="custom-switch" aria-label="Theme toggle" />);

      const switchButton = screen.getByTestId("custom-switch");
      expect(switchButton).toHaveAttribute("aria-label", "Theme toggle");
    });

    it("should allow custom id prop", () => {
      render(<Switch id="theme-switch" />);
      const switchButton = screen.getByRole("switch");
      expect(switchButton).toHaveAttribute("id", "theme-switch");
    });
  });

  describe("CSS Classes", () => {
    it("should apply base styling classes", () => {
      render(<Switch />);
      const switchButton = screen.getByRole("switch");

      expect(switchButton).toHaveClass("peer");
      expect(switchButton).toHaveClass("inline-flex");
      expect(switchButton).toHaveClass("h-6");
      expect(switchButton).toHaveClass("w-11");
      expect(switchButton).toHaveClass("rounded-full");
      expect(switchButton).toHaveClass("border-2");
    });

    it("should apply focus-visible styles", () => {
      render(<Switch />);
      const switchButton = screen.getByRole("switch");

      expect(switchButton).toHaveClass("focus-visible:outline-none");
      expect(switchButton).toHaveClass("focus-visible:ring-2");
      expect(switchButton).toHaveClass("focus-visible:ring-offset-2");
    });

    it("should apply cursor-pointer class", () => {
      render(<Switch />);
      const switchButton = screen.getByRole("switch");
      expect(switchButton).toHaveClass("cursor-pointer");
    });
  });
});
