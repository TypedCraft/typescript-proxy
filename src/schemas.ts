import type { Gui } from "./classes/Gui";
import { Player } from "./classes/Player";

export type UUID = string;
export interface NamespacedKey {
  namespace: string;
  key: string;
}
export type Material = string;

export type ItemDef = {
  material: string;
  amount?: number;
  name?: string;
  lore?: string[];
  customModelData?: number;
  unbreakable?: boolean;
  flags?: string[];
  enchantments?: {
    type: string;
    level?: number;
  }[];
};

type EnvelopeType = "cmd" | "evt" | "res" | "err" | "hello" | "hello_ack";

export interface EnvelopeBase {
  t: EnvelopeType;
}

export interface EnvelopeEvt<K extends EventKind = EventKind>
  extends EnvelopeBase {
  t: "evt";
  kind: K;
  payload: EventPayloadMap[K];
}

export interface EnvelopeRes extends EnvelopeBase {
  t: "res";
  id: UUID;
  kind: string;
  payload: unknown;
}

export interface ErrorPayload {
  code: string;
  message?: string;
}

export interface EnvelopeErr extends EnvelopeBase {
  t: "err";
  id: string;
  kind: string;
  payload: ErrorPayload;
}

export interface EnvelopeHello extends EnvelopeBase {
  t: "hello";
  protocolVersion?: number;
}

export interface EnvelopeHelloAck extends EnvelopeBase {
  t: "hello_ack";
  protocolVersion?: number;
}

export interface EnvelopeCmd extends EnvelopeBase {
  t: "cmd";
  id: UUID;
  kind: string;
  payload: unknown;
}

export type ServerMessage =
  | EnvelopeCmd
  | EnvelopeEvt
  | EnvelopeRes
  | EnvelopeErr
  | EnvelopeHello
  | EnvelopeHelloAck;

export interface TPlayer {
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
}

export interface PlayerJoinEvent {
  player: Player;
}

export interface PlayerChatEvent {
  player: Player;
  message: string;
}

// export type GuiClickPayload = {
//   menuInstanceId: string;
//   rawSlot: number;
//   slot: number;
//   region: "TOP" | "PLAYER" | "OTHER";
//   clickType: string;
//   action: string;
//   shift: boolean;
//   uuid: string;
//   item?: ItemDef | null;
//   cursorItem?: ItemDef | null;
//   hotbarItem?: ItemDef | null;
//   hotbarButton?: number;
// };

export type GuiClickEvent = {
  menuInstanceId: string;
  rawSlot: number;
  slot: number;
  region: "TOP" | "PLAYER" | "OTHER";
  clickType: string;
  action: string;
  shift: boolean;
  uuid: UUID;
  item: ItemDef | null;
};
export interface GuiCloseEvent {
  menuInstanceId: string;
  uuid: UUID;
  gui: Gui | null;
}

export type CmdChatSetMode = { mode: "VANILLA" | "PROXY" };
export type CmdChatBroadcast = {
  text: string;
  format?: "mini" | "plain";
  recipients?: string[];
};

type SenderType = "PLAYER" | "CONSOLE";

interface ConsoleSender {
  type: "CONSOLE";
}

interface PlayerSender {
  type: "PLAYER";
  name: string;
  uuid: UUID;
}

export interface CommandExecuteEvent {
  name: string;
  label?: string;
  args: string[];
  sender: PlayerSender | ConsoleSender;
}

export interface ServerCommandsReadyEvent {}

export type EventKind = keyof typeof EventSchemas;

export const EventSchemas = {
  "Player.Join": "PlayerJoinEvent",
  "Player.Chat": "PlayerChatEvent",
  "Gui.Click": "GuiClickEvent",
  "Gui.Close": "GuiCloseEvent",
  "Command.Execute": "CommandExecuteEvent",
  "Server.CommandsReady": "ServerCommandsReadyEvent",
  hello_ack: "HelloAckEvent",
} as const;

export type EventPayloadMap = {
  "Player.Join": PlayerJoinEvent;
  "Player.Chat": PlayerChatEvent;
  "Gui.Click": GuiClickEvent;
  "Gui.Close": GuiCloseEvent;
  "Command.Execute": CommandExecuteEvent;
  "Server.CommandsReady": ServerCommandsReadyEvent;
  hello_ack: {};
};

export type EventPayload<K extends EventKind> = EventPayloadMap[K];

export interface RecipeKey {
  type: "MATERIAL";
  material: Material;
}

export interface CmdRecipeUpsertShaped {
  key: NamespacedKey;
  shape: string[];
  keys: Record<string, RecipeKey>;
  result: ItemDef;
}

export interface GuiSlot {
  slot: number;
  item: ItemDef;
}

export interface TGui {
  menuInstanceId: string;
  size: number;
  viewers: Array<Pick<TPlayer, "uuid" | "name">>;
  slots: Array<GuiSlot>;
}

export interface CmdGuiOpen {
  uuid: UUID;
  title: string;
  size: number;
  slots?: GuiSlot[];
}

export interface CmdGuiClose {
  menuInstanceId: string;
  uuid: UUID;
}

export interface CmdGuiOpenRes {
  menuInstanceId: string;
}

export interface CmdGuiUpdateSlots {
  menuInstanceId: string;
  slots: GuiSlot[];
}

export interface CmdEntitySpawn {
  type: string;
  world: string;
  x: number;
  y: number;
  z: number;
  yaw?: number;
  pitch?: number;
  name?: string;
}

export interface CmdEntitySpawnRes {
  entityUuid: string;
}

export interface CmdPlayerSendMessage {
  uuid: UUID;
  text: string;
}

export interface CmdPlayerGive {
  uuid: UUID;
  item: ItemDef;
}

export interface CmdPlayerGet {
  uuid?: UUID;
  name?: string;
}

export interface CmdGuiGet {
  menuInstanceId: UUID;
}

export type GuiGetRes = (TGui & { ok: true }) | { ok: false };

export interface CmdCommandRegister {
  name: string;
  description?: string;
  permission?: string;
  aliases?: string[];
}

export interface CmdCommandUnregister {
  name: string;
}

export interface CmdCommandDispatch {
  as?: "CONSOLE" | "PLAYER";
  uuid?: UUID;
  line: string;
}
