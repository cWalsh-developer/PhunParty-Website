export const API_BASE_URL = (
  import.meta.env.DEV
    ? "/api" // Use proxy during development
    : import.meta.env.VITE_API_URL || "https://api.phun.party"
).replace(/\/$/, "");
const API_KEY = import.meta.env.VITE_API_KEY;

// WebSocket URL utility
export function getWebSocketUrl(
  sessionCode: string,
  params?: Record<string, string>,
): string {
  // Prefer an explicit WebSocket host when provided via environment. This
  // allows connecting directly to a remote host (e.g. api.phun.party) or
  // falling back to same-origin so the Vite dev server can proxy `/ws`.
  const configured = (import.meta.env.VITE_WS_URL || "").toString();

  let baseUrl: string;
  const trimmed = configured.trim();
  if (trimmed) {
    if (trimmed.startsWith("http://")) {
      baseUrl = trimmed.replace(/^http:/, "ws:");
    } else if (trimmed.startsWith("https://")) {
      baseUrl = trimmed.replace(/^https:/, "wss:");
    } else if (/^wss?:\/\//i.test(trimmed)) {
      baseUrl = trimmed;
    } else {
      baseUrl = `${import.meta.env.DEV ? "ws" : "wss"}://${trimmed}`;
    }
  } else if (import.meta.env.DEV) {
    // Use same-origin in dev so the Vite server proxy can forward the upgrade
    baseUrl = `${location.protocol === "https:" ? "wss" : "ws"}://${
      location.host
    }`;
  } else {
    baseUrl = "wss://api.phun.party";
  }

  const url = new URL(`/ws/session/${sessionCode}`, baseUrl);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return url.toString();
}

// Test function to check API connection
export async function testApiConnection(): Promise<{
  status: string;
  details: any;
}> {
  try {
    // Test multiple endpoints to see what works
    const testEndpoints = [
      "/", // Root endpoint
      "/health", // Health check
      "/docs", // FastAPI docs
      "/game/", // Game endpoint
    ];

    const results = [];

    for (const endpoint of testEndpoints) {
      try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: "GET",
          headers: {
            "x-api-key": API_KEY || "",
            Accept: "application/json",
          },
        });
        const contentType = response.headers.get("content-type") || "unknown";
        const text = await response.text();

        results.push({
          endpoint,
          status: response.status,
          statusText: response.statusText,
          contentType,
          bodyPreview: text.substring(0, 200),
          isJson: contentType.includes("application/json"),
          headers: Object.fromEntries(response.headers.entries()),
        });
      } catch (error) {
        console.error(`❌ Error testing ${endpoint}:`, error);
        results.push({
          endpoint,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      status: "tested",
      details: {
        apiBaseUrl: API_BASE_URL,
        apiKeySet: !!API_KEY,
        apiKeyPreview: API_KEY ? "<redacted>" : null,
        endpointTests: results,
      },
    };
  } catch (error) {
    console.error("❌ API connection test failed:", error);
    return {
      status: "error",
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

function buildUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}

async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  parseJson = true,
): Promise<T> {
  try {
    const headers = new Headers(init.headers ?? undefined);

    if (API_KEY && !headers.has("x-api-key")) {
      headers.set("x-api-key", API_KEY);
    }

    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    // Add additional headers that might help with CORS
    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }

    const response = await fetch(buildUrl(path), { ...init, headers });

    if (!response.ok) {
      let message: string | undefined;

      try {
        message = await response.text();
      } catch {
        message = undefined;
      }

      throw new Error(
        message || `Request failed with status ${response.status}`,
      );
    }

    if (!parseJson || response.status === 204) {
      return undefined as T;
    }

    // Get response text first to handle both JSON and non-JSON responses
    const responseText = await response.text();

    // Check if response is actually JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.error("Expected JSON but received:", contentType, responseText);
      throw new Error(
        `Expected JSON response but received: ${contentType}. Response: ${responseText.substring(
          0,
          200,
        )}...`,
      );
    }

    try {
      return JSON.parse(responseText) as T;
    } catch (error) {
      console.error("JSON parse error. Response text:", responseText);
      throw new Error(
        `Failed to parse JSON response: ${error}. Response: ${responseText.substring(
          0,
          200,
        )}...`,
      );
    }
  } catch (error) {
    console.error("API fetch error:", error);
    throw error;
  }
}

export interface ScoresResponseModel {
  score_id: string;
  player_id: string;
  score: number;
  result?: string | null;
  session_code: string;
}

export interface PlayerResponse {
  player_id: string;
  player_name: string;
  player_email: string;
  player_mobile?: string | null;
  active_game_code?: string | null;
}

