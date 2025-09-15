import type { Bridge } from "..";
import type { Minecraft, UUID } from "../types";

export class Gui {
  private _gui: Minecraft.Gui.Type;
  constructor(
    public readonly bridge: Bridge,
    public readonly payload: Minecraft.Gui.Type
  ) {
    this._gui = payload;
  }

  get gui(): Minecraft.Gui.Type {
    return this._gui;
  }

  get menuInstanceId(): UUID {
    return this.payload.menuInstanceId;
  }

  static async get(bridge: Bridge, menuInstanceId: UUID): Promise<Gui | null> {
    try {
      const response = await bridge.gui.get({ menuInstanceId });
      if (!response.ok) {
        console.warn(`[Gui] Failed to get GUI with ID: ${menuInstanceId}`);
        return null;
      }
      return new Gui(bridge, response);
    } catch (error) {
      console.error(`[Gui] Error fetching GUI ${menuInstanceId}:`, error);
      return null;
    }
  }
}
