import type { Factory } from ".";
import type { Bridge } from "..";
import { Gui } from "../classes/Gui";
import type { Minecraft, UUID } from "../types";

export class GuiFactory
  implements Factory<Minecraft.Gui.Type, { menuInstanceId: UUID }>
{
  async create(
    bridge: Bridge,
    payload: { menuInstanceId: UUID }
  ): Promise<Minecraft.Gui.Type> {
    try {
      // Always fetch the GUI data using the menuInstanceId
      const gui = await Gui.get(bridge, payload.menuInstanceId);
      if (!gui) {
        throw new Error(
          `Failed to create GUI with ID: ${payload.menuInstanceId}`
        );
      }
      return gui.gui;
    } catch (error) {
      console.error(`[GuiFactory] Error creating GUI instance:`, error);
      throw error; // Re-throw the error to be handled by the caller
    }
  }

  validate(payload: unknown): payload is { menuInstanceId: UUID } {
    return (
      typeof payload === "object" &&
      payload !== null &&
      "menuInstanceId" in payload &&
      typeof (payload as { menuInstanceId: unknown }).menuInstanceId ===
        "string"
    );
  }
}