export interface PlayerStatusSummary {
  id: string;
  name: string;
  score?: number;
  correct?: number;
  answeredCurrent?: boolean;
}

export interface QuestionResponse {
  id: string;
  prompt: string;
  options: string[];
  answer: string | null;
  genre?: string | null;
  difficulty?: string | null;
}

export interface QuestionsAddedResponseModel {
  message: string;
  question: string;
  answer: string;
  genre: string;
  difficulty: string;
}

export interface GameResponse {
  code: string;
  name: string;
  status: string;
}

export type DidWin = "Won" | "Lost" | "Draw";

export interface GameHistory {
  session_code: string;
  game_type: string;
  did_win: DidWin;
}

export interface IsStartedResponse {
  isstarted: boolean;
}

export interface GameStatusResponse {
  session_code: string;
  game_state: "waiting" | "active" | "ended";
  isstarted: IsStartedResponse["isstarted"];
  current_question_index: number;
  total_questions: number;
  current_question: QuestionResponse | null;
  player_response_counts: {
    total: number;
    answered: number;
    waiting_for: number;
  };
  players?: PlayerStatusSummary[];
  started_at?: string | null;
  ended_at?: string | null;
}

export interface JoinGameResponse {
  message: string;
}

export interface SubmitAnswerResponse {
  player_answer: string;
  is_correct: boolean;
  game_state: Record<string, unknown>;
}

type BackendScore = {
  score_id: string;
  score: number;
  result?: string | null;
  player_id: string;
  session_code: string;
};

type BackendPlayer = {
  player_id: string;
  player_name: string;
  player_email: string;
  player_mobile?: string | null;
  hashed_password?: string;
  active_game_code?: string | null;
};

type BackendGame = {
  game_code: string;
  genre: string;
  rules: string;
  message?: string;
};

type BackendGameHistory = {
  session_code: string;
  game_type: string;
  // backend may return a boolean (legacy) or the new string value
  did_win: boolean | "Won" | "Lost" | "Draw";
};

type BackendGameSession = {
  session_code: string;
  host_name: string;
  number_of_questions: number;
  game_code: string;
  owner_player_id?: string;
};

type BackendGameStatus = {
  session_code: string;
  is_active: boolean;
  is_waiting_for_players: boolean;
  isstarted: IsStartedResponse["isstarted"];
  current_question_index: number;
  total_questions: number;
  current_question?: {
    question_id: string | null;
    question: string | null;
    genre: string | null;
    difficulty?: string | null;
    answer?: string | null;
  };
  players?: {
    total: number;
    answered: number;
    waiting_for: number;
  };
  started_at?: string | null;
  ended_at?: string | null;
};

type BackendQuestion = {
  question_id?: string | null;
  question?: string | null;
  answer?: string | null;
  genre?: string | null;
  difficulty?: string | null;
  options?: string[] | null;
  message?: string;
  question_index?: number;
  total_questions?: number;
  is_waiting_for_players?: boolean;
  is_active?: boolean;
};

type GameTypeResponse = {
  game_code: string;
  rules?: string;
  genre?: string;
};

const mapScore = (raw: BackendScore): ScoresResponseModel => ({
  score_id: raw.score_id,
  player_id: raw.player_id,
  score: raw.score ?? 0,
  result: raw.result ?? null,
  session_code: raw.session_code,
});

const mapPlayer = (raw: BackendPlayer): PlayerResponse => ({
  player_id: raw.player_id,
  player_name: raw.player_name,
  player_email: raw.player_email,
  player_mobile: raw.player_mobile ?? null,
  active_game_code: raw.active_game_code ?? null,
});

const mapGame = (raw: BackendGame): GameResponse => ({
  code: raw.game_code,
  name: raw.genre,
  status: raw.rules,
});

const mapHistory = (raw: BackendGameHistory): GameHistory => {
  let didWin: DidWin = "Draw";

  if (typeof raw.did_win === "boolean") {
    didWin = raw.did_win ? "Won" : "Lost";
  } else if (typeof raw.did_win === "string") {
    const normalized = raw.did_win.toLowerCase();
    if (normalized === "won") didWin = "Won";
    else if (normalized === "lost") didWin = "Lost";
    else didWin = "Draw";
  }

  return {
    session_code: raw.session_code,
    game_type: raw.game_type,
    did_win: didWin,
  };
};

const mapSession = (raw: BackendGameSession): GameResponse => ({
  code: raw.session_code,
  name: raw.host_name ?? raw.session_code,
  status: "waiting",
});

