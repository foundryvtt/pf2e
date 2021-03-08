interface PlayerSettings {
    color: 'blue' | 'red' | 'original' | 'ui';
    quickD20roll: boolean;
}

/** Player-specific settings, stored as flags on each world User
 * @category Other
 */
export class PlayerConfigPF2e extends FormApplication {
    settings: PlayerSettings;

    static readonly defaultSettings: PlayerSettings = {
        color: 'blue',
        quickD20roll: false,
    };

    constructor() {
        super();
        this.settings = mergeObject(PlayerConfigPF2e.defaultSettings, game.user.data.flags.PF2e?.settings ?? {});
    }

    static async init(): Promise<void> {
        if (game.user.data.flags.PF2e?.settings === undefined) {
            await game.user.update({ flags: { PF2e: { settings: PlayerConfigPF2e.defaultSettings } } });
        }
    }

    static activateColorScheme(): void {
        console.debug('PF2e System | Activating Player Configured color scheme');
        const color = game.user.data.flags.PF2e?.settings?.color ?? PlayerConfigPF2e.defaultSettings.color;

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

    /** @override */
    static get defaultOptions(): FormApplicationOptions {
        return mergeObject(super.defaultOptions, {
            id: 'pf2e-player-config-panel',
            title: 'PF2e Player Settings',
            template: 'systems/pf2e/templates/user/player-config.html',
            classes: ['sheet'],
            width: 500,
            height: 'auto',
            resizable: true,
        });
    }

    /** @override */
    async _updateObject(_event: Event, formData: FormApplicationData & Required<PlayerSettings>): Promise<void> {
        const settingsKeys = ['color', 'quickD20roll'] as const;
        this.settings = settingsKeys.reduce(
            (settings: PlayerSettings, setting) => ({ ...settings, [setting]: formData[setting] }),
            {} as PlayerSettings,
        );
        $('link#pf2e-color-scheme').attr({ href: `systems/pf2e/styles/user/color-scheme-${formData.color}.css` });

        await game.user.update({ flags: { PF2e: { settings: this.settings } } });
    }

    getData(): FormApplicationData & PlayerSettings {
        return { ...super.getData(), ...this.settings };
    }
}
