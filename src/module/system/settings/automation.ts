import { PartialSettingsData, SettingsMenuPF2e } from "./menu.ts";

type ConfigPF2eListName = (typeof AutomationSettings.SETTINGS)[number];

export class AutomationSettings extends SettingsMenuPF2e {
    static override readonly namespace = "automation";

    static override readonly SETTINGS = [
        "rulesBasedVision",
        "iwr",
        "effectExpiration",
        "removeExpiredEffects",
        "flankingDetection",
        "lootableNPCs",
    ] as const;

    protected static override get settings(): Record<ConfigPF2eListName, PartialSettingsData> {
        return {
            rulesBasedVision: {
                name: CONFIG.PF2E.SETTINGS.automation.rulesBasedVision.name,
                hint: CONFIG.PF2E.SETTINGS.automation.rulesBasedVision.hint,
                default: true,
                type: Boolean,
                requiresReload: true,
            },
            iwr: {
                name: CONFIG.PF2E.SETTINGS.automation.iwr.name,
                hint: CONFIG.PF2E.SETTINGS.automation.iwr.hint,
                default: BUILD_MODE === "development",
                type: Boolean,
            },
            effectExpiration: {
                name: CONFIG.PF2E.SETTINGS.automation.effectExpiration.name,
                hint: CONFIG.PF2E.SETTINGS.automation.effectExpiration.hint,
                default: true,
                type: Boolean,
                onChange: () => {
                    for (const actor of game.actors) {
                        actor.reset();
                        actor.sheet.render(false);
                        for (const token of actor.getActiveTokens()) {
                            token.drawEffects();
                        }
                    }
                },
            },
            removeExpiredEffects: {
                name: CONFIG.PF2E.SETTINGS.automation.removeExpiredEffects.name,
                hint: CONFIG.PF2E.SETTINGS.automation.removeExpiredEffects.hint,
                default: false,
                type: Boolean,
            },
            flankingDetection: {
                name: CONFIG.PF2E.SETTINGS.automation.flankingDetection.name,
                hint: CONFIG.PF2E.SETTINGS.automation.flankingDetection.hint,
                default: true,
                type: Boolean,
            },
            lootableNPCs: {
                name: CONFIG.PF2E.SETTINGS.automation.lootableNPCs.name,
                hint: CONFIG.PF2E.SETTINGS.automation.lootableNPCs.hint,
                default: true,
                type: Boolean,
            },
        };
    }
}
