import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LandingFAQ from "./LandingFAQ";

describe("LandingFAQ Component", () => {
  beforeEach(() => {
    render(<LandingFAQ />);
  });

  it("renders the FAQ section with correct heading", () => {
    expect(screen.getByText("Common Questions")).toBeInTheDocument();
    expect(screen.getByText("Everything you need to know about Synapset")).toBeInTheDocument();
  });

  it("renders all 5 FAQ questions", () => {
    expect(screen.getByText("How does the AI Mirror work?")).toBeInTheDocument();
    expect(screen.getByText("Is my data private and secure?")).toBeInTheDocument();
    expect(screen.getByText("Is Synapset a replacement for therapy?")).toBeInTheDocument();
    expect(screen.getByText("What if I'm in crisis?")).toBeInTheDocument();
    expect(screen.getByText("Can I use Synapset on mobile?")).toBeInTheDocument();
  });

  it("expands and collapses FAQ items on click", async () => {
    const user = userEvent.setup();
    const firstQuestion = screen.getByText("How does the AI Mirror work?");

    // Initially, answer should not be visible
    expect(screen.queryByText(/learns your patterns, values, and goals/)).not.toBeInTheDocument();

    // Click to expand
    await user.click(firstQuestion);
    expect(screen.getByText(/learns your patterns, values, and goals/)).toBeInTheDocument();

    // Click to collapse
    await user.click(firstQuestion);
    expect(screen.queryByText(/learns your patterns, values, and goals/)).not.toBeInTheDocument();
  });

  it("renders disclaimer footer with important notice", () => {
    expect(screen.getByText(/Important:/)).toBeInTheDocument();
    expect(screen.getByText(/Synapset is an AI-powered self-reflection tool/)).toBeInTheDocument();
    expect(screen.getByText(/not a licensed therapist/)).toBeInTheDocument();
  });

  it("displays crisis resources with correct phone numbers", () => {
    const crisisQuestion = screen.getByText("What if I'm in crisis?");
    expect(crisisQuestion).toBeInTheDocument();
    
    // The crisis resources should be in the DOM (even if collapsed)
    const allText = document.body.innerText;
    expect(allText).toContain("988");
    expect(allText).toContain("1-800-273-8255");
    expect(allText).toContain("911");
  });

  it("renders crisis resources as clickable phone links", async () => {
    const user = userEvent.setup();
    const crisisQuestion = screen.getByText("What if I'm in crisis?");
    
    // Expand the crisis question
    await user.click(crisisQuestion);
    
    // Check for phone links
    const link988 = screen.getByRole("link", { name: "988" });
    const link1800 = screen.getByRole("link", { name: "1-800-273-8255" });
    const link911 = screen.getByRole("link", { name: "911" });
    
    expect(link988).toHaveAttribute("href", "tel:988");
    expect(link1800).toHaveAttribute("href", "tel:18002738255");
    expect(link911).toHaveAttribute("href", "tel:911");
  });

  it("displays privacy information in the FAQ", async () => {
    const user = userEvent.setup();
    const privacyQuestion = screen.getByText("Is my data private and secure?");
    
    // Expand the privacy question
    await user.click(privacyQuestion);
    
    expect(screen.getByText(/Your data is encrypted and stored securely/)).toBeInTheDocument();
    expect(screen.getByText(/We never sell your information/)).toBeInTheDocument();
  });

  it("displays therapy disclaimer in the FAQ", async () => {
    const user = userEvent.setup();
    const therapyQuestion = screen.getByText("Is Synapset a replacement for therapy?");
    
    // Expand the therapy question
    await user.click(therapyQuestion);
    
    expect(screen.getByText(/not a licensed therapist, psychologist, medical doctor/)).toBeInTheDocument();
    expect(screen.getByText(/not a substitute for professional mental health care/)).toBeInTheDocument();
  });

  it("displays mobile optimization information", async () => {
    const user = userEvent.setup();
    const mobileQuestion = screen.getByText("Can I use Synapset on mobile?");
    
    // Expand the mobile question
    await user.click(mobileQuestion);
    
    expect(screen.getByText(/fully optimized for mobile devices/)).toBeInTheDocument();
  });

  it("only one FAQ item can be expanded at a time", async () => {
    const user = userEvent.setup();
    const firstQuestion = screen.getByText("How does the AI Mirror work?");
    const secondQuestion = screen.getByText("Is my data private and secure?");

    // Expand first question
    await user.click(firstQuestion);
    expect(screen.getByText(/learns your patterns, values, and goals/)).toBeInTheDocument();

    // Expand second question (should collapse first)
    await user.click(secondQuestion);
    expect(screen.queryByText(/learns your patterns, values, and goals/)).not.toBeInTheDocument();
    expect(screen.getByText(/Your data is encrypted and stored securely/)).toBeInTheDocument();
  });
});
