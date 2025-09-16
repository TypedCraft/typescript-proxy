import type { Bridge } from "..";
import type { Commands, Minecraft, UUID } from "../types";

export class Player {
  constructor(
    public readonly bridge: Bridge,
    private readonly _player:
      | (Minecraft.Player & { online: true })
      | ({ online: false } & Pick<Minecraft.Player, "uuid" | "name">)
  ) {}

  // #region Static Methods
  /**
   * @desc Fetches a player from the server
   * @param {Commands.Player.Get} uuidOrName The player's uuid or name
   * @returns {Promise<Player | null>} The player if found, otherwise null
   */
  static async get(
    bridge: Bridge,
    uuidOrName: Commands.Player.Get
  ): Promise<Player | null> {
    try {
      const response = await bridge.player.get(uuidOrName);
      return response.ok
        ? new Player(bridge, response.player)
        : new Player(bridge, {
            online: false,
            uuid: response.player.uuid,
            name: response.player.name,
          });
    } catch (error) {
      console.error("Failed to fetch player:", error);
      return null;
    }
  }

  // #endregion

  // #region Getters
  /* Getters */

  /**
   * @desc Get's the player's name
   *
   */
  get name(): string {
    return this._player.name;
  }

  /**
   * @desc Get's the player's uuid
   *
   */
  get uuid(): UUID {
    return this._player.uuid;
  }

  /**
   * @desc Get's the player's health
   *
   */
  get health(): number | null {
    return this._player.online ? this._player.health : null;
  }

  /**
   * @desc Get's the player's online status
   *
   */
  get online(): boolean {
    return this._player.online;
  }

  /**
   * @desc Get's the player's food level
   *
   */
  get foodLevel(): number | null {
    return this._player.online ? this._player.foodLevel : null;
  }

  /**
   * @desc Get's the player's compass target
   *
   */
  get compassTarget(): string | null {
    return this._player.online ? this._player.compassTarget : null;
  }

  /**
   * @desc Get's the player's experience
   *
   */
  get exp(): number | null {
    return this._player.online ? this._player.exp : null;
  }

  /**
   * @desc Get's the player's experience points needed for the next level
   *
   */
  get experiencePointsNeededForNextLevel(): number | null {
    return this._player.online
      ? this._player.experiencePointsNeededForNextLevel
      : null;
  }

  /**
   * @desc Get's the player's health scale
   *
   */
  get healthScale(): number | null {
    return this._player.online ? this._player.healthScale : null;
  }

  /**
   * @desc Get's the player's sleep state
   *
   */
  get isSleeping(): boolean | null {
    return this._player.online ? this._player.isSleeping : null;
  }

  /**
   * @desc Get's the player's level
   *
   */
  get level(): number | null {
    return this._player.online ? this._player.level : null;
  }

  /**
   * @desc Get's the player's total experience
   *
   */
  get totalExperience(): number | null {
    return this._player.online ? this._player.totalExperience : null;
  }

  /**
   * @desc Get's the player's ping
   *
   */
  get ping(): number | null {
    return this._player.online ? this._player.ping : null;
  }

  /**
   * @desc Get's the player's walk speed
   *
   */
  get walkSpeed(): number | null {
    return this._player.online ? this._player.walkSpeed : null;
  }

  get isFlying(): boolean | null {
    return this._player.online ? this._player.isFlying : null;
  }

  get isBanned(): boolean | null {
    return this._player.online ? this._player.isBanned : null;
  }

  get raw(): Minecraft.Player {
    return this._player as Minecraft.Player;
  }
  // #endregion

  // #region Actions
  /**
   * @desc Sends a message to the player
   * @param {string} text The message to send
   *
   */
  sendMessage(text: string): Promise<void> {
    return this.bridge.player.sendMessage({
      uuid: this.uuid,
      text,
    });
  }

  /**
   * @desc Gives the player an item
   * @param {Minecraft.Item} item The item to give
   *
   */
  give(item: Minecraft.Item): Promise<void> {
    return this.bridge.player.give({
      uuid: this.uuid,
      item,
    });
  }

  /**
   * @desc Heals the player
   * @param {number?} amount If no amount is supplied, this will heal the player to full health.
   *
   */
  heal(amount?: number) {
    return this.bridge.player.heal({ uuid: this.uuid, amount });
  }

  /**
   * @desc Set's the player's food level
   * @param {number?} amount If no amount is supplied, this will fill the player's hunger.
   *
   */
  setFoodLevel(amount?: number) {
    return this.bridge.player.setFoodLevel({ uuid: this.uuid, amount });
  }

  /**
   * @desc Set's the player's flying state, if player is NOT allowed to fly, this will have no effect.
   * @param {boolean?} value If no value is supplied, this will toggle the player's flying state.
   *
   */
  setFlying(value?: boolean) {
    return this.bridge.player.setFlying({ uuid: this.uuid, value });
  }

  /**
   * @desc Set's the player's invulnerable state
   * @param {boolean?} value If no value is supplied, this will toggle the player's invulnerable state.
   *
   */
  setInvulnerable(value?: boolean) {
    return this.bridge.player.setInvulnerable({ uuid: this.uuid, value });
  }

  /**
   * @desc Set's the player's op status
   * @param {boolean?} value If no value is supplied, this will toggle the player's op status.
   *
   */
  setOp(value?: boolean) {
    return this.bridge.player.setOp({ uuid: this.uuid, value });
  }

  /**
   * @desc Set's the player's allow flight state
   * @param {boolean?} value If no value is supplied, this will toggle the player's allow flight state.
   *
   */
  setAllowFlight(value?: boolean) {
    return this.bridge.player.setAllowFlight({ uuid: this.uuid, value });
  }
  // #endregion

  // #region Utilities
  // #endregion
}
