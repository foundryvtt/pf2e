const USER_SETTINGS_KEYS = ["uiTheme", "showEffectPanel", "showRollDialogs", "darkvisionFilter"] as const;

/** Player-specific settings, stored as flags on each world User */
export class PlayerConfigPF2e extends FormApplication {
    settings: UserSettingsPF2e;

    constructor() {
        super();
        this.settings = game.user.settings;
    }

    static readonly defaultSettings: UserSettingsPF2e = {
        uiTheme: "blue",
        showEffectPanel: true,
        showRollDialogs: true,
        darkvisionFilter: false,
    };

    static override get defaultOptions(): FormApplicationOptions {
        return mergeObject(super.defaultOptions, {
            id: "pf2e-player-config-panel",
            title: "PF2e Player Settings",
            template: "systems/pf2e/templates/user/player-config.html",
            classes: ["sheet"],
            width: 500,
            height: "auto",
            resizable: false,
        });
    }

    override getData(): PlayerConfigData {
        return { ...super.getData(), ...this.settings, developMode: BUILD_MODE === "development" };
    }

    static activateColorScheme(): void {
        console.debug("PF2e System | Activating Player Configured color scheme");
        const color = game.user.getFlag("pf2e", "settings.uiTheme") ?? PlayerConfigPF2e.defaultSettings.uiTheme;

        const cssLink = `<link id="pf2e-color-scheme" href="systems/pf2e/styles/user/color-scheme-${color}.css" rel="stylesheet" type="text/css">`;
        $("head").append(cssLink);
    }

    /**
     * Creates a div for the module and button for the Player Configuration
     * @param html the html element where the button will be created
     */
    static hookOnRenderSettings(): void {
        Hooks.on("renderSettings", (_app: SettingsConfig, html: JQuery) => {
            const configButton = $(
                `<button id="pf2e-player-config" data-action="pf2e-player-config">
                    <i class="fas fa-cogs"></i> ${PlayerConfigPF2e.defaultOptions.title}
                 </button>`
            );

            const setupButton = html.find("#settings-game");
            setupButton.prepend(configButton);

            configButton.on("click", () => {
                new PlayerConfigPF2e().render(true);
            });
        });
    }

    async _updateObject(_event: Event, formData: FormData & UserSettingsPF2e): Promise<void> {
        const settings = USER_SETTINGS_KEYS.reduce((currentSettings: Record<UserSettingsKey, unknown>, key) => {
            currentSettings[key] = formData[key] ?? this.settings[key];
            return currentSettings;
        }, this.settings);

        await game.user.setFlag("pf2e", `settings`, settings);
        $("link#pf2e-color-scheme").attr({ href: `systems/pf2e/styles/user/color-scheme-${formData["uiTheme"]}.css` });
    }
}

interface PlayerConfigData extends FormApplicationData, UserSettingsPF2e {
    developMode: boolean;
}

type UserSettingsKey = typeof USER_SETTINGS_KEYS[number];
export interface UserSettingsPF2e {
    uiTheme: "blue" | "red" | "original" | "ui";
    showEffectPanel: boolean;
    showRollDialogs: boolean;
    darkvisionFilter: boolean;
}
