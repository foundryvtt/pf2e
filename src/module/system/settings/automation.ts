import { PartialSettingsData, SettingsMenuPF2e } from "./menu";

type ConfigPF2eListName = typeof AutomationSettings.SETTINGS[number];

export class AutomationSettings extends SettingsMenuPF2e {
    static override readonly namespace = "automation";

    static override readonly SETTINGS = [
        "rulesBasedVision",
        "effectExpiration",
        "lootableNPCs",
        "experimentalDamageFormatting",
    ] as const;

    protected static override get settings(): Record<ConfigPF2eListName, PartialSettingsData> {
        return {
            rulesBasedVision: {
                name: CONFIG.PF2E.SETTINGS.automation.rulesBasedVision.name,
                hint: CONFIG.PF2E.SETTINGS.automation.rulesBasedVision.hint,
                default: true,
                type: Boolean,
                onChange: () => {
                    window.location.reload();
                },
            },
            effectExpiration: {
                name: CONFIG.PF2E.SETTINGS.automation.effectExpiration.name,
                hint: CONFIG.PF2E.SETTINGS.automation.effectExpiration.hint,
                default: true,
                type: Boolean,
                onChange: () => {
                    game.actors.forEach((actor) => {
                        actor.prepareData();
                        actor.sheet.render(false);
                        actor.getActiveTokens().forEach((token) => token.drawEffects());
                    });
                },
            },
            lootableNPCs: {
                name: CONFIG.PF2E.SETTINGS.automation.lootableNPCs.name,
                hint: CONFIG.PF2E.SETTINGS.automation.lootableNPCs.hint,
                default: false,
                type: Boolean,
            },
            experimentalDamageFormatting: {
                name: CONFIG.PF2E.SETTINGS.automation.experimentalDamageFormatting.name,
                hint: CONFIG.PF2E.SETTINGS.automation.experimentalDamageFormatting.hint,
                default: false,
                type: Boolean,
            },
        };
    }
}
