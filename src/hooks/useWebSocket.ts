import { useEffect, useRef, useState, useCallback } from "react";

// Backend WebSocket message types based on your API
export interface WebSocketMessage {
  type: string;
  payload?: any;
  timestamp?: number;
}

// Specific message types from your backend
export type WebSocketMessageType =
  | "initial_state"
  | "connection_established"
  | "connection_ack"
  | "roster_update"
  | "request_roster"
  | "ping"
  | "pong"
  | "player_joined"
  | "player_left"
  | "game_started"
  | "game_ended"
  | "question_started"
  | "question_ended"
  | "player_answered"
  | "submit_answer"
  | "buzzer_press"
  | "buzzer_winner"
  | "correct_answer"
  | "incorrect_answer"
  | "ui_update"
  | "session_stats"
  | "next_question"
  | "start_game"
  | "end_game"
  | "get_session_stats"
  | "error"
  | "new_question"
  // New broadcast channel message types for Q&A
  | "qa_update"
  | "qa_question"
  | "qa_answer_submitted"
  | "broadcast_state"
  | "game_status_update";

export interface PhunPartyWebSocketMessage {
  type: WebSocketMessageType;
  data?: any;
  timestamp?: number;
}

export interface UseWebSocketOptions {
  reconnectAttempts?: number;
  reconnectInterval?: number;
  clientType?: "web" | "mobile";
  playerId?: string;
  playerName?: string;
  playerPhoto?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (message: PhunPartyWebSocketMessage) => void;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  isReconnecting: boolean;
  connectionState?:
    | "connecting"
    | "connected"
    | "disconnected"
    | "reconnecting";
  sendMessage: (message: PhunPartyWebSocketMessage) => void;
  disconnect: () => void;
  connect: () => void;
  lastMessage: PhunPartyWebSocketMessage | null;
  sessionStats: any | null;
  // Helper functions for common game actions
  submitAnswer: (answer: string, questionId: string) => void;
  pressBuzzer: () => void;
  startGame: () => void;
  nextQuestion: () => void;
  endGame: () => void;
  getSessionStats: () => void;
  sendPing: () => void;
}

