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
        "encumbrance",
        "lootableNPCs",
    ] as const;

    protected static override get settings(): Record<ConfigPF2eListName, PartialSettingsData> {
        return {
            rulesBasedVision: {
                prefix: "automation.",
                name: CONFIG.PF2E.SETTINGS.automation.rulesBasedVision.name,
                hint: CONFIG.PF2E.SETTINGS.automation.rulesBasedVision.hint,
                default: true,
                type: Boolean,
                onChange: (value) => {
                    game.pf2e.settings.rbv = !!value;
                    for (const token of canvas.scene?.tokens ?? []) {
                        token.reset();
                    }
                    canvas.perception.update({ initializeLighting: true, initializeVision: true }, true);
                },
            },
            iwr: {
                prefix: "automation.",
                name: CONFIG.PF2E.SETTINGS.automation.iwr.name,
                hint: CONFIG.PF2E.SETTINGS.automation.iwr.hint,
                default: true,
                type: Boolean,
                onChange: (value) => {
                    game.pf2e.settings.iwr = !!value;
                },
            },
            effectExpiration: {
                prefix: "automation.",
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
                prefix: "automation.",
                name: CONFIG.PF2E.SETTINGS.automation.removeExpiredEffects.name,
                hint: CONFIG.PF2E.SETTINGS.automation.removeExpiredEffects.hint,
                default: false,
                type: Boolean,
            },
            flankingDetection: {
                prefix: "automation.",
                name: CONFIG.PF2E.SETTINGS.automation.flankingDetection.name,
                hint: CONFIG.PF2E.SETTINGS.automation.flankingDetection.hint,
                default: true,
                type: Boolean,
            },
            encumbrance: {
                prefix: "automation.",
                name: "PF2E.SETTINGS.Automation.Encumbrance.Name",
                hint: "PF2E.SETTINGS.Automation.Encumbrance.Hint",
                default: false,
                type: Boolean,
                onChange: (value) => {
                    game.pf2e.settings.encumbrance = !!value;
                },
            },
            lootableNPCs: {
                prefix: "automation.",
                name: CONFIG.PF2E.SETTINGS.automation.lootableNPCs.name,
                hint: CONFIG.PF2E.SETTINGS.automation.lootableNPCs.hint,
                default: true,
                type: Boolean,
            },
        };
    }
}
