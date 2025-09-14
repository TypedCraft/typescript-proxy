import { Bridge } from "../src";
import { Player } from "../src/classes/Player";
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

bridge.on("Player.Chat", async ({ player, message }) => {
  const rendered = `<gray>[</gray><green>${
    player.name
  }</green><gray>]</gray> <white>${escapeMini(message)}</white>`;
  await bridge.events.chat.broadcast({ text: rendered, format: "mini" });
});

bridge.on("Player.Join", async ({}) => {
  // Join Event
});

bridge.on("Command.Execute", async ({ name, args, sender }) => {
  if (name === "test_command") {
    if (sender.type !== "PLAYER") return;

    await bridge.gui.open({
      uuid: sender.uuid,
      title: "Test GUI",
      size: 27,
      slots: [
        {
          slot: 8,
          item: {
            material: "DIAMOND",
            lore: ["<#FF0000>test"],
            name: "<rainbow>test name",
          },
        },
      ],
    });
  }
});

bridge.on("Gui.Click", async (e) => {
  console.log(e);
});
