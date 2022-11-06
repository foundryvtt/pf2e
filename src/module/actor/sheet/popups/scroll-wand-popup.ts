import { ActorPF2e } from "@actor/index";
import { SpellPF2e } from "@item";
import { OneToTen } from "@module/data";
import { ErrorPF2e } from "@util";

type FormData = {
    isCantrip?: boolean;
    validLevels?: number[];
};

export class ScrollWandPopup extends FormApplication<ActorPF2e> {
    onSubmitCallback: ScrollWandCallback;
    spell?: SpellPF2e;

    constructor(
        object: ActorPF2e,
        options: Partial<FormApplicationOptions>,
        callback: ScrollWandCallback,
        spell: SpellPF2e
    ) {
        super(object, options);

        this.spell = spell;
        this.onSubmitCallback = callback;
    }

    static override get defaultOptions() {
        const options = super.defaultOptions;

        options.classes = [];
        options.title = game.i18n.localize("PF2E.ScrollWandPopup.title");
        options.template = "systems/pf2e/templates/popups/scroll-wand-popup.hbs";
        options.width = "auto";

        return options;
    }

    override async getData(): Promise<FormApplicationData<ActorPF2e>> {
        const sheetData: FormApplicationData<ActorPF2e> & FormData = await super.getData();

        if (!this.spell) {
            throw ErrorPF2e("ScrollWandPopup | Could not read spelldata");
        }

        sheetData.isCantrip = this.spell.system.traits.value.includes("cantrip") ?? false;
        const minimumLevel = this.spell.baseLevel;
        const levels = sheetData.isCantrip
            ? [1]
            : Array.from(Array(11 - minimumLevel).keys()).map((index) => minimumLevel + index);
        sheetData.validLevels = levels;
        return sheetData;
    }

    override async _updateObject(_event: Event, formData: { itemType: string; level: OneToTen }) {
        if (formData.itemType === "wand" && formData.level === 10) {
            ui.notifications.warn(game.i18n.localize("PF2E.ScrollWandPopup.10thLevelWand"));
        } else if (this.onSubmitCallback && this.spell) {
            this.onSubmitCallback(formData.level, formData.itemType, this.spell);
        }
    }
}

type ScrollWandCallback = (level: OneToTen, itemType: string, spell: SpellPF2e) => Promise<void>;
