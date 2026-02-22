import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Card from "@/components/Card";
import QR from "@/components/QR";
import { LoadingSpinner } from "@/components/Loading";
import { getSessionStatus } from "@/lib/api";
import { LoadingState, LoadingButton } from "@/components/Loading";
import ConnectionIndicator from "@/components/ConnectionIndicator";
import useGameUpdates from "@/hooks/useGameUpdates";
import WebSocketStatus from "@/components/WebSocketStatus";
import { useToast } from "@/contexts/ToastContext";
import { RotateCw } from "lucide-react";

export default function SessionWaitingRoom() {
        const { sessionCode } = useParams();
        const navigate = useNavigate();
        const { showError, showSuccess } = useToast();
        const [isStarting, setIsStarting] = useState(false);
        const [isLoadingRoster, setIsLoadingRoster] = useState(true);

        const {
                game_status,
                isConnected,
                connectedPlayers,
                startGame: wsStartGame,
                requestRoster,
        } = useGameUpdates({
                sessionCode: sessionCode || "",
                pollInterval: 3000,
                enableWebSocket: true,
        });

        // Request roster when WebSocket connects
        useEffect(() => {
                if (isConnected && requestRoster) {
                        // Give the server a moment to prepare
                        const timer = setTimeout(() => {
                                requestRoster();
                        }, 100);
                        return () => clearTimeout(timer);
                }
        }, [isConnected, requestRoster]);

        // Mark roster as loaded when we receive players
        useEffect(() => {
                if (
                        connectedPlayers.length > 0 ||
                        (isConnected && game_status)
                ) {
                        setIsLoadingRoster(false);
                }
        }, [connectedPlayers.length, isConnected, game_status]);

        // We intentionally do NOT auto-redirect anymore so the host can wait even if backend marks session active.

        if (!game_status) {
                return (
                        <main className="max-w-4xl mx-auto px-4 py-8">
                                <Card className="p-6">
                                        <LoadingState message="Loading session..." />
                                </Card>
                        </main>
                );
        }

        const joinUrl = `${window.location.origin}/#/join/${sessionCode}`;

        const handleStart = async () => {
                if (!sessionCode) return;

                // Validate that we have players before starting
                if (connectedPlayers.length === 0) {
                        showError(
                                "Cannot start game: No players have joined yet. Please wait for at least one player to scan the QR code."
                        );
                        return;
                }

                // Check if WebSocket player count matches backend count
                const backendPlayerCount =
                        game_status?.player_response_counts?.total || 0;
                const wsPlayerCount = connectedPlayers.length;

                if (
                        backendPlayerCount > wsPlayerCount &&
                        backendPlayerCount > 0
                ) {
                        showError(
                                `Player sync in progress (${wsPlayerCount}/${backendPlayerCount} ready). Please wait a moment...`
                        );
                        // Wait for sync and retry
                        setTimeout(() => {
                                if (
                                        connectedPlayers.length <
                                        backendPlayerCount
                                ) {
                                        showError(
                                                "Some players may not be fully connected. Starting anyway..."
                                        );
                                }
                        }, 2000);
                        return;
                }

                setIsStarting(true);
                try {
                        // Do NOT start the backend game yet; navigate to intro screen first
                        showSuccess(
                                `Launching tutorial with ${wsPlayerCount} player(s)...`
                        );
                        // Send WebSocket start signal BEFORE navigation to avoid unmount race
                        try {
                                wsStartGame();
                                // Wait a moment to ensure the WebSocket message is fully sent before navigating
                                await new Promise((resolve) =>
                                        setTimeout(resolve, 200)
                                );
                        } catch (e) {
                                console.warn(
                                        "Failed to send start_game WS message early",
                                        e
                                );
                        }
                        navigate(`/play/${sessionCode}?intro=1`);
                } catch (e: any) {
                        showError(e.message || "Failed to launch intro");
                } finally {
                        setIsStarting(false);
                }
        };

        return (
                <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
                        <Card className="p-6">
                                <div className="flex flex-col md:flex-row md:items-start gap-8">
                                        <div className="flex-1 space-y-4">
                                                <h2 className="text-2xl font-semibold">
                                                        Session Waiting Room
                                                </h2>
                                                <p className="text-stone-400 text-sm">
                                                        Share the QR code or
                                                        link below. Players will
                                                        appear as they join.
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-stone-500">
                                                        <ConnectionIndicator size="sm" />
                                                        <WebSocketStatus
                                                                isConnected={
                                                                        isConnected
                                                                }
                                                                className="text-stone-400"
                                                        />
                                                </div>
                                                <div className="grid md:grid-cols-2 gap-4">
                                                        <div>
                                                                <div className="font-medium text-stone-300 mb-1">
                                                                        Session
                                                                        Code
                                                                </div>
                                                                <div className="px-4 py-3 bg-ink-800 rounded-xl font-mono tracking-wider text-lg">
                                                                        {
                                                                                sessionCode
                                                                        }
                                                                </div>
                                                        </div>
                                                        <div>
                                                                <div className="font-medium text-stone-300 mb-1">
                                                                        Players
                                                                </div>
                                                                <div className="px-4 py-3 bg-ink-800 rounded-xl">
                                                                        {
                                                                                connectedPlayers.length
                                                                        }
                                                                </div>
                                                        </div>
                                                </div>
                                                <div>
                                                        <div className="font-medium text-stone-300 mb-2">
                                                                Share Link
                                                        </div>
                                                        <div className="px-4 py-3 bg-ink-800 rounded-xl text-xs break-all">
                                                                {joinUrl}
                                                        </div>
                                                </div>
                                                {game_status.game_state ===
                                                "active" ? (
                                                        <div className="space-y-3">
                                                                <div className="p-3 bg-ink-800 rounded-xl text-sm text-tea-400 border border-tea-500/20">
                                                                        Game
                                                                        already
                                                                        marked
                                                                        active.
                                                                        You can
                                                                        enter
                                                                        the live
                                                                        quiz.
                                                                </div>
                                                                <LoadingButton
                                                                        onClick={() =>
                                                                                navigate(
                                                                                        `/play/${sessionCode}?intro=1`
                                                                                )
                                                                        }
                                                                        isLoading={
                                                                                false
                                                                        }
                                                                        className="px-6 py-3"
                                                                >
                                                                        Enter
                                                                        Game
                                                                </LoadingButton>
                                                        </div>
                                                ) : (
                                                        <div className="space-y-3">
                                                                <LoadingButton
                                                                        onClick={
                                                                                handleStart
                                                                        }
                                                                        isLoading={
                                                                                isStarting
                                                                        }
                                                                        loadingText="Starting..."
                                                                        className="px-6 py-3"
                                                                        disabled={
                                                                                connectedPlayers.length ===
                                                                                0
                                                                        }
                                                                >
                                                                        Start
                                                                        Game
                                                                </LoadingButton>
                                                        </div>
                                                )}
                                        </div>
                                        <div className="w-56 self-start">
                                                {isConnected ? (
                                                        <QR value={joinUrl} />
                                                ) : (
                                                        <div className="w-56 h-56 bg-ink-800 rounded-xl flex items-center justify-center">
                                                                <div className="text-center space-y-2">
                                                                        <LoadingSpinner size="md" />
                                                                        <div className="text-sm text-stone-400">
                                                                                Preparing
                                                                                session...
                                                                        </div>
                                                                </div>
                                                        </div>
                                                )}
                                        </div>
                                </div>
                        </Card>
                        <Card className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold">
                                                Players Joined
                                        </h3>
                                        {isConnected && requestRoster && (
                                                <button
                                                        onClick={() =>
                                                                requestRoster()
                                                        }
                                                        className="text-xs text-tea-400 hover:text-tea-300 transition-colors"
                                                        title="Refresh player list"
                                                >
                                                        <RotateCw className="inline-block w-4 h-4 mr-1 animate-spin-slow" />
                                                        Refresh
                                                </button>
                                        )}
                                </div>

                                <div className="space-y-2 max-h-80 overflow-y-auto">
                                        {isLoadingRoster ? (
                                                <div className="text-stone-400 text-sm text-center py-6">
                                                        <LoadingSpinner
                                                                size="sm"
                                                                className="mx-auto mb-2"
                                                        />
                                                        <div>
                                                                Waiting for
                                                                players to
                                                                join...
                                                        </div>
                                                </div>
                                        ) : (
                                                <>
                                                        {/* Show actual connected players */}
                                                        {connectedPlayers.map(
                                                                (p) => (
                                                                        <div
                                                                                key={
                                                                                        p.player_id
                                                                                }
                                                                                className="px-4 py-2 bg-ink-800 rounded-xl flex justify-between items-center"
                                                                        >
                                                                                <span>
                                                                                        {p.player_name ||
                                                                                                p.player_id}
                                                                                </span>
                                                                                {p.connected_at && (
                                                                                        <span className="text-xs text-tea-400">
                                                                                                ✓
                                                                                                Ready
                                                                                        </span>
                                                                                )}
                                                                        </div>
                                                                )
                                                        )}

                                                        {connectedPlayers.length ===
                                                                0 &&
                                                                game_status
                                                                        ?.player_response_counts
                                                                        ?.total ===
                                                                        0 && (
                                                                        <div className="text-stone-500 text-sm text-center py-6">
                                                                                No
                                                                                players
                                                                                yet...
                                                                                Share
                                                                                the
                                                                                QR
                                                                                code
                                                                                to
                                                                                get
                                                                                started!
                                                                        </div>
                                                                )}
                                                </>
                                        )}
                                </div>
                        </Card>
                </main>
        );
}
