import { SettingsMenuPF2e } from './menu';

type ConfigPF2eListName = typeof AutomationSettings.SETTINGS[number];

export class AutomationSettings extends SettingsMenuPF2e {
    static override readonly namespace = 'automation';

    static override readonly SETTINGS = ['rulesBasedVision', 'effectExpiration', 'lootableNPCs'] as const;

    static override get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: 'PF2E.SETTINGS.Automation.Name',
            id: 'automation-settings',
            template: 'systems/pf2e/templates/system/settings/automation.html',
            width: 550,
            height: 'auto',
            closeOnSubmit: true,
        });
    }

    protected static override get settings(): Record<ConfigPF2eListName, ClientSettingsData> {
        return {
            rulesBasedVision: {
                name: CONFIG.PF2E.SETTINGS.automation.rulesBasedVision.name,
                hint: CONFIG.PF2E.SETTINGS.automation.rulesBasedVision.hint,
                scope: 'world',
                config: false,
                default: false,
                type: Boolean,
            },
            effectExpiration: {
                name: CONFIG.PF2E.SETTINGS.automation.effectExpiration.name,
                hint: CONFIG.PF2E.SETTINGS.automation.effectExpiration.hint,
                scope: 'world',
                config: false,
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
                scope: 'world',
                config: false,
                default: false,
                type: Boolean,
            },
        };
    }
}
