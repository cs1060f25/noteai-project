import { render, screen } from "@testing-library/react";
import JobProgress from "../components/JobProgress";

describe("JobProgress component", () => {
  it("renders stage label and percent", () => {
    render(<JobProgress percent={42} stage="preparing" />);
    expect(screen.getByText("Preparing Analysis")).toBeInTheDocument();
    expect(screen.getByText("42%")).toBeInTheDocument();
  });

  it("shows message and ETA when provided", () => {
    render(
      <JobProgress
        percent={80}
        stage="generating"
        message="Compiling…"
        etaSeconds={120}
      />
    );
    expect(screen.getByText("Compiling…")).toBeInTheDocument();
    expect(screen.getByText(/ETA ~2 min/i)).toBeInTheDocument();
  });

  it("does not render ETA when etaSeconds is NaN or <= 0", () => {
    const { rerender } = render(
      <JobProgress percent={50} stage="generating" etaSeconds={NaN as any} />
    );
    expect(screen.queryByText(/ETA/i)).toBeNull();

    rerender(<JobProgress percent={50} stage="generating" etaSeconds={0} />);
    expect(screen.queryByText(/ETA/i)).toBeNull();

    rerender(<JobProgress percent={50} stage="generating" etaSeconds={-10} />);
    expect(screen.queryByText(/ETA/i)).toBeNull();
  });
});