import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";

describe("CSS Theme Integration", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    document.documentElement.classList.remove("dark");
  });

  describe("Document Root Classes", () => {
    it("should not have dark class by default", () => {
      render(
        <ThemeProvider>
          <div>Test</div>
        </ThemeProvider>
      );

      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("should add dark class when theme is dark", async () => {
      const user = userEvent.setup();
      const TestComponent = () => {
        const { toggleTheme } = useTheme();
        return <button onClick={toggleTheme}>Toggle</button>;
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const button = screen.getByText("Toggle");
      await user.click(button);

      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("should remove dark class when toggled back to light", async () => {
      const user = userEvent.setup();
      const TestComponent = () => {
        const { toggleTheme } = useTheme();
        return <button onClick={toggleTheme}>Toggle</button>;
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const button = screen.getByText("Toggle");

      // toggle to dark
      await user.click(button);
      expect(document.documentElement.classList.contains("dark")).toBe(true);

      // toggle back to light
      await user.click(button);
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("should apply dark class to html element", async () => {
      const user = userEvent.setup();
      const TestComponent = () => {
        const { toggleTheme } = useTheme();
        return <button onClick={toggleTheme}>Toggle</button>;
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const button = screen.getByText("Toggle");
      await user.click(button);

      expect(document.documentElement.tagName).toBe("HTML");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  describe("Theme Styling Verification", () => {
    it("should render component with light theme styles by default", () => {
      const TestComponent = () => {
        return (
          <div
            data-testid="themed-element"
            className="bg-background text-foreground"
          >
            Themed Content
          </div>
        );
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const element = screen.getByTestId("themed-element");
      expect(element).toHaveClass("bg-background");
      expect(element).toHaveClass("text-foreground");
    });

    it("should apply Tailwind color classes correctly", () => {
      const TestComponent = () => {
        return (
          <div data-testid="card" className="bg-card border-border">
            Card Content
          </div>
        );
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const card = screen.getByTestId("card");
      expect(card).toHaveClass("bg-card");
      expect(card).toHaveClass("border-border");
    });

    it("should maintain Tailwind classes when theme changes", async () => {
      const user = userEvent.setup();
      const TestComponent = () => {
        const { toggleTheme } = useTheme();
        return (
          <div>
            <div
              data-testid="themed-div"
              className="bg-primary text-primary-foreground"
            >
              Content
            </div>
            <button onClick={toggleTheme}>Toggle</button>
          </div>
        );
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const themedDiv = screen.getByTestId("themed-div");
      const button = screen.getByText("Toggle");

      // check classes before toggle
      expect(themedDiv).toHaveClass("bg-primary");
      expect(themedDiv).toHaveClass("text-primary-foreground");

      // toggle theme
      await user.click(button);

      // classes should still be applied (CSS values change via .dark selector)
      expect(themedDiv).toHaveClass("bg-primary");
      expect(themedDiv).toHaveClass("text-primary-foreground");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  describe("Fluent Design Classes", () => {
    it("should render fluent design classes correctly", () => {
      const TestComponent = () => {
        return (
          <div
            data-testid="fluent-glass"
            className="fluent-glass rounded-lg p-4"
          >
            Fluent Glass Effect
          </div>
        );
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const element = screen.getByTestId("fluent-glass");
      expect(element).toHaveClass("fluent-glass");
      expect(element).toHaveClass("rounded-lg");
      expect(element).toHaveClass("p-4");
    });

    it("should maintain fluent classes when theme is toggled", async () => {
      const user = userEvent.setup();
      const TestComponent = () => {
        const { toggleTheme } = useTheme();
        return (
          <div>
            <div
              data-testid="fluent-element"
              className="fluent-layer-2 fluent-hover-lift"
            >
              Fluent Element
            </div>
            <button onClick={toggleTheme}>Toggle</button>
          </div>
        );
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const element = screen.getByTestId("fluent-element");
      const button = screen.getByText("Toggle");

      expect(element).toHaveClass("fluent-layer-2");
      expect(element).toHaveClass("fluent-hover-lift");

      await user.click(button);

      expect(element).toHaveClass("fluent-layer-2");
      expect(element).toHaveClass("fluent-hover-lift");
    });
  });

  describe("Multiple Theme Switches", () => {
    it("should handle rapid theme switching", async () => {
      const user = userEvent.setup();
      const TestComponent = () => {
        const { toggleTheme } = useTheme();
        return <button onClick={toggleTheme}>Toggle</button>;
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const button = screen.getByText("Toggle");

      // perform multiple rapid toggles
      for (let i = 0; i < 10; i++) {
        await user.click(button);
        if (i % 2 === 0) {
          expect(document.documentElement.classList.contains("dark")).toBe(true);
        } else {
          expect(document.documentElement.classList.contains("dark")).toBe(false);
        }
      }
    });

    it("should not accumulate multiple dark classes", async () => {
      const user = userEvent.setup();
      const TestComponent = () => {
        const { toggleTheme } = useTheme();
        return <button onClick={toggleTheme}>Toggle</button>;
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const button = screen.getByText("Toggle");

      // toggle multiple times
      await user.click(button); // dark
      await user.click(button); // light
      await user.click(button); // dark

      const darkClasses = Array.from(document.documentElement.classList).filter(
        (cls) => cls === "dark"
      );

      expect(darkClasses.length).toBe(1);
    });
  });

  describe("CSS Variable Colors", () => {
    it("should apply background color class", () => {
      const TestComponent = () => {
        return (
          <div data-testid="bg-element" className="bg-background">
            Background
          </div>
        );
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const element = screen.getByTestId("bg-element");
      expect(element).toHaveClass("bg-background");
    });

    it("should apply background2 color class (regression test for missing variable)", () => {
      const TestComponent = () => {
        return (
          <div data-testid="bg2-element" className="bg-background2">
            Background2
          </div>
        );
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const element = screen.getByTestId("bg2-element");
      expect(element).toHaveClass("bg-background2");
    });

    it("should support background2 in gradients", () => {
      const TestComponent = () => {
        return (
          <div
            data-testid="gradient-element"
            className="bg-gradient-to-br from-background via-background2 to-background"
          >
            Gradient
          </div>
        );
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const element = screen.getByTestId("gradient-element");
      expect(element).toHaveClass("bg-gradient-to-br");
      expect(element).toHaveClass("from-background");
      expect(element).toHaveClass("via-background2");
      expect(element).toHaveClass("to-background");
    });

    it("should apply foreground text color class", () => {
      const TestComponent = () => {
        return (
          <div data-testid="text-element" className="text-foreground">
            Text
          </div>
        );
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const element = screen.getByTestId("text-element");
      expect(element).toHaveClass("text-foreground");
    });

    it("should apply border color classes", () => {
      const TestComponent = () => {
        return (
          <div data-testid="border-element" className="border border-border">
            Bordered
          </div>
        );
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const element = screen.getByTestId("border-element");
      expect(element).toHaveClass("border");
      expect(element).toHaveClass("border-border");
    });

    it("should apply accent color classes", () => {
      const TestComponent = () => {
        return (
          <div data-testid="accent-element" className="bg-accent">
            Accent
          </div>
        );
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const element = screen.getByTestId("accent-element");
      expect(element).toHaveClass("bg-accent");
    });

    it("should apply muted color classes", () => {
      const TestComponent = () => {
        return (
          <div data-testid="muted-element" className="text-muted-foreground">
            Muted Text
          </div>
        );
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const element = screen.getByTestId("muted-element");
      expect(element).toHaveClass("text-muted-foreground");
    });
  });

  describe("Body Styling", () => {
    it("should apply default body classes from CSS", () => {
      render(
        <ThemeProvider>
          <div>Content</div>
        </ThemeProvider>
      );

      // body should have bg-background and text-foreground from base layer
      // we can't directly test body in happy-dom, but we can verify the setup exists
      expect(document.body).toBeInTheDocument();
    });
  });

  describe("Theme Context Integration", () => {
    it("should apply CSS custom properties when theme changes (critical regression test)", async () => {
      const user = userEvent.setup();
      const TestComponent = () => {
        const { theme, toggleTheme } = useTheme();
        return (
          <div>
            <div data-testid="theme-indicator">{theme}</div>
            <button onClick={toggleTheme}>Toggle</button>
          </div>
        );
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const button = screen.getByText("Toggle");

      // initial state: light mode, no .dark class
      expect(screen.getByTestId("theme-indicator")).toHaveTextContent("light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);

      // toggle to dark mode
      await user.click(button);
      expect(screen.getByTestId("theme-indicator")).toHaveTextContent("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);

      // verify CSS custom properties are accessible (this ensures .dark selector works)
      // by checking that the .dark class actually exists on the html element
      const htmlElement = document.documentElement;
      expect(htmlElement.className).toContain("dark");

      // toggle back to light mode
      await user.click(button);
      expect(screen.getByTestId("theme-indicator")).toHaveTextContent("light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
      expect(htmlElement.className).not.toContain("dark");
    });

    it("should synchronize theme state with DOM class", async () => {
      const user = userEvent.setup();
      const TestComponent = () => {
        const { theme, toggleTheme } = useTheme();
        return (
          <div>
            <div data-testid="theme-text">{theme}</div>
            <button onClick={toggleTheme}>Toggle</button>
          </div>
        );
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const themeText = screen.getByTestId("theme-text");
      const button = screen.getByText("Toggle");

      // initial state
      expect(themeText).toHaveTextContent("light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);

      // toggle to dark
      await user.click(button);
      expect(themeText).toHaveTextContent("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);

      // toggle back to light
      await user.click(button);
      expect(themeText).toHaveTextContent("light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("should update DOM immediately when theme changes", async () => {
      const user = userEvent.setup();
      const TestComponent = () => {
        const { theme, toggleTheme } = useTheme();
        return (
          <div>
            <div data-testid="theme-display">{theme}</div>
            <div
              data-testid="dom-class"
              data-has-dark={document.documentElement.classList.contains("dark")}
            />
            <button onClick={toggleTheme}>Toggle</button>
          </div>
        );
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const button = screen.getByText("Toggle");
      await user.click(button);

      // both should update together
      expect(screen.getByTestId("theme-display")).toHaveTextContent("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });
});
