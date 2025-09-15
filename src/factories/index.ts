import type { Bridge } from "..";
import { PlayerFactory } from "./PlayerFactory";
import { GuiFactory } from "./GuiFactory";
import type { Minecraft } from "../types";

export interface Factory<T, P> {
  create(bridge: Bridge, payload: P): T | Promise<T>;
  validate(payload: unknown): payload is P;
}
export class FactoryRegistry {
  private static instance: FactoryRegistry;
  private factories = new Map<string, Factory<any, any>>();

  private constructor() {}

  static getInstance(): FactoryRegistry {
    if (!FactoryRegistry.instance) {
      FactoryRegistry.instance = new FactoryRegistry();
    }
    return FactoryRegistry.instance;
  }

  register<T, P>(type: string, factory: Factory<T, P>): void {
    this.factories.set(type, factory);
  }

  create<T>(type: string, bridge: Bridge, payload: unknown): T | null {
    const factory = this.factories.get(type);
    if (!factory) {
      console.error(`[Factory] No factory registered for type: ${type}`);
      return null;
    }

    if (!factory.validate(payload)) {
      console.error(`[Factory] Invalid payload for type: ${type}`, payload);
      return null;
    }

    return factory.create(bridge, payload);
  }

  validate(type: string, payload: unknown): boolean {
    const factory = this.factories.get(type);
    return factory ? factory.validate(payload) : false;
  }
}

export const factoryRegistry = FactoryRegistry.getInstance();
factoryRegistry.register<Minecraft.PlayerType, { uuid: string }>(
  "player",
  new PlayerFactory()
);
factoryRegistry.register<Minecraft.Gui.Type, { menuInstanceId: string }>(
  "gui",
  new GuiFactory()
);
