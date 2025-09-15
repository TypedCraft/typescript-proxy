import WebSocket from "ws";
import { randomUUID } from "crypto";
import { factoryRegistry } from "./factories";
import { Player } from "./classes/Player";
import { Gui } from "./classes/Gui";
import type { Commands, Events, Websocket } from "./types";

type Listener<K extends Websocket.Events.Kind> = (
  payload: Websocket.Events.Payload<K>
) => void;

export class Bridge {
  private ws?: WebSocket;
  private pending = new Map<
    string,
    (
      msg: Extract<
        Websocket.Envelope.Response | Websocket.Envelope.Error,
        { t: "res" | "err" }
      >
    ) => void
  >();
  private listeners = new Map<
    Websocket.Events.Kind,
    Listener<Websocket.Events.Kind>[]
  >();

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

  private send(m: Websocket.Envelope.ServerMessage) {
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

    const message = parsed as Websocket.Envelope.ServerMessage;

    if (message.t === "evt") {
      const evt = message as Websocket.Envelope.Event;
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
        // Can't find a use for this yet, Gui.Close can't load the GUI if it's closed so... maybe we'll find a use in the feature for an event.
        // else if (kind === "Gui.Close") {
        //   if ("menuInstanceId" in evt.payload) {
        //     try {
        //       // First try to get the GUI data from the factory
        //       const guiData = await factoryRegistry.create<TGui | null>(
        //         "gui",
        //         this,
        //         evt.payload as any
        //       );

        //       // Update the payload with the Gui instance if data is available
        //       (evt as any).payload = {
        //         ...(evt.payload as object),
        //         gui: guiData ? new Gui(this, guiData) : null,
        //       };
        //     } catch (error) {
        //       console.error(
        //         "[Bridge] Failed to create GUI instance for close event:",
        //         error
        //       );
        //       // Even if we fail, we still want to pass along the original payload
        //       (evt as any).payload = {
        //         ...(evt.payload as object),
        //         gui: null,
        //       };
        //     }
        //   }
        // }

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
      const cb = this.pending.get(
        (message as Websocket.Envelope.Response | Websocket.Envelope.Error).id
      );
      if (cb) {
        this.pending.delete(
          (message as Websocket.Envelope.Response | Websocket.Envelope.Error).id
        );
        cb(message as Websocket.Envelope.Response | Websocket.Envelope.Error);
      }
      return;
    }
  }

  private cmd<T = unknown>(kind: string, payload: unknown): Promise<T> {
    const id = randomUUID();
    const msg: Websocket.Envelope.Command = { t: "cmd", id, kind, payload };
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
  on<K extends Events.Kind>(
    kind: K,
    fn: (payload: Websocket.Events.Payload<K>) => void
  ): void {
    const currentListeners = this.listeners.get(kind) as
      | Array<typeof fn>
      | undefined;
    // @ts-ignore
    this.listeners.set(kind, [...(currentListeners || []), fn]);
  }

  recipe = {
    upsertShaped: (p: Commands.Recipe.UpsertShaped) => {
      return this.cmd<void>("Recipe.upsertShaped", p);
    },
  } as const;

  gui = {
    open: (p: Commands.Gui.Open): Promise<Commands.Gui.OpenResponse> => {
      return this.cmd<Commands.Gui.OpenResponse>("Gui.open", p);
    },
    updateSlots: (p: Commands.Gui.UpdateSlots): Promise<void> => {
      return this.cmd<void>("Gui.updateSlots", p);
    },
    close: (p: Commands.Gui.Close): Promise<void> => {
      return this.cmd<void>("Gui.close", p);
    },
    get: (p: Commands.Gui.Get) =>
      this.cmd<Commands.Gui.GetResponse>("Gui.get", p),
  } as const;

  entity = {
    spawn: (
      p: Commands.Entity.Spawn
    ): Promise<Commands.Entity.SpawnResponse> => {
      return this.cmd<Commands.Entity.SpawnResponse>("Entity.spawn", p);
    },
  } as const;

  player = {
    sendMessage: (p: Commands.Player.SendMessage): Promise<void> =>
      this.cmd<void>("Player.sendMessage", p),
    give: (p: Commands.Player.Give): Promise<void> =>
      this.cmd<void>("Player.give", p),
    get: (p: Commands.Player.Get) =>
      this.cmd<Commands.Player.GetResponse>("Player.get", p),
    heal: (p: Commands.Player.Heal) => this.cmd<void>("Player.heal", p),
    setFoodLevel: (p: Commands.Player.SetFoodLevel) =>
      this.cmd<void>("Player.setFoodLevel", p),
    setFlying: (p: Commands.Player.SetFlying) =>
      this.cmd<void>("Player.setFlying", p),
    setInvulnerable: (p: Commands.Player.SetInvulnerable) =>
      this.cmd<void>("Player.setInvulnerable", p),
    setOp: (p: Commands.Player.SetOp) => this.cmd<void>("Player.setOp", p),
  } as const;

  command = {
    register: (p: Commands.Command.Register): Promise<void> =>
      this.cmd<void>("Command.register", p),
    unregister: (p: Commands.Command.Unregister): Promise<void> =>
      this.cmd<void>("Command.unregister", p),
    dispatch: (p: Commands.Command.Dispatch): Promise<void> =>
      this.cmd<void>("Command.dispatch", p),
  } as const;

  events = {
    chat: {
      setMode: (p: Commands.Chat.SetMode) => this.cmd("Events.Chat.setMode", p),
      broadcast: (p: Commands.Chat.Broadcast) =>
        this.cmd("Events.Chat.broadcast", p),
    },
  } as const;
}
