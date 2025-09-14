import WebSocket from "ws";
import { randomUUID } from "crypto";
import type {
  EventKind,
  EventPayload,
  EventPayloadMap,
  ServerMessage,
  EnvelopeRes,
  EnvelopeErr,
  EnvelopeEvt,
  CmdCommandDispatch,
  CmdCommandRegister,
  CmdCommandUnregister,
  CmdEntitySpawn,
  CmdEntitySpawnRes,
  CmdGuiOpen,
  CmdGuiOpenRes,
  CmdGuiUpdateSlots,
  CmdPlayerGive,
  CmdPlayerSendMessage,
  CmdRecipeUpsertShaped,
  TPlayer,
  CmdPlayerGet,
  CmdChatBroadcast,
  CmdChatSetMode,
} from "./schemas";
import { factoryRegistry } from "./factories";
import type { Player } from "./classes/Player";

type Listener<K extends EventKind> = (payload: EventPayload<K>) => void;

export class Bridge {
  private ws?: WebSocket;
  private pending = new Map<
    string,
    (msg: Extract<ServerMessage, { t: "res" | "err" }>) => void
  >();
  private listeners = new Map<EventKind, Listener<EventKind>[]>();

  // reconnect state
  private reconnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private backoffMs = 500;
  private maxBackoffMs = 5000;
  private heartbeatInterval?: NodeJS.Timeout;
  private lastPong = Date.now();

  private url: string;

  constructor(url = "ws://127.0.0.1:3001") {
    this.url = url;
    this.connect();
  }

  private connect() {
    try {
      this.ws = new WebSocket(this.url);
      this.ws.on("open", () => {
        console.log("[bridge] connected");
        this.reconnecting = false;
        this.reconnectAttempts = 0;
        this.backoffMs = 500;
        this.send({ t: "hello", protocolVersion: 1 });
        this.startHeartbeat();
        this.readyResolvers.splice(0).forEach((fn) => fn());
      });
      this.ws.on("message", (buf) => this.onMessage(String(buf)));
      this.ws.on("pong", () => (this.lastPong = Date.now()));
      this.ws.on("close", () => this.scheduleReconnect("close"));
      this.ws.on("error", (e) => {
        console.error("[bridge] ws error", e);
        this.scheduleReconnect("error");
      });
    } catch (e) {
      console.error("[bridge] error during connection setup:", e);
      this.scheduleReconnect("error");
    }
  }

  private readyResolvers: (() => void)[] = [];
  async ready() {
    if (this.ws && this.ws.readyState === this.ws.OPEN) return;
    await new Promise<void>((res) => this.readyResolvers.push(res));
  }

  // internal
  private scheduleReconnect(reason: "close" | "error") {
    this.stopHeartbeat();
    if (this.reconnecting) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[bridge] max reconnection attempts reached, giving up");
      return;
    }

    this.reconnecting = true;
    this.reconnectAttempts++;
    const delay = this.backoffMs;

    console.warn(
      `[bridge] reconnecting (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}) after ${reason} in ${delay}ms...`
    );

