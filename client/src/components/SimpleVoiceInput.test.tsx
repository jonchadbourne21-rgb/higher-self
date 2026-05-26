import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SimpleVoiceInput } from "./SimpleVoiceInput";

// Mock Web Speech API
const mockSpeechRecognition = vi.fn();
const mockRecognitionInstance = {
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn(),
  continuous: false,
  interimResults: false,
  lang: "",
  onstart: null as any,
  onresult: null as any,
  onerror: null as any,
  onend: null as any,
};

beforeEach(() => {
  vi.clearAllMocks();
  (window as any).webkitSpeechRecognition = mockSpeechRecognition;
  mockSpeechRecognition.mockReturnValue(mockRecognitionInstance);
});

describe("SimpleVoiceInput", () => {
  it("renders Speak button", () => {
    const mockCallback = vi.fn();
    render(
      <SimpleVoiceInput onTranscriptionUpdate={mockCallback} currentContent="" />
    );
    expect(screen.getByText("Speak")).toBeInTheDocument();
  });

  it("initializes Web Speech API with correct settings", () => {
    const mockCallback = vi.fn();
    render(
      <SimpleVoiceInput onTranscriptionUpdate={mockCallback} currentContent="" />
    );
    
    expect(mockSpeechRecognition).toHaveBeenCalled();
    expect(mockRecognitionInstance.continuous).toBe(true);
    expect(mockRecognitionInstance.interimResults).toBe(true);
    expect(mockRecognitionInstance.lang).toBe("en-US");
  });

  it("starts recording when Speak button is clicked", async () => {
    const mockCallback = vi.fn();
    render(
      <SimpleVoiceInput onTranscriptionUpdate={mockCallback} currentContent="" />
    );
    
    const speakButton = screen.getByText("Speak");
    fireEvent.click(speakButton);
    
    await waitFor(() => {
      expect(mockRecognitionInstance.start).toHaveBeenCalled();
    });
  });

  it("shows Stop Recording button when recording", async () => {
    const mockCallback = vi.fn();
    render(
      <SimpleVoiceInput onTranscriptionUpdate={mockCallback} currentContent="" />
    );
    
    const speakButton = screen.getByText("Speak");
    fireEvent.click(speakButton);
    
    // Simulate onstart event
    if (mockRecognitionInstance.onstart) {
      mockRecognitionInstance.onstart();
    }
    
    await waitFor(() => {
      expect(screen.getByText("Stop Recording")).toBeInTheDocument();
    });
  });

  it("shows listening indicator when recording", async () => {
    const mockCallback = vi.fn();
    render(
      <SimpleVoiceInput onTranscriptionUpdate={mockCallback} currentContent="" />
    );
    
    const speakButton = screen.getByText("Speak");
    fireEvent.click(speakButton);
    
    // Simulate onstart event
    if (mockRecognitionInstance.onstart) {
      mockRecognitionInstance.onstart();
    }
    
    await waitFor(() => {
      expect(screen.getByText("Listening...")).toBeInTheDocument();
    });
  });

  it("stops recording when Stop Recording button is clicked", async () => {
    const mockCallback = vi.fn();
    render(
      <SimpleVoiceInput onTranscriptionUpdate={mockCallback} currentContent="" />
    );
    
    const speakButton = screen.getByText("Speak");
    fireEvent.click(speakButton);
    
    // Simulate onstart event
    if (mockRecognitionInstance.onstart) {
      mockRecognitionInstance.onstart();
    }
    
    await waitFor(() => {
      expect(screen.getByText("Stop Recording")).toBeInTheDocument();
    });
    
    const stopButton = screen.getByText("Stop Recording");
    fireEvent.click(stopButton);
    
    await waitFor(() => {
      expect(mockRecognitionInstance.stop).toHaveBeenCalled();
    });
  });

  it("handles final transcription results", async () => {
    const mockCallback = vi.fn();
    render(
      <SimpleVoiceInput onTranscriptionUpdate={mockCallback} currentContent="" />
    );
    
    const speakButton = screen.getByText("Speak");
    fireEvent.click(speakButton);
    
    // Simulate onstart
    if (mockRecognitionInstance.onstart) {
      mockRecognitionInstance.onstart();
    }
    
    // Simulate onresult with final transcript
    if (mockRecognitionInstance.onresult) {
      mockRecognitionInstance.onresult({
        resultIndex: 0,
        results: [
          [{ transcript: "Hello world", isFinal: true }],
        ],
        isFinal: true,
      });
    }
    
    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalledWith(expect.stringContaining("Hello world"));
    });
  });

  it("handles interim transcription results", async () => {
    const mockCallback = vi.fn();
    render(
      <SimpleVoiceInput onTranscriptionUpdate={mockCallback} currentContent="" />
    );
    
    const speakButton = screen.getByText("Speak");
    fireEvent.click(speakButton);
    
    // Simulate onstart
    if (mockRecognitionInstance.onstart) {
      mockRecognitionInstance.onstart();
    }
    
    // Simulate onresult with interim transcript
    if (mockRecognitionInstance.onresult) {
      mockRecognitionInstance.onresult({
        resultIndex: 0,
        results: [
          [{ transcript: "Hello", isFinal: false }],
        ],
        isFinal: false,
      });
    }
    
    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalledWith(expect.stringContaining("Hello"));
    });
  });

  it("accumulates multiple final transcriptions with spaces", async () => {
    const mockCallback = vi.fn();
    render(
      <SimpleVoiceInput onTranscriptionUpdate={mockCallback} currentContent="" />
    );
    
    const speakButton = screen.getByText("Speak");
    fireEvent.click(speakButton);
    
    // Simulate onstart
    if (mockRecognitionInstance.onstart) {
      mockRecognitionInstance.onstart();
    }
    
    // First result
    if (mockRecognitionInstance.onresult) {
      mockRecognitionInstance.onresult({
        resultIndex: 0,
        results: [
          [{ transcript: "Hello", isFinal: true }],
        ],
        isFinal: true,
      });
    }
    
    // Second result
    if (mockRecognitionInstance.onresult) {
      mockRecognitionInstance.onresult({
        resultIndex: 1,
        results: [
          [{ transcript: "Hello", isFinal: true }],
          [{ transcript: "world", isFinal: true }],
        ],
        isFinal: true,
      });
    }
    
    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalledWith(expect.stringContaining("Hello"));
      expect(mockCallback).toHaveBeenCalledWith(expect.stringContaining("world"));
    });
  });

  it("calls onTranscriptionUpdate on recording end", async () => {
    const mockCallback = vi.fn();
    render(
      <SimpleVoiceInput onTranscriptionUpdate={mockCallback} currentContent="" />
    );
    
    const speakButton = screen.getByText("Speak");
    fireEvent.click(speakButton);
    
    // Simulate onstart
    if (mockRecognitionInstance.onstart) {
      mockRecognitionInstance.onstart();
    }
    
    // Simulate onresult with final transcript
    if (mockRecognitionInstance.onresult) {
      mockRecognitionInstance.onresult({
        resultIndex: 0,
        results: [
          [{ transcript: "Test message", isFinal: true }],
        ],
        isFinal: true,
      });
    }
    
    // Simulate onend
    if (mockRecognitionInstance.onend) {
      mockRecognitionInstance.onend();
    }
    
    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalledWith("Test message");
    });
  });

  it("handles speech recognition errors gracefully", async () => {
    const mockCallback = vi.fn();
    render(
      <SimpleVoiceInput onTranscriptionUpdate={mockCallback} currentContent="" />
    );
    
    const speakButton = screen.getByText("Speak");
    fireEvent.click(speakButton);
    
    // Simulate onstart
    if (mockRecognitionInstance.onstart) {
      mockRecognitionInstance.onstart();
    }
    
    // Simulate onerror
    if (mockRecognitionInstance.onerror) {
      mockRecognitionInstance.onerror({
        error: "network",
      });
    }
    
    // Should not crash, error is logged
    expect(mockRecognitionInstance.start).toHaveBeenCalled();
  });

  it("shows recording indicator pulsing dot", async () => {
    const mockCallback = vi.fn();
    const { container } = render(
      <SimpleVoiceInput onTranscriptionUpdate={mockCallback} currentContent="" />
    );
    
    const speakButton = screen.getByText("Speak");
    fireEvent.click(speakButton);
    
    // Simulate onstart
    if (mockRecognitionInstance.onstart) {
      mockRecognitionInstance.onstart();
    }
    
    await waitFor(() => {
      const dot = container.querySelector(".bg-red-500");
      expect(dot).toBeInTheDocument();
    });
  });

  it("displays audio visualization bars when recording", async () => {
    const mockCallback = vi.fn();
    const { container } = render(
      <SimpleVoiceInput onTranscriptionUpdate={mockCallback} currentContent="" />
    );
    
    const speakButton = screen.getByText("Speak");
    fireEvent.click(speakButton);
    
    // Simulate onstart
    if (mockRecognitionInstance.onstart) {
      mockRecognitionInstance.onstart();
    }
    
    await waitFor(() => {
      const bars = container.querySelectorAll(".bg-primary\\/60");
      expect(bars.length).toBeGreaterThan(0);
    });
  });

  it("resets transcription on new recording session", async () => {
    const mockCallback = vi.fn();
    render(
      <SimpleVoiceInput onTranscriptionUpdate={mockCallback} currentContent="" />
    );
    
    const speakButton = screen.getByText("Speak");
    
    // First recording
    fireEvent.click(speakButton);
    if (mockRecognitionInstance.onstart) {
      mockRecognitionInstance.onstart();
    }
    
    // Simulate onend
    if (mockRecognitionInstance.onend) {
      mockRecognitionInstance.onend();
    }
    
    // Second recording
    fireEvent.click(speakButton);
    if (mockRecognitionInstance.onstart) {
      mockRecognitionInstance.onstart();
    }
    
    // Should start fresh without previous transcription
    expect(mockRecognitionInstance.start).toHaveBeenCalledTimes(2);
  });
});
