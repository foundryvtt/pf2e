import { localizer } from "@util";
import { DateTime } from "luxon";

type SettingsKey =
    | "dateTheme"
    | "timeConvention"
    | "playersCanView"
    | "syncDarkness"
    | "worldCreatedOn"
    | "showClockButton";

interface FormInputData extends Omit<SettingConfig, "config" | "namespace" | "scope"> {
    value: unknown;
    isSelect: boolean;
    isCheckbox: boolean;
    isDateTime: boolean;
}

interface TemplateData extends FormApplicationData {
    settings: FormInputData[];
}

interface UpdateData {
    dateTheme: string;
    timeConvention: boolean;
    playersCanView: boolean;
    syncDarkness: boolean;
    syncDarknessScene: boolean;
    worldCreatedOn: string;
    showClockButton: boolean;
}

export class WorldClockSettings extends FormApplication {
    static override get defaultOptions(): FormApplicationOptions {
        return mergeObject(super.defaultOptions, {
            title: CONFIG.PF2E.SETTINGS.worldClock.name,
            id: "world-clock-settings",
            template: "systems/pf2e/templates/system/settings/world-clock/index.hbs",
            width: 550,
            height: "auto",
            closeOnSubmit: true,
        });
    }

    override async getData(): Promise<TemplateData> {
        const worldDefault = game.settings.get("pf2e", "worldClock.syncDarkness")
            ? game.i18n.localize(CONFIG.PF2E.SETTINGS.worldClock.syncDarknessScene.enabled)
            : game.i18n.localize(CONFIG.PF2E.SETTINGS.worldClock.syncDarknessScene.disabled);
        const sceneSetting: [string, SettingRegistration] = [
            "syncDarknessScene",
            {
                name: CONFIG.PF2E.SETTINGS.worldClock.syncDarknessScene.name,
                hint: CONFIG.PF2E.SETTINGS.worldClock.syncDarknessScene.hint,
                default: "default",
                type: String,
                choices: {
                    enabled: CONFIG.PF2E.SETTINGS.worldClock.syncDarknessScene.enabled,
                    disabled: CONFIG.PF2E.SETTINGS.worldClock.syncDarknessScene.disabled,
                    default: game.i18n.format(CONFIG.PF2E.SETTINGS.worldClock.syncDarknessScene.default, {
                        worldDefault,
                    }),
                },
            },
        ];

        const visibleSettings = [
            ...Object.entries(WorldClockSettings.settings).filter(([key]) => key !== "worldCreatedOn"),
            sceneSetting,
        ];

        const settings: FormInputData[] = visibleSettings.map(([key, setting]) => {
            const value = ((): unknown => {
                if (key === "syncDarknessScene") return canvas.scene?.flags.pf2e.syncDarkness;
                const rawValue = game.settings.get("pf2e", `worldClock.${key}`);

                // Present the world-creation timestamp as an HTML datetime-locale input
                if (key === "worldCreatedOn" && typeof rawValue === "string") {
                    return DateTime.fromISO(rawValue).toFormat("yyyy-MM-dd'T'HH:mm");
                }
                return rawValue;
            })();

            return {
                ...setting,
                key: key,
                value: value,
                isSelect: "choices" in setting,
                isCheckbox: setting.type === Boolean,
                isDateTime: setting.type === String && !("choices" in setting),
            };
        });
        return mergeObject(await super.getData(), { settings });
    }

    /** Register World Clock settings */
    static registerSettings(): void {
        game.settings.register("pf2e", "worldClock.dateTheme", this.settings.dateTheme);
        game.settings.register("pf2e", "worldClock.timeConvention", this.settings.timeConvention);
        game.settings.register("pf2e", "worldClock.playersCanView", this.settings.playersCanView);
        game.settings.register("pf2e", "worldClock.syncDarkness", this.settings.syncDarkness);
        game.settings.register("pf2e", "worldClock.worldCreatedOn", this.settings.worldCreatedOn);
        game.settings.register("pf2e", "worldClock.showClockButton", this.settings.showClockButton);
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);

        const localize = localizer("PF2E.SETTINGS.WorldClock");
        const title = localize("ResetWorldTime.Name");
        $html.find("button.reset-world-time").on("click", async () => {
            const template = await renderTemplate(
                "systems/pf2e/templates/system/settings/world-clock/confirm-reset.hbs"
            );
            Dialog.confirm({
                title: title,
                content: template,
                yes: () => {
                    game.time.advance(-1 * game.time.worldTime);
                    this.close();
                },
                defaultYes: false,
            });
        });

