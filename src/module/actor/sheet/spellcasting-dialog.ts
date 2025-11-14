import type { CreaturePF2e } from "@actor";
import type { AttributeString } from "@actor/types.ts";
import { SpellcastingEntryPF2e } from "@item";
import type { SpellcastingEntrySource, SpellcastingEntrySystemSource } from "@item/spellcasting-entry/data.ts";
import { ordinalString } from "@util";
import * as R from "remeda";
import appv1 = foundry.appv1;

/** Dialog to create or edit spellcasting entries. It works on a clone of spellcasting entry, but will not persist unless the changes are accepted */
class SpellcastingCreateAndEditDialog extends appv1.api.FormApplication<SpellcastingEntryPF2e<CreaturePF2e>> {
    constructor(object: SpellcastingEntryPF2e<CreaturePF2e>, options?: Partial<appv1.api.FormApplicationOptions>) {
        super(object.clone({}, { keepId: true }), options);
    }

    static override get defaultOptions(): appv1.api.FormApplicationOptions {
        return {
            ...super.defaultOptions,
            id: "spellcasting-dialog",
            template: `${SYSTEM_ROOT}/templates/actors/spellcasting-dialog.hbs`,
            title: "PF2E.SpellcastingSettings.Title",
            width: 350,
            height: "auto",
            closeOnSubmit: false,
            submitOnChange: true,
        };
    }

    override async getData(): Promise<SpellcastingCreateAndEditDialogSheetData> {
        const actor = this.object.actor;
        const extraStatistics = actor.synthetics.statistics.values();
        const classDCs = actor.isOfType("character")
            ? Object.values(actor.system.proficiencies.classDCs).filter((cdc) => cdc.rank > 0)
            : [];

        const selectedStatistic = actor.getStatistic(this.object.system.proficiency.slug);

        return {
            ...(await super.getData()),
            actor,
            system: this.object.toObject().system,
            statistics: [
                ...extraStatistics,
                ...classDCs.map((c) => ({
                    slug: c.slug,
                    label: game.i18n.format("PF2E.Actor.Character.ClassDC.LabelSpecific", { class: c.label }),
                })),
            ],
            magicTraditions: CONFIG.PF2E.magicTraditions,
            spellcastingTypes: R.omit(
                CONFIG.PF2E.preparationType,
                (["ritual", actor.type === "character" ? "items" : null] as const).filter(R.isTruthy),
            ),
            attributes: CONFIG.PF2E.abilities,
            isAttributeConfigurable: this.#canSetAttribute(),
            selectedAttribute: selectedStatistic?.attribute ?? this.object.attribute,
            autoHeightenLevels: Object.fromEntries(
                R.range(1, 11).map((level) => [
                    level.toString(),
                    game.i18n.format("PF2E.Item.Spell.Rank.Ordinal", { rank: ordinalString(level) }),
                ]),
            ),
            validItemTypes: { scroll: "PF2E.Actor.Creature.Spellcasting.ValidItemTypes.Scroll" },
        };
    }

    /** Returns whether or not the spellcasting data can include an ability */
    #canSetAttribute(): boolean {
        const slug = this.object._source.system.proficiency.slug;
        const actor = this.object.actor;
        const baseStat = actor.isOfType("character") ? actor.getStatistic(slug) : null;
        return !slug || (!!baseStat && !baseStat.attribute);
    }

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        const wasInnate = this.object.isInnate;

        // Unflatten the form data, so that we may make some modifications
        const inputData: DeepPartial<SpellcastingEntrySource> = fu.expandObject(formData);

        // We may disable certain form data, so reinject it
        const system = fu.mergeObject(
            inputData.system ?? {},
            {
                prepared: {
                    value: this.object.system.prepared.value,
                },
                ability: { value: "cha" },
            },
            { overwrite: false },
        );

        inputData.system = system;

        // When swapping to innate convert to cha, but allow changes after
        if (system.prepared.value === "innate" && !wasInnate) {
            system.ability.value = "cha";
        }

        // If the proficiency is being set to a value, remove the selected ability
        if (system.proficiency?.slug) {
            system.ability.value = "";
        }

        if (system?.autoHeightenLevel) {
            system.autoHeightenLevel.value ||= null;
        }

        this.object.updateSource(inputData);

        // If this wasn't a submit, only re-render and exit
        if (event.type !== "submit") {
            this.render();
            return;
        }

        return this.updateAndClose();
    }

    private async updateAndClose(): Promise<void> {
        const updateData = this.object.toObject();

        if (!this.object.isPrepared) {
            delete updateData.system.prepared.flexible;
        }

        const actor = this.object.actor;

        if (this.object.id === null) {
            updateData.name = (() => {
                const locKey = CONFIG.PF2E.preparationType[updateData.system.prepared.value];
                const preparationType = game.i18n.localize(locKey);
                const magicTraditions: Record<string, string> = CONFIG.PF2E.magicTraditions;
                const traditionSpells = game.i18n.localize(magicTraditions[this.object.tradition ?? ""]);
                if (!traditionSpells) {
                    return preparationType;
                } else {
                    return game.i18n.format("PF2E.SpellCastingFormat", { preparationType, traditionSpells });
                }
            })();

            await actor.createEmbeddedDocuments("Item", [updateData]);
        } else {
            const actualEntry = actor.spellcasting.get(this.object.id);
            if (!(actualEntry instanceof SpellcastingEntryPF2e)) return;

            const system = R.pick(updateData.system, [
                "prepared",
                "tradition",
                "ability",
                "proficiency",
                "autoHeightenLevel",
            ]);
            await actualEntry.update({ system });
        }

        this.close();
    }
}

interface SpellcastingCreateAndEditDialogSheetData
    extends appv1.api.FormApplicationData<SpellcastingEntryPF2e<CreaturePF2e>> {
    actor: CreaturePF2e;
    system: SpellcastingEntrySystemSource;
    magicTraditions: typeof CONFIG.PF2E.magicTraditions;
    statistics: { slug: string; label: string }[];
    spellcastingTypes: Partial<typeof CONFIG.PF2E.preparationType>;
    attributes: typeof CONFIG.PF2E.abilities;
    isAttributeConfigurable: boolean;
    selectedAttribute: AttributeString;
    autoHeightenLevels: Record<string, string>;
    validItemTypes: Record<string, string>;
}

async function createSpellcastingDialog(
    object: CreaturePF2e | SpellcastingEntryPF2e<CreaturePF2e>,
): Promise<SpellcastingCreateAndEditDialog> {
    const item =
        "prototypeToken" in object
            ? (new SpellcastingEntryPF2e(
                  {
                      name: "Untitled",
                      type: "spellcastingEntry",
                      system: {
                          ability: { value: "cha" },
                          spelldc: { value: 0, dc: 0 },
                          tradition: { value: "arcane" },
                          prepared: { value: "innate" },
                      },
                  },
                  { parent: object },
              ) as SpellcastingEntryPF2e<CreaturePF2e>)
            : object;
    return new SpellcastingCreateAndEditDialog(item).render(true);
}

export { createSpellcastingDialog };
