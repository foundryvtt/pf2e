const USER_SETTINGS_KEYS = ["showEffectPanel", "showRollDialogs"] as const;

/** Player-specific settings, stored as flags on each world User */
export class PlayerConfigPF2e extends FormApplication {
    settings: UserSettingsPF2e = game.user.settings;

    static readonly defaultSettings: UserSettingsPF2e = {
        showEffectPanel: true,
        showRollDialogs: false,
        searchPackContents: false,
    };

    static override get defaultOptions(): Required<FormApplicationOptions> {
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

    /**
     * Creates a div for the module and button for the Player Configuration
     * @param html the html element where the button will be created
     */
    static hookOnRenderSettings(): void {
        Hooks.on("renderSettings", (_app, html) => {
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

    async _updateObject(_event: Event, formData: Record<string, unknown> & UserSettingsPF2e): Promise<void> {
        const settings = USER_SETTINGS_KEYS.reduce((currentSettings: Record<UserSettingsKey, unknown>, key) => {
            currentSettings[key] = formData[key] ?? this.settings[key];
            return currentSettings;
        }, this.settings);

        await game.user.update({ "flags.pf2e.settings": settings });
    }
}

interface PlayerConfigData extends FormApplicationData, UserSettingsPF2e {
    developMode: boolean;
}

type UserSettingsKey = typeof USER_SETTINGS_KEYS[number];
export interface UserSettingsPF2e {
    showEffectPanel: boolean;
    showRollDialogs: boolean;
    searchPackContents: boolean;
}