const mapQuestion = (raw: BackendQuestion): QuestionResponse => ({
  id: raw.question_id ?? "",
  prompt: raw.question ?? raw.message ?? "",
  options: Array.isArray(raw.options)
    ? raw.options.filter(
        (option): option is string => typeof option === "string",
      )
    : [],
  answer: raw.answer ?? null,
  genre: raw.genre ?? null,
  difficulty: raw.difficulty ?? null,
});

const mapGameStatus = (raw: BackendGameStatus): GameStatusResponse => {
  const total = raw.players?.total ?? 0;
  const answered = raw.players?.answered ?? 0;
  const waiting = raw.players?.waiting_for ?? Math.max(total - answered, 0);

  const current_question = raw.current_question?.question_id
    ? mapQuestion(raw.current_question)
    : null;

  return {
    session_code: raw.session_code,
    game_state: raw.is_active
      ? raw.isstarted
        ? "active"
        : "waiting"
      : raw.is_waiting_for_players
        ? "waiting"
        : "ended",
    isstarted: raw.isstarted,
    current_question_index: raw.current_question_index,
    total_questions: raw.total_questions,
    current_question,
    player_response_counts: {
      total,
      answered,
      waiting_for: waiting,
    },
    players: [],
    started_at: raw.started_at ?? null,
    ended_at: raw.ended_at ?? null,
  };
};

export interface CreateQuestionRequest {
  question: string;
  answer: string;
  genre: string;
  difficulty: string;
}

export interface CreatePlayerRequest {
  player_name: string;
  player_email: string;
  hashed_password: string;
  player_mobile?: string;
  game_code?: string;
}

export interface CreateGameRequest {
  genre: string;
  rules: string;
}

export interface CreateSessionRequest {
  owner_player_id?: string;
  game_code: string;
  host_name?: string;
  number_of_questions?: number;
  ispublic: boolean;
  difficulty: string;
}

export interface SubmitAnswerRequest {
  player_id: string;
  session_code: string;
  question_id: string;
  player_answer: string;
}

export interface JoinGameRequest {
  session_code: string;
  player_id: string;
  message?: string;
}

export interface LeaveGameResponse {
  message: string;
  left_session_code?: string;
}

export interface CreatePlayerRequest {
  player_name: string;
  player_email: string;
  player_mobile?: string;
  hashed_password: string;
  game_code?: string;
}

export interface PlayerUpdateRequest {
  player_name?: string;
  player_email?: string;
  player_mobile?: string;
  hashed_password?: string;
  game_code?: string;
}

export interface LoginRequest {
  player_email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
    player_id: string;
    player_name: string;
    player_email: string;
    player_mobile?: string | null;
    active_game_code?: string | null;
  };
}

export interface PasswordResetRequest {
  phone_number: string;
}

export interface PasswordVerifyRequest {
  phone_number: string;
  otp: string;
}

export interface PasswordUpdateRequest {
  phone_number: string;
  new_password: string;
}

export interface PasswordResetResponse {
  message: string;
}

export interface PasswordUpdateResponse {
  message: string;
  access_token: string;
  token_type: string;
}

export interface StartGameRequest {
  session_code: string;
  // Optional flag to indicate the host completed the tutorial intro
  // isstarted?: boolean;
}

export interface StartGameResponse {
  message: string;
  session_code: string;
  game_state: string;
}

export async function getScores(
  session_code: string,
): Promise<ScoresResponseModel[]> {
  const raw = await apiFetch<BackendScore[]>(
    `/scores/${encodeURIComponent(session_code)}`,
  );
  return raw.map(mapScore);
}

