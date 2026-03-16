import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Join from "@/pages/Join";
import type { UseGameUpdatesReturn } from "@/hooks/useGameUpdates";

const { mockUseGameUpdates } = vi.hoisted(() => ({
  mockUseGameUpdates: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return {
    ...actual,
    useParams: () => ({ sessionId: "ROOM123" }),
  };
});

vi.mock("@/hooks/useGameUpdates", () => ({
  __esModule: true,
  default: mockUseGameUpdates,
}));

vi.mock("@/contexts/ToastContext", () => ({
  __esModule: true,
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showInfo: vi.fn(),
    showWarning: vi.fn(),
    showToast: vi.fn(),
    dismissToast: vi.fn(),
  }),
}));

vi.mock("@/hooks/useTouchGestures", () => ({
  __esModule: true,
  useTouchGestures: () => ({
    attachGestures: () => () => {},
    isRefreshing: false,
    pullDistance: 0,
  }),
  useTouchButton: () => ({
    buttonProps: { className: "" },
  }),
  haptic: {
    success: vi.fn(),
    medium: vi.fn(),
  },
}));

vi.mock("@/hooks/useWebSocketGameControls", () => ({
  __esModule: true,
  useWebSocketGameControls: () => ({
    submitAnswer: vi.fn(),
    pressBuzzer: vi.fn(),
  }),
}));

const joinGameSessionMock = vi.fn().mockResolvedValue({});
const getCurrentQuestionMock = vi.fn();

vi.mock("@/lib/api", () => ({
  __esModule: true,
  joinGameSession: (...args: any[]) => joinGameSessionMock(...args),
  submitAnswer: vi.fn(),
  getSessionStatus: vi.fn(),
  getCurrentQuestion: (...args: any[]) => getCurrentQuestionMock(...args),
  createPlayer: vi.fn(),
  leaveGameSession: vi.fn(),
}));

function makeUseGameUpdatesReturn(
  overrides: Partial<UseGameUpdatesReturn>,
): UseGameUpdatesReturn {
  return {
    game_status: {
      session_code: "ROOM123",
      game_state: "active",
      isstarted: false,
      current_question_index: 0,
      total_questions: 3,
      current_question: null,
      player_response_counts: { total: 0, answered: 0, waiting_for: 0 },
      players: [],
      started_at: null,
      ended_at: null,
    },
    game_state: null,
    isConnected: true,
    isLoading: false,
    error: null,
    lastUpdate: null,
    refetch: vi.fn(),
    connectedPlayers: [],
    sendMessage: vi.fn(),
    startGame: vi.fn(),
    nextQuestion: vi.fn(),
    endGame: vi.fn(),
    submitAnswer: vi.fn(),
    pressBuzzer: vi.fn(),
    ...overrides,
  } as UseGameUpdatesReturn;
}

beforeEach(() => {
  mockUseGameUpdates.mockReset();
  joinGameSessionMock.mockClear();
  getCurrentQuestionMock.mockReset();
  // Seed localStorage with a fake player so Join() can proceed
  localStorage.setItem("auth_user", JSON.stringify({ id: "player-1" }));
});

afterEach(() => {
  localStorage.clear();
});

describe("Join page WS-first flows", () => {
  it("does not show WS question before game is officially started", async () => {
    mockUseGameUpdates.mockReturnValue(
      makeUseGameUpdatesReturn({
        // REST still says not started
        game_status: {
          session_code: "ROOM123",
          game_state: "active",
          isstarted: false,
          current_question_index: 0,
          total_questions: 3,
          current_question: null,
          player_response_counts: {
            total: 0,
            answered: 0,
            waiting_for: 0,
          },
          players: [],
          started_at: null,
          ended_at: null,
        },
        // WS provides the current question
        game_state: {
          sessionCode: "ROOM123",
          gameType: "trivia",
          isActive: true,
          currentQuestion: {
            question_id: "q1",
            question: "WS Prompt arrives early",
            difficulty: "Medium",
            display_options: ["A", "B", "C", "D"],
            correct_index: 1,
          },
          connectedPlayers: [],
          game_state: null,
        },
      }),
    );

    render(<Join />);

    // Enter name and click Join to flip to post-join UI
    fireEvent.change(screen.getByPlaceholderText(/enter your name/i), {
      target: { value: "Alice" },
    });
    fireEvent.click(screen.getByRole("button", { name: /join game/i }));

    // The WS question should NOT render before official game start.
    await waitFor(() =>
      expect(
        screen.getByText(/waiting for host to start the game/i),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByText(/WS Prompt arrives early/i)).toBeNull();
  });

  it("falls back to REST current question when WS question is absent and game started", async () => {
    // No WS question
    mockUseGameUpdates.mockReturnValue(
      makeUseGameUpdatesReturn({
        game_status: {
          session_code: "ROOM123",
          game_state: "active",
          isstarted: true,
          current_question_index: 0,
          total_questions: 2,
          current_question: null,
          player_response_counts: {
            total: 0,
            answered: 0,
            waiting_for: 0,
          },
          players: [],
          started_at: null,
          ended_at: null,
        },
        game_state: null,
      }),
    );

    // REST returns a question
    getCurrentQuestionMock.mockResolvedValue({
      id: "rest-q1",
      prompt: "REST provided prompt",
      options: ["X", "Y", "Z"],
      answer: "Y",
      difficulty: "Medium",
    });

    render(<Join />);

    // Enter name and click Join to flip to post-join UI
    fireEvent.change(screen.getByPlaceholderText(/enter your name/i), {
      target: { value: "Bob" },
    });
    fireEvent.click(screen.getByRole("button", { name: /join game/i }));

    // The REST question should appear
    await waitFor(() =>
      expect(screen.getByText(/REST provided prompt/i)).toBeInTheDocument(),
    );
  });
});
