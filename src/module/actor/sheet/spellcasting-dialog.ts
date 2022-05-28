import { AbilityString } from "@actor/data";
import { ABILITY_ABBREVIATIONS } from "@actor/data/values";
import { SpellcastingEntryPF2e } from "@item";
import { MagicTradition } from "@item/spell/types";
import { PreparationType } from "@item/spellcasting-entry/data";

interface SpellcastingDialogOptions {
    entry?: SpellcastingEntryPF2e;
    callback: (result: SpellcastingDialogResult, $html: JQuery) => void;
}

export interface SpellcastingDialogResult {
    spellcastingType: PreparationType;
    tradition: MagicTradition | "";
    ability: AbilityString | "";
    flexible: boolean;
}

class SpellcastingCreateAndEditDialog extends Application {
    private entry = this.dialogOptions.entry;

    result: SpellcastingDialogResult = {
        spellcastingType: this.entry?.data.data.prepared.value ?? "innate",
        tradition: this.entry?.tradition ?? "arcane",
        ability: this.entry?.ability ?? "cha",
        flexible: this.entry?.data.data.prepared.flexible ?? false,
    };

    constructor(options: Partial<ApplicationOptions>, private dialogOptions: SpellcastingDialogOptions) {
        super(options);
    }

    static override get defaultOptions(): ApplicationOptions {
        const options = super.defaultOptions;
        options.id = "spellcasting-dialog";
        options.classes = [];
        options.title = game.i18n.localize("PF2E.SpellcastingTypeLabel");
        options.template = "systems/pf2e/templates/actors/spellcasting-dialog.html";
        options.width = 300;
        return options;
    }

    override activateListeners($html: JQuery): void {
        const typeField = $html.find("[name=spellcasting-type]");
        const traditionField = $html.find("[name=magic-tradition]");
        const abilityField = $html.find("[name=ability]");
        const flexibleField = $html.find("[name=flexible]");

        const updateData = () => {
            this.result.spellcastingType = String(typeField.val()) as PreparationType;
            this.result.tradition = String(traditionField.val()) as MagicTradition | "";
            this.result.ability = String(abilityField.val()) as AbilityString | "";
            this.result.flexible = Boolean(flexibleField.prop("checked"));

            if (this.result.spellcastingType === "ritual") {
                this.result.tradition = "";
                this.result.ability = "";
            }
            if (this.result.spellcastingType !== "prepared") {
                this.result.flexible = false;
            }
        };

        typeField.on("change", () => {
            const wasRitual = this.result.spellcastingType === "ritual";
            updateData();

            if (wasRitual && this.result.spellcastingType !== "ritual") {
                this.result.tradition = "arcane";
                this.result.ability = "cha";
            }

            if (this.result.spellcastingType === "innate") {
                this.result.ability = "cha";
            }

            this.render(true);
        });

        $html.find("[data-button=finish]").on("click", () => {
            updateData();
            this.dialogOptions.callback(this.result, $html);
            this.close();
        });
    }

    override getData() {
        const abilities = Object.fromEntries(
            Array.from(ABILITY_ABBREVIATIONS).map((key) => [key, CONFIG.PF2E.abilities[key]])
        );

        return {
            magicTraditions: CONFIG.PF2E.magicTraditions,
            spellcastingTypes: CONFIG.PF2E.preparationType,
            entry: this.entry,
            data: this.result,
            abilities,
        };
    }
}

export async function createSpellcastingDialog(event: JQuery.ClickEvent, options: SpellcastingDialogOptions) {
    const dialog = new SpellcastingCreateAndEditDialog(
        {
            top: event.clientY - 80,
            left: window.innerWidth - 710,
            height: "auto",
        },
        options
    );
    return dialog.render(true);
}
