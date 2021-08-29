import { ActorPF2e } from "@actor/index";
import { SpellSource } from "@item/spell/data";
import { ErrorPF2e } from "@module/utils";

export class ScrollWandPopup extends FormApplication<ActorPF2e> {
    onSubmitCallback: ScrollWandCallback;
    spellData?: SpellSource;

    constructor(
        object: ActorPF2e,
        options: Partial<FormApplicationOptions>,
        callback: ScrollWandCallback,
        spellData: SpellSource
    ) {
        super(object, options);

        this.spellData = spellData;
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

        if (!this.spellData) {
            throw ErrorPF2e("ScrollWandPopup | Could not read spelldata");
        }

        const minimumLevel = this.spellData.data.level.value;
        const levels = Array.from(Array(11 - minimumLevel).keys()).map((index) => minimumLevel + index);
        sheetData.validLevels = levels;
        return sheetData;
    }

    override async _updateObject(_event: Event, formData: { itemType: string; level: number }) {
        if (formData.itemType === "wand" && formData.level === 10) {
            ui.notifications.warn(game.i18n.localize("PF2E.ScrollWandPopup.10thLevelWand"));
        } else if (this.onSubmitCallback && this.spellData) {
            this.onSubmitCallback(formData.level, formData.itemType, this.spellData);
        }
    }
}

type ScrollWandCallback = (level: number, itemType: string, spellData: SpellSource) => Promise<void>;
