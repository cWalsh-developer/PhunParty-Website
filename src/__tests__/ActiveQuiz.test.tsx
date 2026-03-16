import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import ActiveQuiz from "@/pages/ActiveQuiz";
import type { UseGameUpdatesReturn } from "@/hooks/useGameUpdates";
import type { GameStatusResponse } from "@/lib/api";

const navigateMock = vi.fn();
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
    useParams: () => ({ sessionId: "ABC123" }),
    useNavigate: () => navigateMock,
    useLocation: () => ({ search: "" }),
  };
});

vi.mock("@/hooks/useGameUpdates", () => ({
  __esModule: true,
  default: mockUseGameUpdates,
}));

vi.mock("@/hooks/useTouchGestures", () => ({
  useTouchGestures: () => ({
    attachGestures: () => () => {},
    isRefreshing: false,
    pullDistance: 0,
  }),
}));

vi.mock("@/hooks/useWebSocketGameControls", () => ({
  useWebSocketGameControls: () => ({
    nextQuestion: vi.fn(),
    endGame: vi.fn(),
    startGame: vi.fn(),
    getSessionStats: vi.fn(),
    submitAnswer: vi.fn(),
    pressBuzzer: vi.fn(),
  }),
}));

vi.mock("@/contexts/ToastContext", () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

vi.mock("@/components/Timer", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("@/components/Card", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
}));

vi.mock("@/components/GameControls", () => ({
  __esModule: true,
  default: () => <div data-testid="game-controls" />,
}));

vi.mock("@/components/GameStateIndicator", () => ({
  __esModule: true,
  default: () => <div data-testid="game-state" />,
}));

vi.mock("@/components/ConnectionIndicator", () => ({
  __esModule: true,
  default: () => <div data-testid="connection-indicator" />,
}));

vi.mock("@/components/WebSocketStatus", () => ({
  __esModule: true,
  default: () => <div data-testid="ws-status" />,
}));

vi.mock("@/components/WebSocketDiagnostics", () => ({
  __esModule: true,
  default: () => <div data-testid="ws-diagnostics" />,
}));

vi.mock("@/components/Loading", () => ({
  __esModule: true,
  LoadingState: ({ message }: { message: string }) => (
    <div data-testid="loading">{message}</div>
  ),
}));

vi.mock("@/lib/api", () => ({
  __esModule: true,
  getSessionStatus: vi.fn(),
  getCurrentQuestion: vi.fn().mockResolvedValue(null),
  pauseGame: vi.fn().mockResolvedValue({ success: true }),
  resumeGame: vi.fn().mockResolvedValue({ success: true }),
  nextQuestion: vi.fn().mockResolvedValue({ success: true }),
  previousQuestion: vi.fn().mockResolvedValue({ success: true }),
  endGame: vi.fn().mockResolvedValue({ success: true }),
  startGame: vi.fn().mockResolvedValue({ success: true }),
}));

const baseGameStatus: GameStatusResponse = {
  session_code: "ABC123",
  game_state: "active" as const,
  isstarted: true,
  current_question_index: 0,
  total_questions: 1,
  current_question: null,
  player_response_counts: {
    total: 0,
    answered: 0,
    waiting_for: 0,
  },
  players: [],
  started_at: null,
  ended_at: null,
};

const createGameUpdatesReturn = (
  overrides: Partial<UseGameUpdatesReturn> = {},
): UseGameUpdatesReturn => ({
  game_status: { ...baseGameStatus },
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
});

beforeEach(() => {
  navigateMock.mockReset();
  mockUseGameUpdates.mockReset();
});

describe("ActiveQuiz navigation", () => {
  it("navigates to stats when the game is completed", async () => {
    mockUseGameUpdates.mockReturnValue(
      createGameUpdatesReturn({
        game_status: {
          ...baseGameStatus,
          game_state: "ended" as const,
        },
      }),
    );

    render(<ActiveQuiz />);

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/stats/ABC123/", {
        replace: true,
      });
    });
  });

  it("does not navigate when the game remains active", async () => {
    mockUseGameUpdates.mockReturnValue(
      createGameUpdatesReturn({
        game_status: {
          ...baseGameStatus,
          game_state: "active" as const,
        },
      }),
    );

    render(<ActiveQuiz />);

    await waitFor(() => {
      expect(navigateMock).not.toHaveBeenCalled();
    });
  });
});
