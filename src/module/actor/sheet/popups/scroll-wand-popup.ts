import { ActorPF2e } from "@actor/index";
import { SpellPF2e } from "@item";
import { ErrorPF2e } from "@util";

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
        options.template = "systems/pf2e/templates/popups/scroll-wand-popup.html";
        options.width = "auto";

        return options;
    }

    override async getData(): Promise<FormApplicationData<ActorPF2e>> {
        const sheetData: FormApplicationData<ActorPF2e> & { validLevels?: number[] } = await super.getData();

        if (!this.spell) {
            throw ErrorPF2e("ScrollWandPopup | Could not read spelldata");
        }

        const minimumLevel = this.spell.baseLevel;
        const levels = Array.from(Array(11 - minimumLevel).keys()).map((index) => minimumLevel + index);
        sheetData.validLevels = levels;
        return sheetData;
    }

    override async _updateObject(_event: Event, formData: { itemType: string; level: number }) {
        if (formData.itemType === "wand" && formData.level === 10) {
            ui.notifications.warn(game.i18n.localize("PF2E.ScrollWandPopup.10thLevelWand"));
        } else if (this.onSubmitCallback && this.spell) {
            this.onSubmitCallback(formData.level, formData.itemType, this.spell);
        }
    }
}

type ScrollWandCallback = (level: number, itemType: string, spell: SpellPF2e) => Promise<void>;
