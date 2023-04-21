import { ActorPF2e } from "@actor";
import { SpellPF2e } from "@item";
import { SpellConsumableItemType } from "@item/consumable/spell-consumables.ts";
import { OneToTen } from "@module/data.ts";
import { ErrorPF2e } from "@util";

interface FormInputData extends FormApplicationData<ActorPF2e> {
    itemTypeOptions?: Object;
    validLevels?: number[];
    itemType?: SpellConsumableItemType;
    level?: OneToTen;
}

type FormOutputData = {
    itemType: SpellConsumableItemType;
    level: OneToTen;
};

const itemTypeOptions = Object.fromEntries(
    new Map<SpellConsumableItemType, string>([
        ["scroll", "PF2E.CastingItemCreateDialog.scroll"],
        ["wand", "PF2E.CastingItemCreateDialog.wand"],
        ["cantripDeck5", "PF2E.CastingItemCreateDialog.cantripDeck5"],
    ])
);

export class CastingItemCreateDialog extends FormApplication<ActorPF2e> {
    onSubmitCallback: CastingItemCreateCallback;
    spell: SpellPF2e;
    formDataCache: FormOutputData;

    constructor(
        object: ActorPF2e,
        options: Partial<FormApplicationOptions>,
        callback: CastingItemCreateCallback,
        spell: SpellPF2e
    ) {
        super(object, options);

        this.spell = spell;
        this.formDataCache = {
            itemType: this.spell.isCantrip ? "cantripDeck5" : "scroll",
            level: spell.baseLevel,
        };
        this.onSubmitCallback = callback;
    }

    static override get defaultOptions(): FormApplicationOptions {
        const options = super.defaultOptions;

        options.classes = [];
        options.title = game.i18n.localize("PF2E.CastingItemCreateDialog.title");
        options.template = "systems/pf2e/templates/popups/casting-item-create-dialog.hbs";
        options.width = "auto";
        options.submitOnChange = true;
        options.closeOnSubmit = false;

        return options;
    }

    override async getData(): Promise<FormInputData> {
        if (!this.spell) {
            throw ErrorPF2e("CastingItemCreateDialog | Could not read spelldata");
        }

        const { cantripDeck5: cantripDeck5, ...nonCantripOptions } = itemTypeOptions;
        const minimumLevel = this.spell.baseLevel;
        const levels = Array.from(Array(11 - minimumLevel).keys()).map((index) => minimumLevel + index);
        return {
            ...(await super.getData()),
            validLevels: levels,
            itemTypeOptions: this.spell.isCantrip ? { cantripDeck5: cantripDeck5 } : nonCantripOptions,
            itemType: this.formDataCache.itemType,
            level: this.formDataCache.level,
        };
    }

    override async _updateObject(event: Event, formData: FormOutputData): Promise<void> {
        Object.assign(this.formDataCache, formData);

        if (event.type !== "submit") {
            await this.render();
            return;
        }

        if (this.formDataCache.itemType === "wand" && this.formDataCache.level === 10) {
            ui.notifications.warn(game.i18n.localize("PF2E.CastingItemCreateDialog.10thLevelWand"));
        } else if (this.onSubmitCallback && this.spell) {
            this.onSubmitCallback(this.formDataCache.level, this.formDataCache.itemType, this.spell);
        }
        this.close();
    }
}

type CastingItemCreateCallback = (
    level: OneToTen,
    itemType: SpellConsumableItemType,
    spell: SpellPF2e
) => Promise<void>;
