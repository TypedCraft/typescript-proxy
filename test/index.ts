import { Bridge } from "../src";
import { Events } from "../src/types";
import { escapeMini } from "../src/utils";

const bridge = new Bridge(process.env.WEBSOCKET_URL);

await bridge.ready();
await bridge.events.chat.setMode({ mode: "PROXY" }); // PROXY cancels the chat event.

const registerCommands = async () => {
  await bridge.command.register({
    name: "test_command",
    description: "This is a test command",
  });
};

registerCommands();

await bridge.recipe.upsertShaped({
  key: { namespace: "typecraft", key: "emerald_wand" },
  shape: ["  S", " E ", "S  "],
  keys: {
    S: { type: "MATERIAL", material: "STICK" },
    E: { type: "MATERIAL", material: "EMERALD" },
  },
  result: {
    material: "EMERALD",
    amount: 1,
    name: "Emerald Wand",
    lore: ["This is a test"],
  },
});

bridge.on(Events.Player.Chat, async ({ player, message }) => {
  const rendered = `<gray>[</gray><green>${
    player.name
  }</green><gray>]</gray> <white>${escapeMini(message)}</white>`;
  await bridge.events.chat.broadcast({ text: rendered, format: "mini" });
});

bridge.on(Events.Player.Join, async ({ player }) => {
  await bridge.events.chat.broadcast({
    text: `<gray>[</gray><green>TypeCraft</green><gray>]</gray> <yellow>${player.name}</yellow><white> joined the game.</white>`,
  });
});

bridge.on(Events.Command.Execute, async ({ name, args, sender }) => {
  if (name === "test_command") {
    if (sender.type !== "PLAYER") return;

    await bridge.gui.open({
      uuid: sender.uuid,
      title: "Test GUI",
      size: 27,
      slots: [
        {
          slot: 26,
          item: {
            material: "REDSTONE_BLOCK",
            name: "<red>Close Menu",
          },
        },
      ],
    });
  }
});

bridge.on(Events.Gui.Click, async ({ menuInstanceId, item, uuid }) => {
  if (item?.name == "Close Menu") {
    await bridge.gui.close({ menuInstanceId, uuid });
  }
});
