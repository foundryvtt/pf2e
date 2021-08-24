import { AbilityString } from "@actor/data";
import { ABILITY_ABBREVIATIONS } from "@actor/data/values";
import { SpellcastingEntryPF2e } from "@item";
import { MagicTradition, PreparationType } from "@item/spellcasting-entry/data";

interface SpellcastingDialogOptions {
    entry?: SpellcastingEntryPF2e;
    callback: (result: SpellcastingDialogResult, $html: JQuery) => void;
}

export interface SpellcastingDialogResult {
    spellcastingType: PreparationType;
    tradition: MagicTradition | "";
    ability: AbilityString | "";
}

class SpellcastingCreateAndEditDialog extends Application {
    private entry = this.dialogOptions.entry;

    result: SpellcastingDialogResult = {
        spellcastingType: this.entry?.data.data.prepared.value ?? "innate",
        tradition: this.entry?.tradition ?? "arcane",
        ability: this.entry?.ability ?? "cha",
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

    override activateListeners($html: JQuery) {
        const typeField = $html.find('[name="spellcastingType"]');
        const traditionField = $html.find('[name="magicTradition"]');
        const abilityField = $html.find('[name="ability"]');

        const updateData = () => {
            this.result.spellcastingType = String(typeField.val()) as PreparationType;
            this.result.tradition = String(traditionField.val()) as MagicTradition | "";
            this.result.ability = String(abilityField.val()) as AbilityString | "";
            if (this.result.spellcastingType === "ritual") {
                this.result.tradition = "";
                this.result.ability = "";
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

        $html.find("[data-button='finish']").on("click", () => {
            updateData();
            this.dialogOptions.callback(this.result, $html);
            this.close();
        });
    }

    override getData() {
        const abilities = Object.fromEntries(ABILITY_ABBREVIATIONS.map((key) => [key, CONFIG.PF2E.abilities[key]]));

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
