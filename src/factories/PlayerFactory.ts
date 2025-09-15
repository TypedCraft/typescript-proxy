import type { Factory } from ".";
import { Player } from "../classes/Player";
import type { Bridge } from "..";
import type { Minecraft } from "../types";

export class PlayerFactory implements Factory<Player, Minecraft.Player> {
  create(bridge: Bridge, payload: Minecraft.Player): Promise<Player> {
    return Player.get(bridge, payload).then(
      (player) => player || new Player(bridge, payload)
    );
  }

  validate(payload: unknown): payload is Minecraft.Player {
    return (
      typeof payload === "object" &&
      payload !== null &&
      "uuid" in payload &&
      "name" in payload
    );
  }
}
