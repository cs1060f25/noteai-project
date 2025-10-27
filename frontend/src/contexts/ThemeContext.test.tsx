import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, renderHook, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useTheme } from "./ThemeContext";

describe("ThemeContext", () => {
  beforeEach(() => {
    // clean up document classes before each test
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    // clean up after tests
    document.documentElement.classList.remove("dark");
  });

  describe("ThemeProvider", () => {
    it("should render children", () => {
      render(
        <ThemeProvider>
          <div data-testid="child">Test Child</div>
        </ThemeProvider>
      );

      expect(screen.getByTestId("child")).toBeInTheDocument();
      expect(screen.getByText("Test Child")).toBeInTheDocument();
    });

    it("should provide theme context to children", () => {
      const TestComponent = () => {
        const { theme } = useTheme();
        return <div data-testid="theme-display">{theme}</div>;
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId("theme-display")).toHaveTextContent("light");
    });

    it("should initialize with light theme by default", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.theme).toBe("light");
    });

    it("should not add dark class to document root on initialization", () => {
      renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });

  describe("useTheme Hook", () => {
    it("should throw error when used outside ThemeProvider", () => {
      // suppress console.error for this test
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTheme());
      }).toThrow("useTheme must be used within a ThemeProvider");

      consoleSpy.mockRestore();
    });

    it("should return theme, setTheme, and toggleTheme functions", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current).toHaveProperty("theme");
      expect(result.current).toHaveProperty("setTheme");
      expect(result.current).toHaveProperty("toggleTheme");
      expect(typeof result.current.theme).toBe("string");
      expect(typeof result.current.setTheme).toBe("function");
      expect(typeof result.current.toggleTheme).toBe("function");
    });

    it("should return light theme initially", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.theme).toBe("light");
    });
  });

  describe("toggleTheme Function", () => {
    it("should toggle from light to dark", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.theme).toBe("light");

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe("dark");
    });

    it("should toggle from dark to light", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      // toggle to dark first
      act(() => {
        result.current.toggleTheme();
      });
      expect(result.current.theme).toBe("dark");

      // toggle back to light
      act(() => {
        result.current.toggleTheme();
      });
      expect(result.current.theme).toBe("light");
    });

    it("should toggle multiple times correctly", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      // start with light
      expect(result.current.theme).toBe("light");

      // toggle to dark
      act(() => {
        result.current.toggleTheme();
      });
      expect(result.current.theme).toBe("dark");

      // toggle to light
      act(() => {
        result.current.toggleTheme();
      });
      expect(result.current.theme).toBe("light");

      // toggle to dark again
      act(() => {
        result.current.toggleTheme();
      });
      expect(result.current.theme).toBe("dark");

      // toggle to light again
      act(() => {
        result.current.toggleTheme();
      });
      expect(result.current.theme).toBe("light");
    });
  });

  describe("setTheme Function", () => {
    it("should set theme to dark explicitly", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.theme).toBe("light");

      act(() => {
        result.current.setTheme("dark");
      });

      expect(result.current.theme).toBe("dark");
    });

    it("should set theme to light explicitly", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      // first set to dark
      act(() => {
        result.current.setTheme("dark");
      });
      expect(result.current.theme).toBe("dark");

      // then set back to light explicitly
      act(() => {
        result.current.setTheme("light");
      });

      expect(result.current.theme).toBe("light");
    });

    it("should allow setting theme to same value without issues", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      // set to light when already light
      act(() => {
        result.current.setTheme("light");
      });
      expect(result.current.theme).toBe("light");

      // set to dark
      act(() => {
        result.current.setTheme("dark");
      });
      expect(result.current.theme).toBe("dark");

      // set to dark again when already dark
      act(() => {
        result.current.setTheme("dark");
      });
      expect(result.current.theme).toBe("dark");
    });

    it("should work correctly with switch-like boolean conversion", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      // simulate Switch component behavior: checked=true means dark
      const checked = true;
      act(() => {
        result.current.setTheme(checked ? "dark" : "light");
      });
      expect(result.current.theme).toBe("dark");

      // simulate Switch component behavior: checked=false means light
      const unchecked = false;
      act(() => {
        result.current.setTheme(unchecked ? "dark" : "light");
      });
      expect(result.current.theme).toBe("light");
    });

    it("should update DOM immediately when using setTheme", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(document.documentElement.classList.contains("dark")).toBe(false);

      act(() => {
        result.current.setTheme("dark");
      });

      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(result.current.theme).toBe("dark");
    });

    it("should prevent state desync when explicitly setting theme", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      // rapid explicit theme changes should maintain correct state
      act(() => {
        result.current.setTheme("dark");
        result.current.setTheme("light");
        result.current.setTheme("dark");
        result.current.setTheme("dark"); // intentional duplicate
      });

      expect(result.current.theme).toBe("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  describe("DOM Class Manipulation", () => {
    it("should add dark class to document root when toggled to dark", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.toggleTheme();
      });

      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("should remove dark class from document root when toggled to light", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      // toggle to dark
      act(() => {
        result.current.toggleTheme();
      });
      expect(document.documentElement.classList.contains("dark")).toBe(true);

      // toggle back to light
      act(() => {
        result.current.toggleTheme();
      });
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("should maintain only one dark class on document root", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      // toggle to dark multiple times
      act(() => {
        result.current.toggleTheme();
        result.current.toggleTheme();
        result.current.toggleTheme();
      });

      // count dark classes (should be 1)
      const darkClasses = Array.from(document.documentElement.classList).filter(
        (cls) => cls === "dark"
      );
      expect(darkClasses.length).toBe(1);
    });

    it("should update DOM immediately after theme change", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(document.documentElement.classList.contains("dark")).toBe(false);

      act(() => {
        result.current.toggleTheme();
      });

      // check immediately after toggle
      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(result.current.theme).toBe("dark");
    });

    it("should properly clean up dark class when toggling back and forth", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      // cycle through multiple toggles
      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.toggleTheme();
        });

        if (i % 2 === 0) {
          // should be dark on even iterations (0, 2, 4, ...)
          expect(document.documentElement.classList.contains("dark")).toBe(true);
        } else {
          // should be light on odd iterations (1, 3, 5, ...)
          expect(document.documentElement.classList.contains("dark")).toBe(false);
        }
      }
    });
  });

  describe("Multiple Consumers", () => {
    it("should share the same theme state between multiple consumers", () => {
      const Consumer1 = () => {
        const { theme } = useTheme();
        return <div data-testid="consumer1">{theme}</div>;
      };

      const Consumer2 = () => {
        const { theme } = useTheme();
        return <div data-testid="consumer2">{theme}</div>;
      };

      render(
        <ThemeProvider>
          <Consumer1 />
          <Consumer2 />
        </ThemeProvider>
      );

      expect(screen.getByTestId("consumer1")).toHaveTextContent("light");
      expect(screen.getByTestId("consumer2")).toHaveTextContent("light");
    });

    it("should update all consumers when theme changes", async () => {
      const user = userEvent.setup();
      const Consumer1 = () => {
        const { theme, toggleTheme } = useTheme();
        return (
          <div>
            <div data-testid="consumer1">{theme}</div>
            <button onClick={toggleTheme} data-testid="toggle1">
              Toggle 1
            </button>
          </div>
        );
      };

      const Consumer2 = () => {
        const { theme } = useTheme();
        return <div data-testid="consumer2">{theme}</div>;
      };

      render(
        <ThemeProvider>
          <Consumer1 />
          <Consumer2 />
        </ThemeProvider>
      );

      expect(screen.getByTestId("consumer1")).toHaveTextContent("light");
      expect(screen.getByTestId("consumer2")).toHaveTextContent("light");

      // toggle from consumer 1
      await user.click(screen.getByTestId("toggle1"));

      // both consumers should update
      expect(screen.getByTestId("consumer1")).toHaveTextContent("dark");
      expect(screen.getByTestId("consumer2")).toHaveTextContent("dark");
    });

    it("should allow any consumer to toggle theme", async () => {
      const user = userEvent.setup();
      const Consumer1 = () => {
        const { theme, toggleTheme } = useTheme();
        return (
          <div>
            <div data-testid="consumer1">{theme}</div>
            <button onClick={toggleTheme} data-testid="toggle1">
              Toggle 1
            </button>
          </div>
        );
      };

      const Consumer2 = () => {
        const { theme, toggleTheme } = useTheme();
        return (
          <div>
            <div data-testid="consumer2">{theme}</div>
            <button onClick={toggleTheme} data-testid="toggle2">
              Toggle 2
            </button>
          </div>
        );
      };

      render(
        <ThemeProvider>
          <Consumer1 />
          <Consumer2 />
        </ThemeProvider>
      );

      // toggle from consumer 1
      await user.click(screen.getByTestId("toggle1"));
      expect(screen.getByTestId("consumer1")).toHaveTextContent("dark");
      expect(screen.getByTestId("consumer2")).toHaveTextContent("dark");

      // toggle from consumer 2
      await user.click(screen.getByTestId("toggle2"));
      expect(screen.getByTestId("consumer1")).toHaveTextContent("light");
      expect(screen.getByTestId("consumer2")).toHaveTextContent("light");
    });
  });

  describe("Session Persistence", () => {
    it("should reset to light theme on remount (session-only)", () => {
      const { result, unmount } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      // toggle to dark
      act(() => {
        result.current.toggleTheme();
      });
      expect(result.current.theme).toBe("dark");

      // unmount and remount
      unmount();

      const { result: newResult } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      // should be back to light (no persistence)
      expect(newResult.current.theme).toBe("light");
    });

    it("should not persist theme in localStorage", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.toggleTheme();
      });

      // check localStorage is not used
      expect(localStorage.getItem("theme")).toBeNull();
    });
  });

  describe("Type Safety", () => {
    it("should only accept light or dark as theme values", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      // theme should be either "light" or "dark"
      expect(["light", "dark"]).toContain(result.current.theme);
    });
  });
});
