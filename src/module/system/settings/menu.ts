export type PartialSettingsData = Omit<SettingRegistration, "scope" | "config">;

interface SettingsTemplateData extends PartialSettingsData {
    key: string;
    value: unknown;
}

export interface MenuTemplateData extends FormApplicationData {
    settings: SettingsTemplateData[];
}

export abstract class SettingsMenuPF2e extends FormApplication {
    static readonly namespace: string;

    static override get defaultOptions() {
        const options = super.defaultOptions;
        options.classes.push("settings-menu");

        return mergeObject(options, {
            title: `PF2E.SETTINGS.${this.namespace.titleCase()}.Name`,
            id: `${this.namespace}-settings`,
            template: `systems/pf2e/templates/system/settings/menu.html`,
            width: 550,
            height: "auto",
            closeOnSubmit: true,
        });
    }

    get namespace(): string {
        return (this.constructor as typeof SettingsMenuPF2e).namespace;
    }

    static readonly SETTINGS: ReadonlyArray<string>;

    /** Settings to be registered and also later referenced during user updates */
    protected static get settings(): Record<string, PartialSettingsData> {
        return {};
    }

    static registerSettings(): void {
        const settings = this.settings;
        for (const setting of this.SETTINGS) {
            game.settings.register("pf2e", `${this.namespace}.${setting}`, {
                ...settings[setting],
                scope: "world",
                config: false,
            });
        }
    }

    override getData(): MenuTemplateData {
        const settings = (this.constructor as typeof SettingsMenuPF2e).settings;
        const templateData: SettingsTemplateData[] = Object.entries(settings).map(([key, setting]) => {
            const value = game.settings.get("pf2e", `${this.namespace}.${key}`);
            return {
                ...setting,
                key,
                value,
                isSelect: !!setting.choices,
                isCheckbox: setting.type === Boolean,
            };
        });
        return mergeObject(super.getData(), {
            settings: templateData,
            instructions: `PF2E.SETTINGS.${this.namespace.titleCase()}.Hint`,
        });
    }

    protected override async _updateObject(_event: Event, data: Record<string, unknown>): Promise<void> {
        for await (const key of (this.constructor as typeof SettingsMenuPF2e).SETTINGS) {
            const settingKey = `${this.namespace}.${key}`;
            await game.settings.set("pf2e", settingKey, data[key]);
        }
    }
}