export async function createPlayer(
  data: CreatePlayerRequest,
): Promise<PlayerResponse> {
  const raw = await apiFetch<BackendPlayer>("/players/create", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return mapPlayer(raw);
}

export async function getPlayer(player_id: string): Promise<PlayerResponse> {
  const raw = await apiFetch<BackendPlayer>(
    `/players/${encodeURIComponent(player_id)}`,
  );
  return mapPlayer(raw);
}

async function getPlayerWithToken(
  player_id: string,
  token: string,
): Promise<PlayerResponse> {
  const headers = new Headers();
  if (API_KEY) {
    headers.set("x-api-key", API_KEY);
  }
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");

  const response = await fetch(
    buildUrl(`/players/${encodeURIComponent(player_id)}`),
    {
      method: "GET",
      headers,
    },
  );

  if (!response.ok) {
    let message: string | undefined;
    try {
      message = await response.text();
    } catch {
      message = undefined;
    }
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  const responseText = await response.text();
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error(`Expected JSON response but received: ${contentType}`);
  }

  const raw = JSON.parse(responseText) as BackendPlayer;
  return mapPlayer(raw);
}

export async function updatePlayer(
  player_id: string,
  data: PlayerUpdateRequest,
): Promise<PlayerResponse> {
  const raw = await apiFetch<BackendPlayer>(
    `/players/${encodeURIComponent(player_id)}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
  );
  return mapPlayer(raw);
}

export async function submitAnswer(
  data: SubmitAnswerRequest,
): Promise<SubmitAnswerResponse> {
  const payload = {
    player_id: data.player_id,
    session_code: data.session_code,
    question_id: data.question_id,
    player_answer: data.player_answer,
  };

  return apiFetch<SubmitAnswerResponse>("/game-logic/submit-answer", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getSessionStatus(
  session_code: string,
): Promise<GameStatusResponse> {
  const raw = await apiFetch<BackendGameStatus>(
    `/game-logic/status/${encodeURIComponent(session_code)}`,
  );
  return mapGameStatus(raw);
}

export async function getCurrentQuestion(
  session_code: string,
): Promise<QuestionResponse> {
  const raw = await apiFetch<BackendQuestion>(
    `/game-logic/current-question/${encodeURIComponent(session_code)}`,
  );
  return mapQuestion(raw);
}

export async function createSession(
  data: CreateSessionRequest,
): Promise<GameResponse> {
  const payload = {
    owner_player_id: data.owner_player_id,
    game_code: data.game_code,
    host_name: data.host_name ?? "Host",
    number_of_questions: data.number_of_questions ?? 5,
    difficulty: data.difficulty ?? "Easy",
  };

  const raw = await apiFetch<BackendGameSession>("/game/create/session", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const session = mapSession(raw);

  // Add the created session to user's session list
  addUserSession(session.code);

  return session;
}

// *! Wait for Endpoint ! \\
export async function getGames(player_id: string): Promise<GameHistory[]> {
  const raw = await apiFetch<BackendGameHistory[]>(
    `/game/history/${encodeURIComponent(player_id)}`,
  );
  return raw.map(mapHistory);
}

// Get unique game types (genres) from all available games
export async function getGameTypes(): Promise<GameTypeResponse[]> {
  const raw = await apiFetch<GameTypeResponse[]>("/game/");
  return raw;
}

// Get user's created sessions from localStorage
export async function getOwnedUserSessions(): Promise<GameResponse[]> {
  const stored = localStorage.getItem("auth_user");
  if (!stored) return [];

  try {
    // Fetch owned session using user id and players/allOwnedSessions/{player_id}
    const userId = JSON.parse(stored).id;
    const raw = await apiFetch<BackendGameSession[]>(
      `/players/allOwnedSessions/${encodeURIComponent(userId)}`,
    );
    return raw.map(mapSession);
  } catch (err) {
    console.error("Error loading owned user sessions:", err);
    return [];
  }
}

// Add a session to user's session list (call after creating a session)
export function addUserSession(sessionCode: string): void {
  const stored = localStorage.getItem("user_sessions");
  let sessions: string[] = [];

  if (stored) {
    try {
      sessions = JSON.parse(stored);
    } catch (err) {
      console.error("Error parsing stored sessions:", err);
    }
  }

  if (!sessions.includes(sessionCode)) {
    sessions.push(sessionCode);
    localStorage.setItem("user_sessions", JSON.stringify(sessions));
  }
}

export async function joinGameSession(
  data: JoinGameRequest,
): Promise<JoinGameResponse> {
  // Backend currently returns only { message }, but future-proof for extra fields
  const res = await apiFetch<{
    message: string;
  }>("/game/join", {
    method: "POST",
    body: JSON.stringify(data),
  });

  return {
    message: res.message,
  };
}

export async function leaveGameSession(
  player_id: string,
): Promise<LeaveGameResponse> {
  return apiFetch<LeaveGameResponse>(
    `/game/leave?player_id=${encodeURIComponent(player_id)}`,
    { method: "POST" },
  );
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  // Login endpoint doesn't require API key according to OpenAPI spec
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");

  const response = await fetch(buildUrl("/auth/login"), {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let message: string | undefined;

    try {
      const errorData = await response.json();
      message = errorData.detail || errorData.message;
    } catch {
      message = await response.text();
    }

    throw new Error(message || `Login failed with status ${response.status}`);
  }

  const responseText = await response.text();

  try {
    const parsedResponse = JSON.parse(responseText);

    // Validate the basic response structure
    if (!parsedResponse.access_token) {
      throw new Error("Login response missing access_token");
    }

    // If the response doesn't have user data, we need to fetch it separately
    if (!parsedResponse.user) {
      // Try to decode the JWT token to get the player ID
      const token = parsedResponse.access_token;
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map(function (c) {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join(""),
      );

      const decodedToken = JSON.parse(jsonPayload);

      if (!decodedToken.sub) {
        throw new Error("JWT token missing subject (player ID)");
      }

      // Fetch user data using the player ID from the token
      const playerData = await getPlayerWithToken(
        decodedToken.sub,
        parsedResponse.access_token,
      );

      // Construct the expected LoginResponse format
      const loginResponse: LoginResponse = {
        access_token: parsedResponse.access_token,
        token_type: parsedResponse.token_type,
        user: {
          player_id: playerData.player_id,
          player_name: playerData.player_name,
          player_email: playerData.player_email,
          player_mobile: playerData.player_mobile,
          active_game_code: playerData.active_game_code,
        },
      };

      return loginResponse;
    }

    // If user data is present, validate it
    if (!parsedResponse.user.player_id) {
      throw new Error("Login response user object missing player_id");
    }

    return parsedResponse as LoginResponse;
  } catch (error) {
    console.error("Login parsing/processing error:", error);
    console.error("Response text:", responseText);
    throw new Error(
      `Failed to process login response: ${
        error instanceof Error ? error.message : error
      }`,
    );
  }
}

export async function requestPasswordReset(
  data: PasswordResetRequest,
): Promise<PasswordResetResponse> {
  return apiFetch<PasswordResetResponse>("/password-reset/request", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function verifyPasswordReset(
  data: PasswordVerifyRequest,
): Promise<PasswordResetResponse> {
  return apiFetch<PasswordResetResponse>("/password-reset/verify", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updatePassword(
  data: PasswordUpdateRequest,
): Promise<PasswordUpdateResponse> {
  return apiFetch<PasswordUpdateResponse>("/password-reset/update", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function startGame(
  data: StartGameRequest,
): Promise<StartGameResponse> {
  // Backend expects a PUT with no body for start-game; body ignored if sent
  return apiFetch<StartGameResponse>(
    `/game-logic/start-game/${data.session_code}`,
    {
      method: "PUT",
      body: JSON.stringify({}),
    },
  );
}

// Game Control API Functions
export interface PauseGameRequest {
  session_code: string;
}

export interface PauseGameResponse {
  success: boolean;
  message?: string;
}

export interface ResumeGameRequest {
  session_code: string;
}

export interface ResumeGameResponse {
  success: boolean;
  message?: string;
}

export interface NextQuestionRequest {
  session_code: string;
}

export interface NextQuestionResponse {
  success: boolean;
  message?: string;
  next_question_index?: number;
}

export interface PreviousQuestionRequest {
  session_code: string;
}

export interface PreviousQuestionResponse {
  success: boolean;
  message?: string;
  previous_question_index?: number;
}

export interface EndGameRequest {
  session_code: string;
}

export interface EndGameResponse {
  success: boolean;
  message?: string;
  final_scores?: Array<{
    player_id: string;
    player_name: string;
    score: number;
  }>;
}

export async function pauseGame(
  data: PauseGameRequest,
): Promise<PauseGameResponse> {
  return apiFetch<PauseGameResponse>("/game-logic/pause", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function resumeGame(
  data: ResumeGameRequest,
): Promise<ResumeGameResponse> {
  return apiFetch<ResumeGameResponse>("/game-logic/resume", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function nextQuestion(
  data: NextQuestionRequest,
): Promise<NextQuestionResponse> {
  return apiFetch<NextQuestionResponse>("/game-logic/next-question", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function previousQuestion(
  data: PreviousQuestionRequest,
): Promise<PreviousQuestionResponse> {
  return apiFetch<PreviousQuestionResponse>("/game-logic/previous-question", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ! END GAME ROUTE DOESN'T EXIST YET IN BACKEND ! \\
export async function endGame(data: EndGameRequest): Promise<EndGameResponse> {
  // Calls new backend route /game/end-game/{session_code}
  const raw = await apiFetch<any>(
    `/game/end-game/${encodeURIComponent(data.session_code)}`,
    {
      method: "POST",
    },
  );

  // Normalize backend response to EndGameResponse
  if (raw && raw.final_results) {
    return {
      success: true,
      message: "Game ended successfully",
      final_scores: raw.final_results.map((r: any) => ({
        player_id: r.player_id,
        player_name: r.player_id, // placeholder; backend doesn't include name here
        score: r.score,
      })),
    };
  }
  return {
    success: true,
    message: raw?.message || "Game ended",
  };
}
// ! ------------------------------------------- ! \\
