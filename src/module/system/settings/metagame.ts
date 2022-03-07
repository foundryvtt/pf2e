import { PartialSettingsData, SettingsMenuPF2e } from "./menu";

type ConfigPF2eListName = typeof MetagameSettings.SETTINGS[number];

export class MetagameSettings extends SettingsMenuPF2e {
    static override readonly namespace = "metagame";

    static override readonly SETTINGS = [
        "showDC",
        "showResults",
        "tokenSetsNameVisibility",
        "secretDamage",
        "secretCondition",
        "partyVision",
    ] as const;

    protected static override get settings(): Record<ConfigPF2eListName, PartialSettingsData> {
        return {
            showDC: {
                name: "PF2E.SETTINGS.Metagame.ShowDC.Name",
                hint: "PF2E.SETTINGS.Metagame.ShowDC.Hint",
                default: "gm",
                type: String,
                choices: {
                    none: "PF2E.SETTINGS.Metagame.ShowDC.None",
                    gm: "PF2E.SETTINGS.Metagame.ShowDC.Gm",
                    owner: "PF2E.SETTINGS.Metagame.ShowDC.Owner",
                    all: "PF2E.SETTINGS.Metagame.ShowDC.All",
                },
            },
            showResults: {
                name: "PF2E.SETTINGS.Metagame.ShowResults.Name",
                hint: "PF2E.SETTINGS.Metagame.ShowResults.Hint",
                default: "all",
                type: String,
                choices: {
                    none: "PF2E.SETTINGS.Metagame.ShowResults.None",
                    gm: "PF2E.SETTINGS.Metagame.ShowResults.Gm",
                    owner: "PF2E.SETTINGS.Metagame.ShowResults.Owner",
                    all: "PF2E.SETTINGS.Metagame.ShowResults.All",
                },
            },
            tokenSetsNameVisibility: {
                name: "PF2E.SETTINGS.Metagame.TokenSetsNameVisibility.Name",
                hint: "PF2E.SETTINGS.Metagame.TokenSetsNameVisibility.Hint",
                default: false,
                type: Boolean,
                onChange: async () => {
                    await ui.combat.render();
                    const renderedMessages = document.querySelectorAll<HTMLLIElement>("#chat-log > li");
                    for await (const rendered of Array.from(renderedMessages)) {
                        const message = game.messages.get(rendered?.dataset.messageId ?? "");
                        if (!message) continue;
                        await ui.chat.updateMessage(message);
                    }
                },
            },
            secretDamage: {
                name: "PF2E.SETTINGS.Metagame.SecretDamage.Name",
                hint: "PF2E.SETTINGS.Metagame.SecretDamage.Hint",
                default: false,
                type: Boolean,
            },
            secretCondition: {
                name: "PF2E.SETTINGS.Metagame.SecretCondition.Name",
                hint: "PF2E.SETTINGS.Metagame.SecretCondition.Hint",
                default: false,
                type: Boolean,
            },
            partyVision: {
                name: "PF2E.SETTINGS.Metagame.PartyVision.Name",
                hint: "PF2E.SETTINGS.Metagame.PartyVision.Hint",
                default: false,
                type: Boolean,
                onChange: () => {
                    window.location.reload();
                },
            },
        };
    }
}
