import { SettingsMenuPF2e } from "./menu";

const MetagameSettingsConfig = {
    showDC: {
        name: "PF2E.SETTINGS.Metagame.ShowDC.Name",
        hint: "PF2E.SETTINGS.Metagame.ShowDC.Hint",
        default: false,
        type: Boolean,
    },
    showResults: {
        name: "PF2E.SETTINGS.Metagame.ShowResults.Name",
        hint: "PF2E.SETTINGS.Metagame.ShowResults.Hint",
        default: true,
        type: Boolean,
    },
    tokenSetsNameVisibility: {
        name: "PF2E.SETTINGS.Metagame.TokenSetsNameVisibility.Name",
        hint: "PF2E.SETTINGS.Metagame.TokenSetsNameVisibility.Hint",
        default: false,
        type: Boolean,
        onChange: async () => {
            await ui.combat.render();
            const renderedMessages = document.querySelectorAll<HTMLLIElement>("#chat-log > li");
            for (const rendered of Array.from(renderedMessages)) {
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
            if (canvas.ready && canvas.scene) {
                canvas.perception.update({ initializeVision: true, refreshLighting: true }, true);
            }
        },
    },
};

class MetagameSettings extends SettingsMenuPF2e {
    static override namespace = "metagame";

    static override get settings(): typeof MetagameSettingsConfig {
        return MetagameSettingsConfig;
    }

    static override get SETTINGS(): string[] {
        return Object.keys(this.settings);
    }

    static override get prefix() {
        return `${this.namespace}_`;
    }
}

export { MetagameSettings };