    setTimeout(() => {
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.connect();
      }
      this.backoffMs = Math.min(this.backoffMs * 2, this.maxBackoffMs);
    }, delay);
  }

  private startHeartbeat() {
    this.lastPong = Date.now();
    this.heartbeatInterval = setInterval(() => {
      if (!this.ws || this.ws.readyState !== this.ws.OPEN) return;
      if (Date.now() - this.lastPong > 20_000) {
        console.warn("[bridge] heartbeat timeout; forcing reconnect");
        try {
          this.ws.terminate();
        } catch {}
        return;
      }
      try {
        this.ws.ping();
      } catch {}
    }, 5000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = undefined;
  }

  private send(m: ServerMessage) {
    this.ws?.send(JSON.stringify(m));
  }

  private async onMessage(text: string) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      console.error("[bridge] invalid JSON", text, e);
      return;
    }

    if (!parsed || typeof parsed !== "object" || !("t" in parsed)) {
      console.error("[bridge] invalid message format", parsed);
      return;
    }

    const message = parsed as ServerMessage;

    if (message.t === "evt") {
      const evt = message as EnvelopeEvt<EventKind>;
      const kind = evt.kind;

      try {
        if (kind === "Player.Join" || kind === "Player.Chat") {
          if ("player" in evt.payload) {
            const player = await factoryRegistry.create<Player>(
              "player",
              this,
              (evt.payload as any).player
            );
            if (player) {
              (evt as any).payload = { ...(evt.payload as object), player };
            }
          }
        }

        const handlers = this.listeners.get(kind);
        if (handlers) {
          for (const handler of handlers) {
            try {
              await (handler as any)(evt.payload);
            } catch (e) {
              console.error(`[bridge] error in handler for ${kind}:`, e);
            }
          }
        }
      } catch (e) {
        console.error(`[bridge] error processing event ${kind}:`, e);
      }
      return;
    }

    if (message.t === "res" || message.t === "err") {
      const cb = this.pending.get((message as EnvelopeRes | EnvelopeErr).id);
      if (cb) {
        this.pending.delete((message as EnvelopeRes | EnvelopeErr).id);
        cb(message as EnvelopeRes | EnvelopeErr);
      }
      return;
    }
  }

  private cmd<T = unknown>(kind: string, payload: unknown): Promise<T> {
    const id = randomUUID();
    const msg: ServerMessage = { t: "cmd", id, kind, payload };
    this.send(msg);

    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, (reply) => {
        if (reply.t === "res") {
          resolve(reply.payload as T);
        } else if (reply.t === "err") {
          reject(
            new Error(`${reply.payload.code}: ${reply.payload.message ?? ""}`)
          );
        }
      });
    });
  }

  // public api
  on<K extends EventKind>(
    kind: K,
    fn: (payload: EventPayload<K>) => void
  ): void {
    const arr = this.listeners.get(kind) ?? [];
    arr.push(fn as Listener<EventKind>);
    this.listeners.set(kind, arr);
  }

  recipe = {
    upsertShaped: (p: CmdRecipeUpsertShaped) => {
      this.cmd("Recipe.upsertShaped", p);
    },
  } as const;

  gui = {
    open: (p: CmdGuiOpen): Promise<CmdGuiOpenRes> => {
      return this.cmd<CmdGuiOpenRes>("Gui.open", p);
    },
    updateSlots: (p: CmdGuiUpdateSlots): Promise<void> => {
      return this.cmd<void>("Gui.updateSlots", p);
    },
  } as const;

  entity = {
    spawn: (p: CmdEntitySpawn): Promise<CmdEntitySpawnRes> => {
      return this.cmd<CmdEntitySpawnRes>("Entity.spawn", p);
    },
  } as const;

  player = {
    sendMessage: (p: CmdPlayerSendMessage): Promise<void> =>
      this.cmd<void>("Player.sendMessage", p),
    give: (p: CmdPlayerGive): Promise<void> => this.cmd<void>("Player.give", p),
    get: (p: CmdPlayerGet) =>
      this.cmd<{ ok: boolean; player: TPlayer }>("Player.get", p),
  } as const;

  command = {
    register: (p: CmdCommandRegister): Promise<void> =>
      this.cmd<void>("Command.register", p),
    unregister: (p: CmdCommandUnregister): Promise<void> =>
      this.cmd<void>("Command.unregister", p),
    dispatch: (p: CmdCommandDispatch): Promise<void> =>
      this.cmd<void>("Command.dispatch", p),
  } as const;

  events = {
    chat: {
      setMode: (p: CmdChatSetMode) => this.cmd("Events.Chat.setMode", p),
      broadcast: (p: CmdChatBroadcast) => this.cmd("Events.Chat.broadcast", p),
    },
  } as const;
}
