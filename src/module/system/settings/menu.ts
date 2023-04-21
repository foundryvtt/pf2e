export type PartialSettingsData = Omit<SettingRegistration, "scope" | "config">;

interface SettingsTemplateData extends PartialSettingsData {
    key: string;
    value: unknown;
    isSelect: boolean;
    isCheckbox: boolean;
}

interface MenuTemplateData extends FormApplicationData {
    settings: Record<string, SettingsTemplateData>;
}

abstract class SettingsMenuPF2e extends FormApplication {
    static readonly namespace: string;
    cache: Record<string, unknown> = {};

    static override get defaultOptions(): FormApplicationOptions {
        const options = super.defaultOptions;
        options.classes.push("settings-menu", "sheet");

        return mergeObject(options, {
            title: `PF2E.SETTINGS.${this.namespace.titleCase()}.Name`,
            id: `${this.namespace}-settings`,
            template: `systems/pf2e/templates/system/settings/menu.hbs`,
            width: 550,
            height: "auto",
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: "form" }],
            closeOnSubmit: false,
            submitOnChange: true,
        });
    }

    static get prefix(): string {
        return `${this.namespace}.`;
    }

    get namespace(): string {
        return this.constructor.namespace;
    }

    get prefix(): string {
        return this.constructor.prefix;
    }

    static readonly SETTINGS: readonly string[];

    /** Settings to be registered and also later referenced during user updates */
    protected static get settings(): Record<string, PartialSettingsData> {
        return {};
    }

    static registerSettings(): void {
        const settings = this.settings;
        for (const setting of this.SETTINGS) {
            game.settings.register("pf2e", `${this.prefix}${setting}`, {
                ...settings[setting],
                scope: "world",
                config: false,
            });
        }
    }

    override async getData(): Promise<MenuTemplateData> {
        const settings = (this.constructor as typeof SettingsMenuPF2e).settings;
        const templateData = settingsToSheetData(settings, this.cache, this.prefix);
        return mergeObject(await super.getData(), {
            settings: templateData,
            instructions: `PF2E.SETTINGS.${this.namespace.titleCase()}.Hint`,
        });
    }

    protected override async _updateObject(event: Event, data: Record<string, unknown>): Promise<void> {
        for (const key of (this.constructor as typeof SettingsMenuPF2e).SETTINGS) {
            const settingKey = `${this.prefix}${key}`;
            const value = data[key];
            this.cache[key] = value;
            if (event.type === "submit") {
                await game.settings.set("pf2e", settingKey, value);
            }
        }

        if (event.type === "submit") {
            this.close();
        } else {
            this.render();
        }
    }

    /** Overriden to add some additional first-render behavior */
    protected override _injectHTML($html: JQuery<HTMLElement>): void {
        super._injectHTML($html);

        // Initialize cache
        for (const key of (this.constructor as typeof SettingsMenuPF2e).SETTINGS) {
            const settingKey = `${this.prefix}${key}`;
            this.cache[key] = game.settings.get("pf2e", settingKey);
        }
    }
}

interface SettingsMenuPF2e extends FormApplication {
    constructor: typeof SettingsMenuPF2e;
}

function settingsToSheetData(
    settings: Record<string, PartialSettingsData>,
    cache: Record<string, unknown>,
    prefix = ""
): Record<string, SettingsTemplateData> {
    return Object.entries(settings).reduce((result: Record<string, SettingsTemplateData>, [key, setting]) => {
        const lookupKey = `${prefix}${key}`;
        const value = key in cache ? cache[key] : game.settings.get("pf2e", lookupKey);
        cache[key] = value;
        result[key] = {
            ...setting,
            key,
            value,
            isSelect: !!setting.choices,
            isCheckbox: setting.type === Boolean,
        };

        return result;
    }, {});
}

export { MenuTemplateData, SettingsMenuPF2e, SettingsTemplateData, settingsToSheetData };
