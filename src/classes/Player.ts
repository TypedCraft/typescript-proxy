import type { Bridge } from "..";
import type { Commands, Minecraft, UUID } from "../types";

export class Player {
  constructor(
    public readonly bridge: Bridge,
    private readonly _player: Minecraft.Player
  ) {}

  static async get(
    bridge: Bridge,
    uuidOrName: Commands.Player.Get
  ): Promise<Player | null> {
    try {
      const response = await bridge.player.get(uuidOrName);
      return response.ok ? new Player(bridge, response.player) : null;
    } catch (error) {
      console.error("Failed to fetch player:", error);
      return null;
    }
  }

  get name(): string {
    return this._player.name;
  }

  get uuid(): UUID {
    return this._player.uuid;
  }

  get x(): number | null {
    return this._player.x;
  }

  get y(): number | null {
    return this._player.y;
  }

  get z(): number | null {
    return this._player.z;
  }

  get world(): string | null {
    return this._player.world;
  }

  get online(): boolean {
    return this._player.online;
  }

  get health(): number | null {
    return this._player.health;
  }

  get compassTarget(): string | null {
    return this._player.compassTarget;
  }

  get exp(): number | null {
    return this._player.exp;
  }

  get experiencePointsNeededForNextLevel(): number | null {
    return this._player.experiencePointsNeededForNextLevel;
  }

  get healthScale(): number | null {
    return this._player.healthScale;
  }

  get isSleeping(): boolean | null {
    return this._player.isSleeping;
  }

  get level(): number | null {
    return this._player.level;
  }

  get totalExperience(): number | null {
    return this._player.totalExperience;
  }

  get ping(): number | null {
    return this._player.ping;
  }

  get walkSpeed(): number | null {
    return this._player.walkSpeed;
  }

  sendMessage(text: string): Promise<void> {
    return this.bridge.player.sendMessage({
      uuid: this.uuid,
      text,
    });
  }

  give(item: Minecraft.Item): Promise<void> {
    return this.bridge.player.give({
      uuid: this.uuid,
      item,
    });
  }
}
