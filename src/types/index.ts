import type { Gui } from "../classes/Gui";
import type { Player } from "../classes/Player";
import { Material } from "./material";
import type { Mobs } from "./mobs";

export type UUID = `${string}-${string}-${string}-${string}-${string}`;

export namespace Minecraft {
  export interface Enchantment {
    type: string;
    level?: number;
  }
  export interface Item {
    material: Material.ID;
    amount?: number;
    name?: string;
    lore?: string[];
    customModelData?: number;
    unbreakable?: boolean;
    flags?: string[];
    enchantments?: Enchantment[];
  }

  export interface Player {
    name: string;
    uuid: UUID;
    online: boolean;
    x: number | null;
    y: number | null;
    z: number | null;
    world: string | null;
    health: number | null;
    compassTarget: string | null;
    exp: number | null;
    experiencePointsNeededForNextLevel: number | null;
    healthScale: number | null;
    isSleeping: boolean | null;
    level: number | null;
    totalExperience: number | null;
    ping: number | null;
    walkSpeed: number | null;
    foodLevel: number | null;
    isFlying: boolean | null;
    isBanned: boolean | null;
  }

  export interface PlayerType {
    uuid: UUID;
  }

  export namespace Recipe {
    export interface Key {
      type: "MATERIAL";
      material: Material.ID;
    }
  }

  export namespace Gui {
    export interface Slot {
      slot: number;
      item: Minecraft.Item | null;
    }

    export interface Type {
      menuInstanceId: UUID;
      size: number;
      viewers: Array<Pick<Player, "uuid" | "name">>;
      slots: Slot[];
    }
  }

  export type NamespacedKey = {
    namespace: string;
    key: string;
  };
  export type Sender =
    | (Pick<Player, "name" | "uuid"> & { type: "PLAYER" })
    | { type: "CONSOLE" };
}

export namespace Commands {
  interface UpdateBoolean {
    uuid: UUID;
    value?: boolean;
  }
  export namespace Player {
    export interface SendMessage {
      uuid: UUID;
      text: string;
    }
    export interface Give {
      uuid: UUID;
      item: Minecraft.Item;
    }
    export interface Get {
      uuid?: UUID;
      name?: string;
    }
    export interface GetResponse {
      ok: boolean;
      player: Minecraft.Player;
    }
    export interface Heal {
      uuid: UUID;
      amount?: number;
    }
    export interface SetFoodLevel {
      uuid: UUID;
      amount?: number;
    }
    export type SetFlying = UpdateBoolean;
    export type SetOp = UpdateBoolean;
    export type SetInvulnerable = UpdateBoolean;
    export type SetAllowFlight = UpdateBoolean;
  }
  export namespace Chat {
    export interface Broadcast {
      text: string;
      format?: "mini" | "plain";
      recipients?: string[];
    }
    export interface SetMode {
      mode: "VANILLA" | "PROXY";
    }
  }
  export namespace Gui {
    export interface Open {
      uuid: UUID;
      title: string;
      size: number;
      slots?: Minecraft.Gui.Slot[];
    }

    export interface OpenResponse {
      menuInstanceId: UUID;
    }

    export interface Close {
      menuInstanceId: UUID;
      uuid: UUID;
    }

    export interface UpdateSlots {
      menuInstanceId: UUID;
      slots: Minecraft.Gui.Slot[];
    }

    export interface Get {
      menuInstanceId: UUID;
    }

    export type GetResponse =
      | (Minecraft.Gui.Type & { ok: true })
      | { ok: false };
  }

  export namespace Recipe {
    export interface UpsertShaped {
      key: Minecraft.NamespacedKey;
      shape: string[];
      keys: Record<string, Minecraft.Recipe.Key>;
      result: Minecraft.Item;
    }
  }

  export namespace Entity {
    export interface Spawn {
      type: Mobs.ID;
      world: string;
      x: number;
      y: number;
      z: number;
      yaw?: number;
      pitch?: number;
      name?: string;
    }
    export interface SpawnResponse {
      entityUuid: UUID;
    }
  }

  export namespace Command {
    export interface Register {
      name: string;
      description?: string;
      permission?: string;
      aliases?: string[];
    }
    export interface Unregister {
      name: string;
    }
    export interface Dispatch {
      as?: "CONSOLE" | "PLAYER";
      uuid?: UUID;
      line: string;
    }
  }
}

export namespace Websocket {
  export namespace Events {
    export type Kind = keyof typeof Schemas;
    export const Schemas = {
      "Player.Join": "PlayerJoinEvent",
      "Player.Chat": "PlayerChatEvent",
      "Gui.Click": "GuiClickEvent",
      "Gui.Close": "GuiCloseEvent",
      "Command.Execute": "CommandExecuteEvent",
      "Server.CommandsReady": "ServerCommandsReadyEvent",
      hello_ack: "HelloAckEvent",
    } as const;

    export type Empty = {};

    export type PayloadMap = {
      "Player.Join": Player.Join;
      "Player.Chat": Player.Chat;
      "Gui.Click": Gui.Click;
      "Gui.Close": Gui.Close;
      "Command.Execute": Command.Execute;
      "Server.CommandsReady": Empty;
      hello_ack: Empty;
    };

    export type Payload<K extends Kind> = PayloadMap[K];

    export namespace Player {
      export interface Join {
        player: Player;
      }
      export interface Chat {
        player: Player;
        message: string;
      }
    }

    export namespace Gui {
      export interface Click {
        menuInstanceId: UUID;
        rawSlot: number;
        slot: number;
        region: "TOP" | "PLAYER" | "OTHER";
        clickType: string;
        action: string;
        shift: boolean;
        uuid: UUID;
        item: Minecraft.Item | null;
      }
      export interface Close {
        menuInstanceId: UUID;
        uuid: UUID;
        gui: Gui | null;
      }
    }

    export namespace Command {
      export interface Execute {
        name: string;
        label?: string;
        args: string[];
        sender: Minecraft.Sender;
      }
    }

    export interface ServerCommandsReadyEvent {}
  }
  export namespace Envelope {
    export interface Base {
      t: Type;
    }
    export type Type = "cmd" | "evt" | "res" | "err" | "hello" | "hello_ack";
    export interface Event<
      K extends Websocket.Events.Kind = Websocket.Events.Kind
    > extends Base {
      t: "evt";
      kind: K;
      payload: Websocket.Events.Payload<K>;
    }

    export interface Response extends Base {
      t: "res";
      id: UUID;
      kind: string;
      payload: unknown;
    }

    export interface ErrorPayload {
      code: string;
      message?: string;
    }

    export interface Error extends Base {
      t: "err";
      id: UUID;
      kind: string;
      payload: ErrorPayload;
    }

    export interface Hello extends Base {
      t: "hello";
      protocolVersion?: number;
    }

    export interface HelloAck extends Base {
      t: "hello_ack";
      protocolVersion?: number;
    }

    export interface Command extends Base {
      t: "cmd";
      id: UUID;
      kind: string;
      payload: unknown;
    }

    export type ServerMessage =
      | Event
      | Response
      | Error
      | Hello
      | HelloAck
      | Command;
  }
}

export namespace Events {
  export enum Player {
    Join = "Player.Join",
    Chat = "Player.Chat",
  }
  export enum Gui {
    Click = "Gui.Click",
    Close = "Gui.Close",
  }
  export enum Command {
    Execute = "Command.Execute",
  }
  export enum Server {
    CommandsReady = "Server.CommandsReady",
  }
  export enum Hello {
    ack = "hello_ack",
  }

  export type Kind = Player | Gui | Command | Server | Hello;
}
