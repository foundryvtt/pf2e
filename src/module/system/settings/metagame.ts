import { resetActors } from "@actor/helpers.ts";
import { PartialSettingsData, SettingsMenuPF2e } from "./menu.ts";

const MetagameSettingsConfig = {
    showDC: {
        prefix: "metagame_",
        name: "PF2E.SETTINGS.Metagame.ShowDC.Name",
        hint: "PF2E.SETTINGS.Metagame.ShowDC.Hint",
        default: false,
        type: Boolean,
        onChange: (value: unknown) => {
            game.pf2e.settings.metagame.dcs = !!value;
        },
    },
    showResults: {
        prefix: "metagame_",
        name: "PF2E.SETTINGS.Metagame.ShowResults.Name",
        hint: "PF2E.SETTINGS.Metagame.ShowResults.Hint",
        default: true,
        type: Boolean,
        onChange: (value: unknown) => {
            game.pf2e.settings.metagame.results = !!value;
        },
    },
    showBreakdowns: {
        prefix: "metagame_",
        name: "PF2E.SETTINGS.Metagame.ShowBreakdowns.Name",
        hint: "PF2E.SETTINGS.Metagame.ShowBreakdowns.Hint",
        default: false,
        type: Boolean,
        onChange: (value: unknown) => {
            game.pf2e.settings.metagame.breakdowns = !!value;
        },
    },
    secretDamage: {
        prefix: "metagame_",
        name: "PF2E.SETTINGS.Metagame.SecretDamage.Name",
        hint: "PF2E.SETTINGS.Metagame.SecretDamage.Hint",
        default: false,
        type: Boolean,
    },
    secretCondition: {
        prefix: "metagame_",
        name: "PF2E.SETTINGS.Metagame.SecretCondition.Name",
        hint: "PF2E.SETTINGS.Metagame.SecretCondition.Hint",
        default: false,
        type: Boolean,
    },
    partyVision: {
        prefix: "metagame_",
        name: "PF2E.SETTINGS.Metagame.PartyVision.Name",
        hint: "PF2E.SETTINGS.Metagame.PartyVision.Hint",
        default: false,
        type: Boolean,
        onChange: (value: unknown) => {
            game.pf2e.settings.metagame.partyVision = !!value;
            if (canvas.ready && canvas.scene) {
                canvas.perception.update({ initializeVision: true, refreshLighting: true }, true);
            }
        },
    },
    showPartyStats: {
        prefix: "metagame_",
        name: "PF2E.SETTINGS.Metagame.ShowPartyStats.Name",
        hint: "PF2E.SETTINGS.Metagame.ShowPartyStats.Hint",
        default: true,
        type: Boolean,
        onChange: (value: unknown) => {
            game.pf2e.settings.metagame.partyStats = !!value;
            resetActors(game.actors.filter((a) => a.isOfType("party")));
        },
    },
    tokenSetsNameVisibility: {
        prefix: "metagame_",
        name: "PF2E.SETTINGS.Metagame.TokenSetsNameVisibility.Name",
        hint: "PF2E.SETTINGS.Metagame.TokenSetsNameVisibility.Hint",
        default: false,
        type: Boolean,
        onChange: async (value: unknown) => {
            game.pf2e.settings.tokens.nameVisibility = !!value;
            await ui.combat.render();
            const renderedMessages = document.querySelectorAll<HTMLLIElement>("#chat-log > li");
            for (const rendered of Array.from(renderedMessages)) {
                const message = game.messages.get(rendered?.dataset.messageId ?? "");
                if (!message) continue;
                await ui.chat.updateMessage(message);
            }
        },
    },
} satisfies Record<string, PartialSettingsData>;

class MetagameSettings extends SettingsMenuPF2e {
    static override namespace = "metagame";

    static override get settings(): typeof MetagameSettingsConfig {
        return MetagameSettingsConfig;
    }

    static override get SETTINGS(): string[] {
        return Object.keys(this.settings);
    }
}

export { MetagameSettings };
