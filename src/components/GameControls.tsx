import React, { useState } from "react";
import { LoadingButton } from "@/components/Loading";
import { useToast } from "@/contexts/ToastContext";

interface GameControlsProps {
    isPaused?: boolean;
    canGoNext?: boolean;
    canGoPrevious?: boolean;
    isLoading?: boolean;
    onPause?: () => Promise<void>;
    onResume?: () => Promise<void>;
    onNextQuestion?: () => Promise<void>;
    onPreviousQuestion?: () => Promise<void>;
    onEndGame?: () => Promise<void>;
    totalQuestions?: number;
    currentQuestion?: number;
}

export default function GameControls({
    isPaused = false,
    canGoNext = true,
    canGoPrevious = false,
    isLoading = false,
    onPause,
    onResume,
    onNextQuestion,
    onPreviousQuestion,
    onEndGame,
    totalQuestions,
    currentQuestion,
}: GameControlsProps) {
    const [showEndDialog, setShowEndDialog] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const { showError } = useToast();

    const handleAction = async (
        action: string,
        handler?: () => Promise<void>
    ) => {
        if (!handler) return;

        setActionLoading(action);
        try {
            await handler();
        } catch (error) {
            showError(`Failed to ${action.toLowerCase()}. Please try again.`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleEndGame = async () => {
        if (onEndGame) {
            await handleAction("end game", onEndGame);
            setShowEndDialog(false);
        }
    };

    return (
        <>
            <div className="flex items-center gap-3 p-4 bg-ink-800 rounded-xl">
                {/* Pause/Resume Control */}
                <div className="flex items-center gap-2">
                    {isPaused ? (
                        <LoadingButton
                            onClick={() => handleAction("resume", onResume)}
                            isLoading={actionLoading === "resume"}
                            disabled={isLoading}
                            variant="primary"
                            className="px-4 py-2"
                        >
                            ▶️ Resume
                        </LoadingButton>
                    ) : (
                        <LoadingButton
                            onClick={() => handleAction("pause", onPause)}
                            isLoading={actionLoading === "pause"}
                            disabled={isLoading}
                            variant="secondary"
                            className="px-4 py-2"
                        >
                            ⏸️ Pause
                        </LoadingButton>
                    )}
                </div>

                {/* Question Navigation */}
                <div className="flex items-center gap-2">
                    <LoadingButton
                        onClick={() =>
                            handleAction("previous", onPreviousQuestion)
                        }
                        isLoading={actionLoading === "previous"}
                        disabled={!canGoPrevious || isLoading || isPaused}
                        variant="ghost"
                        className="px-3 py-2"
                    >
                        ⏮️ Prev
                    </LoadingButton>

                    <div className="px-3 py-2 bg-ink-700 rounded-lg text-sm font-medium">
                        {currentQuestion && totalQuestions
                            ? `${currentQuestion}/${totalQuestions}`
                            : "--/--"}
                    </div>

                    <LoadingButton
                        onClick={() => handleAction("next", onNextQuestion)}
                        isLoading={actionLoading === "next"}
                        disabled={!canGoNext || isLoading || isPaused}
                        variant="primary"
                        className="px-3 py-2"
                    >
                        Next ⏭️
                    </LoadingButton>
                </div>

                {/* End Game Control */}
                <div className="ml-auto">
                    <LoadingButton
                        onClick={() => setShowEndDialog(true)}
                        disabled={isLoading}
                        variant="ghost"
                        className="px-4 py-2 text-red-400 hover:bg-red-900/20"
                    >
                        🏁 End Game
                    </LoadingButton>
                </div>
            </div>

            {/* Game Status Indicator */}
            {isPaused && (
                <div className="mt-2 px-4 py-2 bg-orange-900/30 border border-orange-500/30 rounded-lg text-orange-200 text-sm flex items-center gap-2">
                    <span className="animate-pulse">⏸️</span>
                    <span>Game is paused. Players cannot submit answers.</span>
                </div>
            )}

            {/* End Game Confirmation Dialog */}
            {showEndDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-ink-800 rounded-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold mb-2">
                            End Game?
                        </h3>
                        <p className="text-stone-300 mb-4">
                            Are you sure you want to end this game? This will
                            finalize all scores and show the results to players.
                        </p>
                        <p className="text-sm text-stone-400 mb-6">
                            Current progress: Question {currentQuestion} of{" "}
                            {totalQuestions}
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowEndDialog(false)}
                                className="px-4 py-2 bg-ink-700 rounded-lg hover:bg-ink-600 transition-colors"
                                disabled={actionLoading === "end game"}
                            >
                                Cancel
                            </button>
                            <LoadingButton
                                onClick={handleEndGame}
                                isLoading={actionLoading === "end game"}
                                variant="primary"
                                className="px-4 py-2 bg-red-600 hover:bg-red-700"
                            >
                                End Game
                            </LoadingButton>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