const useWebSocket = (
  url: string | null,
  options: UseWebSocketOptions = {},
): UseWebSocketReturn => {
  const {
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    clientType = "web",
    playerId,
    playerName,
    playerPhoto,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  // Additional explicit connection state string for UI if needed
  // 'connecting' | 'connected' | 'disconnected' | 'reconnecting'
  const [connectionState, setConnectionState] = useState<
    "connecting" | "connected" | "disconnected" | "reconnecting"
  >(url ? "connecting" : "disconnected");
  const [lastMessage, setLastMessage] =
    useState<PhunPartyWebSocketMessage | null>(null);
  const [sessionStats, setSessionStats] = useState<any | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);
  const shouldReconnectRef = useRef(true);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const baseReconnectDelayRef = useRef(reconnectInterval);

  const connect = useCallback(() => {
    if (!url) {
      return;
    }

    // Prevent connecting if socket is still closing (race condition)
    if (
      wsRef.current?.readyState === WebSocket.CONNECTING ||
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CLOSING
    ) {
      // Optionally log for diagnostics
      // console.warn("WebSocket is still closing; connect() aborted.");
      return;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      // Manual reconnects should restore automatic reconnect behavior.
      shouldReconnectRef.current = true;
      setConnectionState("connecting");
      setIsReconnecting(reconnectCountRef.current > 0);

      // Build WebSocket URL with query parameters for backend
      const wsUrl = new URL(url);
      wsUrl.searchParams.set("client_type", clientType);

      if (clientType === "mobile" && playerId) {
        wsUrl.searchParams.set("player_id", playerId);
        if (playerName) wsUrl.searchParams.set("player_name", playerName);
        if (playerPhoto) wsUrl.searchParams.set("player_photo", playerPhoto);
      }

      wsRef.current = new WebSocket(wsUrl.toString());

      wsRef.current.onopen = () => {
        // Note: backend will send a 'connection_established' message with details
        // but at socket-level open we can mark the socket as open.
        setIsConnected(true);
        setIsReconnecting(false);
        setConnectionState("connected");
        reconnectCountRef.current = 0;
        onConnect?.();

        // For mobile clients, send an explicit "announce" message after connection
        // to ensure the backend broadcasts player_joined to all web clients
        if (clientType === "mobile" && playerId && playerName) {
          try {
            const announceMessage = {
              type: "player_announce",
              data: {
                player_id: playerId,
                player_name: playerName,
                player_photo: playerPhoto,
                timestamp: new Date().toISOString(),
              },
            };
            // Small delay to ensure backend connection handler completes
            setTimeout(() => {
              if (
                wsRef.current &&
                wsRef.current.readyState === WebSocket.OPEN
              ) {
                wsRef.current.send(JSON.stringify(announceMessage));
              }
            }, 150);
          } catch (e) {
            console.warn("Failed to send player_announce:", e);
          }
        }

        // start heartbeat here in case backend doesn't send an initial message
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        heartbeatIntervalRef.current = setInterval(() => {
          try {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: "ping" }));
            }
          } catch (e) {
            // ignore send errors
          }
        }, 15000); // 15s heartbeat
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        onDisconnect?.();

        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        // Auto-reconnect if enabled and within limits
        if (shouldReconnectRef.current) {
          if (reconnectCountRef.current < reconnectAttempts) {
            reconnectCountRef.current++;
            setIsReconnecting(true);
            setConnectionState("reconnecting");

            // Exponential backoff with cap
            const delay = Math.min(
              baseReconnectDelayRef.current * 2 ** reconnectCountRef.current,
              10000,
            );

            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          } else {
            // Give up
            setIsReconnecting(false);
            setConnectionState("disconnected");
            shouldReconnectRef.current = false;
          }
        } else {
          setIsReconnecting(false);
          setConnectionState("disconnected");
        }
      };

      wsRef.current.onerror = (error) => {
        // Keep flags minimal here; onclose will handle reconnect logic
        setIsConnected(false);
        onError?.(error as Event);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: PhunPartyWebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);

          // Handle special message types
          if (message.type === "session_stats") {
            setSessionStats(message.data);
          } else if (message.type === "pong") {
            // Handle heartbeat response
            // we can use this to confirm connection health
            console.debug("WebSocket heartbeat received");
            // when a pong arrives ensure state flags are healthy
            setIsConnected(true);
            setIsReconnecting(false);
            setConnectionState("connected");
          } else if (message.type === "connection_established") {
            // Backend explicitly confirmed connection and provided ws id / player info
            setIsConnected(true);
            setIsReconnecting(false);
            setConnectionState("connected");
          }

          onMessage?.(message);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
    }
  }, [
    url,
    clientType,
    playerId,
    playerName,
    playerPhoto,
    reconnectAttempts,
    reconnectInterval,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
  ]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    // stop pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // clear heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {
        // ignore
      }
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsReconnecting(false);
    setConnectionState("disconnected");
    reconnectCountRef.current = 0;
  }, []);

  const sendMessage = useCallback((message: PhunPartyWebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(
          JSON.stringify({
            ...message,
            timestamp: message.timestamp || Date.now(),
          }),
        );
      } catch (error) {
        console.error("Failed to send WebSocket message:", error);
      }
    }
  }, []);

  // Heartbeat/ping functionality
  const sendPing = useCallback(() => {
    sendMessage({ type: "ping" });
  }, [sendMessage]);

  // Helper functions for common messages
  const submitAnswer = useCallback(
    (answer: string, questionId: string) => {
      sendMessage({
        type: "submit_answer",
        data: { answer, question_id: questionId },
      });
    },
    [sendMessage],
  );

  const pressBuzzer = useCallback(() => {
    sendMessage({ type: "buzzer_press" });
  }, [sendMessage]);

  const startGame = useCallback(() => {
    sendMessage({ type: "start_game" });
  }, [sendMessage]);

  const nextQuestion = useCallback(() => {
    sendMessage({ type: "next_question" });
  }, [sendMessage]);

  const endGame = useCallback(() => {
    sendMessage({ type: "end_game" });
  }, [sendMessage]);

  const getSessionStats = useCallback(() => {
    sendMessage({ type: "get_session_stats" });
  }, [sendMessage]);

  useEffect(() => {
    if (url) {
      shouldReconnectRef.current = true;
      connect();
    }

    return () => {
      disconnect();
    };
  }, [url, connect, disconnect]);

  // Set up heartbeat
  useEffect(() => {
    // Heartbeat is now started/stopped on socket open/close, but keep a
    // fallback here: if connected and no heartbeat running, start one.
    if (isConnected && !heartbeatIntervalRef.current) {
      heartbeatIntervalRef.current = setInterval(() => {
        sendPing();
      }, 15000);
    }

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [isConnected, sendPing]);

  return {
    isConnected,
    isReconnecting,
    connectionState,
    sendMessage,
    disconnect,
    connect,
    lastMessage,
    sessionStats,
    // Helper functions
    submitAnswer,
    pressBuzzer,
    startGame,
    nextQuestion,
    endGame,
    getSessionStats,
    sendPing,
  };
};

export default useWebSocket;
