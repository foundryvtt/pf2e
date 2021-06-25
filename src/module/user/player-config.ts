const USER_SETTINGS_KEYS = ['uiTheme', 'showEffectPanel', 'showRollDialogs'] as const;
type UserSettingsKey = typeof USER_SETTINGS_KEYS[number];
interface PlayerSettings {
    uiTheme: 'blue' | 'red' | 'original' | 'ui';
    showEffectPanel: boolean;
    showRollDialogs: boolean;
}

/** Player-specific settings, stored as flags on each world User
 * @category Other
 */
export class PlayerConfigPF2e extends FormApplication {
    settings: PlayerSettings;

    constructor() {
        super();
        this.settings = mergeObject(PlayerConfigPF2e.defaultSettings, game.user.getFlag('pf2e', 'settings'));
    }

    static async init(): Promise<void> {
        if (game.user.getFlag('pf2e', 'settings') === undefined) {
            await game.user.setFlag('pf2e', 'settings', PlayerConfigPF2e.defaultSettings);
        }
    }

    static readonly defaultSettings: PlayerSettings = {
        uiTheme: 'blue',
        showEffectPanel: true,
        showRollDialogs: true,
    };

    static override get defaultOptions(): FormApplicationOptions {
        return mergeObject(super.defaultOptions, {
            id: 'pf2e-player-config-panel',
            title: 'PF2e Player Settings',
            template: 'systems/pf2e/templates/user/player-config.html',
            classes: ['sheet'],
            width: 500,
            height: 'auto',
            resizable: false,
        });
    }

    override getData(): FormApplicationData & PlayerSettings {
        return { ...super.getData(), ...this.settings };
    }

    static activateColorScheme(): void {
        console.debug('PF2e System | Activating Player Configured color scheme');
        const color = game.user.getFlag('pf2e', 'settings.uiTheme') ?? PlayerConfigPF2e.defaultSettings.uiTheme;

        const cssLink = `<link id="pf2e-color-scheme" href="systems/pf2e/styles/user/color-scheme-${color}.css" rel="stylesheet" type="text/css">`;
        $('head').append(cssLink);
    }

    /**
     * Creates a div for the module and button for the Player Configuration
     * @param html the html element where the button will be created
     */
    static hookOnRenderSettings(): void {
        Hooks.on('renderSettings', (_app: SettingsConfig, html: JQuery) => {
            const configButton = $(
                `<button id="pf2e-player-config" data-action="pf2e-player-config">
                    <i class="fas fa-cogs"></i> ${PlayerConfigPF2e.defaultOptions.title}
                 </button>`,
            );

            const setupButton = html.find('#settings-game');
            setupButton.prepend(configButton);

            configButton.on('click', () => {
                new PlayerConfigPF2e().render(true);
            });
        });
    }

    async _updateObject(_event: Event, formData: FormData & PlayerSettings): Promise<void> {
        const settings = USER_SETTINGS_KEYS.reduce((currentSettings: Record<UserSettingsKey, unknown>, key) => {
            currentSettings[key] = formData[key] ?? this.settings[key];
            return currentSettings;
        }, this.settings);

        await game.user.setFlag('pf2e', `settings`, settings);
        $('link#pf2e-color-scheme').attr({ href: `systems/pf2e/styles/user/color-scheme-${formData['uiTheme']}.css` });
    }
}
