import type { Factory } from ".";
import { Player } from "../classes/Player";
import type { TPlayer } from "../schemas";
import type { Bridge } from "..";

export class PlayerFactory implements Factory<Player, TPlayer> {
  create(bridge: Bridge, payload: TPlayer): Promise<Player> {
    return Player.get(bridge, payload).then(
      (player) => player || new Player(bridge, payload)
    );
  }

  validate(payload: unknown): payload is TPlayer {
    return (
      typeof payload === "object" &&
      payload !== null &&
      "uuid" in payload &&
      "name" in payload
    );
  }
}