        $html.find<HTMLInputElement>('input[name="syncDarkness"]').on("change", (event) => {
            const worldDefault = $(event.currentTarget)[0].checked
                ? localize("SyncDarknessScene.Enabled")
                : localize("SyncDarknessScene.Disabled");
            const optionSelector = 'select[name="syncDarknessScene"] > option[value="default"]';
            $html.find(optionSelector).text(localize("SyncDarknessScene.Default", { worldDefault }));
        });
    }

    protected override async _updateObject(_event: Event, data: Record<string, unknown> & UpdateData): Promise<void> {
        const keys: (keyof UpdateData)[] = [
            "dateTheme",
            "timeConvention",
            "playersCanView",
            "syncDarkness",
            "showClockButton",
        ];
        for (const key of keys) {
            const settingKey = `worldClock.${key}`;
            const newValue = key === "worldCreatedOn" ? DateTime.fromISO(data[key]).toUTC() : data[key];
            await game.settings.set("pf2e", settingKey, newValue);
        }

        await canvas.scene?.setFlag("pf2e", "syncDarkness", data.syncDarknessScene ?? "default");
        delete (data as { syncDarknessScene?: unknown }).syncDarknessScene;

        game.pf2e.worldClock.render(false);
    }

    /** Settings to be registered and also later referenced during user updates */
    private static get settings(): Record<SettingsKey, SettingRegistration> {
        return {
            // Date theme, currently one of Golarion (Absalom Reckoning), Earth (Material Plane, 95 years ago), or
            // Earth (real world)
            dateTheme: {
                name: CONFIG.PF2E.SETTINGS.worldClock.dateTheme.name,
                hint: CONFIG.PF2E.SETTINGS.worldClock.dateTheme.hint,
                scope: "world",
                config: false,
                default: "AR",
                type: String,
                choices: {
                    AR: CONFIG.PF2E.SETTINGS.worldClock.dateTheme.AR,
                    AD: CONFIG.PF2E.SETTINGS.worldClock.dateTheme.AD,
                    CE: CONFIG.PF2E.SETTINGS.worldClock.dateTheme.CE,
                },
            },
            timeConvention: {
                name: CONFIG.PF2E.SETTINGS.worldClock.timeConvention.name,
                hint: CONFIG.PF2E.SETTINGS.worldClock.timeConvention.hint,
                scope: "world",
                config: false,
                default: 24,
                type: Number,
                choices: {
                    24: CONFIG.PF2E.SETTINGS.worldClock.timeConvention.twentyFour,
                    12: CONFIG.PF2E.SETTINGS.worldClock.timeConvention.twelve,
                },
            },
            // Show the World Clock
            showClockButton: {
                name: CONFIG.PF2E.SETTINGS.worldClock.showClockButton.name,
                hint: CONFIG.PF2E.SETTINGS.worldClock.showClockButton.hint,
                scope: "world",
                config: false,
                default: true,
                type: Boolean,
                onChange: () => {
                    game.settings.set(
                        "pf2e",
                        "worldClock.playersCanView",
                        game.settings.get("pf2e", "worldClock.showClockButton")
                    );
                },
            },
            // Players can view the World Clock
            playersCanView: {
                name: CONFIG.PF2E.SETTINGS.worldClock.playersCanView.name,
                hint: CONFIG.PF2E.SETTINGS.worldClock.playersCanView.hint,
                scope: "world",
                config: false,
                default: false,
                type: Boolean,
            },
            // Synchronize a scene's Darkness Level with the time of day, given Global Illumination is turned on
            syncDarkness: {
                name: CONFIG.PF2E.SETTINGS.worldClock.syncDarkness.name,
                hint: CONFIG.PF2E.SETTINGS.worldClock.syncDarkness.hint,
                scope: "world",
                config: false,
                default: false,
                type: Boolean,
            },
            // The Unix timestamp of the world's creation date
            worldCreatedOn: {
                name: CONFIG.PF2E.SETTINGS.worldClock.worldCreatedOn.name,
                hint: CONFIG.PF2E.SETTINGS.worldClock.worldCreatedOn.hint,
                scope: "world",
                config: false,
                default: DateTime.utc().toISO()!,
                type: String,
            },
        };
    }
}
