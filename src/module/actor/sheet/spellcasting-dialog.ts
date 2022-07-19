import { ActorPF2e } from "@actor";
import { SpellcastingEntryPF2e } from "@item";
import { SpellcastingEntrySystemData } from "@item/spellcasting-entry/data";
import { pick } from "@util";

function createEmptySpellcastingEntry(actor: ActorPF2e): Embedded<SpellcastingEntryPF2e> {
    return new SpellcastingEntryPF2e(
        {
            name: "Untitled",
            type: "spellcastingEntry",
            data: {
                ability: { value: "cha" },
                spelldc: { value: 0, dc: 0, mod: 0 },
                tradition: { value: "arcane" },
                prepared: { value: "innate" },
            },
        },
        { actor }
    ) as Embedded<SpellcastingEntryPF2e>;
}

/** Dialog to create or edit spellcasting entries. It works on a clone of spellcasting entry, but will not persist unless the changes are accepted */
class SpellcastingCreateAndEditDialog extends FormApplication<Embedded<SpellcastingEntryPF2e>> {
    private actor: ActorPF2e;

    constructor(object: ActorPF2e | Embedded<SpellcastingEntryPF2e>, options: Partial<FormApplicationOptions>) {
        super(
            object instanceof ActorPF2e ? createEmptySpellcastingEntry(object) : object.clone({}, { keepId: true }),
            options
        );
        this.actor = object instanceof ActorPF2e ? object : object.actor;
    }

    static override get defaultOptions(): FormApplicationOptions {
        const options = super.defaultOptions;
        options.id = "spellcasting-dialog";
        options.classes = [];
        options.title = game.i18n.localize("PF2E.SpellcastingTypeLabel");
        options.template = "systems/pf2e/templates/actors/spellcasting-dialog.html";
        options.width = 300;
        options.submitOnChange = true;
        options.closeOnSubmit = false;
        return options;
    }

    override async getData(): Promise<SpellcastingCreateAndEditDialogSheetData> {
        return {
            ...(await super.getData()),
            data: this.object.toObject(false).data,
            magicTraditions: CONFIG.PF2E.magicTraditions,
            spellcastingTypes: CONFIG.PF2E.preparationType,
            abilities: CONFIG.PF2E.abilities,
        };
    }

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        const wasInnate = this.object.isInnate;
        this.object.data.update(expandObject(formData));

        // When swapping to innate, convert to cha, but don't force it
        if (this.object.isInnate && !wasInnate) {
            this.object.data.data.ability.value = "cha";
        }

        // If this wasn't a submit, only re-render and exit
        if (event.type !== "submit") {
            this.render();
            return;
        }

        const updateData = this.object.toObject();

        if (this.object.isRitual) {
            updateData.data.tradition.value = "";
            updateData.data.ability.value = "";
        }

        if (!this.object.isPrepared) {
            delete updateData.data.prepared.flexible;
        }

        if (this.object.id === null) {
            const preparationType =
                game.i18n.localize(CONFIG.PF2E.preparationType[updateData.data.prepared.value]) ?? "";
            const traditionSpells = game.i18n.localize(CONFIG.PF2E.magicTraditions[this.object.tradition]);
            updateData.name = this.object.isRitual
                ? preparationType
                : game.i18n.format("PF2E.SpellCastingFormat", { preparationType, traditionSpells });

            this.actor.createEmbeddedDocuments("Item", [updateData]);
        } else {
            const actualEntry = this.actor.spellcasting.get(this.object.id);
            const data = pick(updateData.data, ["prepared", "tradition", "ability"]);
            actualEntry?.update({ data });
        }

        this.close();
    }
}

interface SpellcastingCreateAndEditDialogSheetData extends FormApplicationData<Embedded<SpellcastingEntryPF2e>> {
    data: SpellcastingEntrySystemData;
    magicTraditions: ConfigPF2e["PF2E"]["magicTraditions"];
    spellcastingTypes: ConfigPF2e["PF2E"]["preparationType"];
    abilities: ConfigPF2e["PF2E"]["abilities"];
}

export async function createSpellcastingDialog(
    event: JQuery.ClickEvent,
    object: ActorPF2e | Embedded<SpellcastingEntryPF2e>
) {
    const dialog = new SpellcastingCreateAndEditDialog(object, {
        top: event.clientY - 80,
        left: window.innerWidth - 710,
        height: "auto",
    });
    return dialog.render(true);
}
