import { MenuTemplateData, PartialSettingsData, SettingsMenuPF2e } from "../menu";
import Tagify from "@yaireo/tagify";
import { prepareCleanup } from "./cleanup-migration";
import { LocalizePF2e } from "@module/system/localize";
import { MigrationRunner } from "@module/migration/runner";
import { MigrationBase } from "@module/migration/base";
import { BaseWeaponType } from "@item/weapon/data";

import "@yaireo/tagify/src/tagify.scss";
import { objectHasKey, sluggify } from "@util";
import { ItemSheetPF2e } from "@item/sheet/base";

export type ConfigPF2eHomebrewList = typeof HomebrewElements.SETTINGS[number];
export type HomebrewSettingsKey = `homebrew.${ConfigPF2eHomebrewList}`;

export interface HomebrewTag<T extends ConfigPF2eHomebrewList = ConfigPF2eHomebrewList> {
    id: T extends "baseWeapons"
        ? BaseWeaponType
        : T extends Exclude<ConfigPF2eHomebrewList, "baseWeapons">
        ? keyof ConfigPF2e["PF2E"][T]
        : never;
    value: string;
}

export class HomebrewElements extends SettingsMenuPF2e {
    static override readonly namespace = "homebrew";

    /** Whether this is the first time the homebrew tags will have been injected into CONFIG and actor derived data */
    private initialRefresh = true;

    static override readonly SETTINGS = [
        "creatureTraits",
        "featTraits",
        "languages",
        "magicSchools",
        "spellTraits",
        "weaponCategories",
        "weaponGroups",
        "baseWeapons",
        "weaponTraits",
        "equipmentTraits",
    ] as const;

    /** Homebrew elements from some of the above records are propagated to related records */
    private secondaryRecords = {
        weaponTraits: ["npcAttackTraits"],
        equipmentTraits: ["armorTraits", "consumableTraits"],
    } as const;

    static override get defaultOptions() {
        return mergeObject(super.defaultOptions, { template: "systems/pf2e/templates/system/settings/homebrew.html" });
    }

    protected static override get settings(): Record<ConfigPF2eHomebrewList, PartialSettingsData> {
        return this.SETTINGS.map((key): { key: ConfigPF2eHomebrewList; value: PartialSettingsData } => {
            return {
                key,
                value: {
                    name: CONFIG.PF2E.SETTINGS.homebrew[key].name,
                    hint: CONFIG.PF2E.SETTINGS.homebrew[key].hint,
                    default: [],
                    type: Object,
                },
            };
        }).reduce(
            (settings, setting) => mergeObject(settings, { [setting.key]: setting.value }),
            {} as Record<ConfigPF2eHomebrewList, ClientSettingsData & { placeholder: string }>
        );
    }

    override getData(): MenuTemplateData {
        const data = super.getData();
        for (const setting of data.settings) {
            setting.value = JSON.stringify(setting.value);
        }
        return data;
    }

    override activateListeners($form: JQuery<HTMLFormElement>): void {
        super.activateListeners($form);

        $form.find('button[name="reset"]').on("click", () => {
            this.render();
        });

        for (const key of HomebrewElements.SETTINGS) {
            const $input = $form.find<HTMLInputElement>(`input[name="${key}"]`);
            new Tagify($input[0], {
                editTags: 1,
                hooks: {
                    beforeRemoveTag: (tags): Promise<void> => {
                        const translations = LocalizePF2e.translations.PF2E.SETTINGS.Homebrew.ConfirmDelete;
                        const response: Promise<unknown> = (async () => {
                            const content = game.i18n.format(translations.Message, { element: tags[0].data.value });
                            return await Dialog.confirm({
                                title: translations.Title,
                                content: `<p>${content}</p>`,
                            });
                        })();
                        return (async () => ((await response) ? Promise.resolve() : Promise.reject()))();
                    },
                },
            });
        }
    }

    /** Tagify sets an empty input field to "" instead of "[]", which later causes the JSON parse to throw an error */
    protected override async _onSubmit(
        event: Event,
        { updateData = null, preventClose = false, preventRender = false }: OnSubmitFormOptions = {}
    ): Promise<Record<string, unknown>> {
        const $form = $<HTMLFormElement>(this.form);
        $form.find<HTMLInputElement>("tags ~ input").each((_i, input) => {
            if (input.value === "") {
                input.value = "[]";
            }
        });
        return super._onSubmit(event, { updateData, preventClose, preventRender });
    }

    protected override async _updateObject(
        _event: Event,
        data: Record<ConfigPF2eHomebrewList, HomebrewTag[]>
    ): Promise<void> {
        const cleanupTasks = HomebrewElements.SETTINGS.map((key) => {
            for (const tag of data[key]) {
                tag.id ??= `hb_${sluggify(tag.value)}` as string as HomebrewTag<typeof key>["id"];
            }

            return this.processDeletions(key, data[key]);
        }).filter((task): task is MigrationBase => !!task);

        // Close without waiting for migrations to complete
        new MigrationRunner().runMigrations(cleanupTasks);
        await super._updateObject(_event, data);

        // Process updates
        this.refreshTags();
    }

    /** Prepare and run a migration for each set of tag deletions from a tag map */
    private processDeletions(listKey: ConfigPF2eHomebrewList, newTagList: HomebrewTag[]): MigrationBase | null {
        const oldTagList = game.settings.get("pf2e", `homebrew.${listKey}`);
        const newIDList = newTagList.map((tag) => tag.id);
        const deletions: string[] = oldTagList.flatMap((oldTag) => (newIDList.includes(oldTag.id) ? [] : oldTag.id));

        // The base-weapons map only exists in the localization file
        const coreElements: Record<string, string> =
            listKey === "baseWeapons" ? LocalizePF2e.translations.PF2E.Weapon.Base : CONFIG.PF2E[listKey];
        for (const id of deletions) {
            delete coreElements[id];
            if (objectHasKey(this.secondaryRecords, listKey)) {
                for (const recordKey of this.secondaryRecords[listKey]) {
                    const secondaryRecord: Record<string, string> = CONFIG.PF2E[recordKey];
                    delete secondaryRecord[id];
                }
            }
        }

        return game.user.isGM && deletions.length > 0 ? prepareCleanup(listKey, deletions) : null;
    }

    /** Assign the homebrew elements to their respective `CONFIG.PF2E` objects */
    refreshTags() {
        for (const listKey of HomebrewElements.SETTINGS) {
            // The base-weapons map only exists in the localization file
            const coreElements: Record<string, string> =
                listKey === "baseWeapons" ? LocalizePF2e.translations.PF2E.Weapon.Base : CONFIG.PF2E[listKey];
            const settingsKey: HomebrewSettingsKey = `homebrew.${listKey}` as const;
            const elements = game.settings.get("pf2e", settingsKey);
            for (const element of elements) {
                coreElements[element.id] = element.value;
                if (objectHasKey(this.secondaryRecords, listKey)) {
                    for (const recordKey of this.secondaryRecords[listKey]) {
                        const record: Record<string, string> = CONFIG.PF2E[recordKey];
                        record[element.id] = element.value;
                    }
                }
            }
        }

        // Refresh any open sheets to show the new settings
        if (this.initialRefresh) {
            this.initialRefresh = false;
        } else {
            const sheets = Object.values(ui.windows).filter(
                (app): app is DocumentSheet => app instanceof ActorSheet || app instanceof ItemSheetPF2e
            );
            for (const sheet of sheets) {
                sheet.render(false);
            }
        }
    }
}
