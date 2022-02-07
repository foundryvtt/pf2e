import { ActorDataPF2e } from "@actor/data";
import { FamiliarPF2e } from "@actor/familiar";
import { ActorSheetPF2e } from "@actor/sheet/base";
import { eventToRollParams } from "@scripts/sheet-util";

/**
 * @category Actor
 */
export class FamiliarSheetPF2e extends ActorSheetPF2e<FamiliarPF2e> {
    static override get defaultOptions() {
        const options = super.defaultOptions;
        mergeObject(options, {
            classes: [...options.classes, "actor", "familiar"],
            width: 650,
            height: 680,
            tabs: [{ navSelector: ".sheet-navigation", contentSelector: ".sheet-content", initial: "attributes" }],
        });
        return options;
    }

    override get template() {
        return "systems/pf2e/templates/actors/familiar-sheet.html";
    }

    override async getData() {
        console.log(this.actor.name, "getData1", this.actor.data.data.traits);
        const familiar = this.actor;
        // Get all potential masters of the familiar
        const masters = game.actors.filter((a) => a.type === "character" && a.testUserPermission(game.user, "OWNER"));

        // list of abilities that can be selected as spellcasting ability
        const abilities = CONFIG.PF2E.abilities;

        const size = CONFIG.PF2E.actorSizes[familiar.data.data.traits.size.value] ?? null;
        const familiarAbilities = this.actor.master?.attributes?.familiarAbilities ?? {
            value: 0,
            breakdown: "",
        };

        const familiarTraits: Record<string, string> = CONFIG.PF2E.creatureTraits;
        const traitDescriptions: Record<string, string> = CONFIG.PF2E.traitsDescriptions;

        const traits = Array.from(this.actor.data.data.traits.traits.value)
            .map((trait) => ({
                value: trait,
                label: familiarTraits[trait] ?? trait,
                description: traitDescriptions[trait] ?? "",
            }))
            .sort();

        const senses = this.actor.data.data.traits.senses;

        // TEMPORARY solution for change in 0.8 where actor in super.getData() is an object instead of the data.
        // The correct solution is to subclass ActorSheetPF2e, but that is a more involved fix.
        const actorData = this.actor.toObject(false);
        const baseData = await super.getData();
        baseData.actor = actorData;
        baseData.data = actorData.data;
        baseData.data.traits.senses = senses;

        // Update save labels
        if (baseData.data.saves) {
            for (const key of ["fortitude", "reflex", "will"] as const) {
                const save = baseData.data.saves[key];
                save.label = CONFIG.PF2E.saves[key];
            }
        }

        return {
            ...baseData,
            master: this.actor.master,
            masters,
            abilities,
            size,
            familiarAbilities,
            traits,
        };
    }

    // required but not needed
    protected prepareItems(_sheetData: { actor: ActorDataPF2e }): void {
        return;
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);

        $html.find("[data-skill-check] *").on("click", (event) => {
            const skill = $(event.currentTarget).closest("[data-skill-check]").attr("data-skill-check");
            this.actor.skills[skill ?? ""]?.check.roll(eventToRollParams(event));
        });

        $html.find(".perception").on("click", (event) => {
            const options = this.actor.getRollOptions(["all", "perception"]);
            this.actor.attributes.perception.roll({ event, options });
        });

        $html.find("[data-attack-roll] *").on("click", (event) => {
            const options = this.actor.getRollOptions(["all", "attack"]);
            this.actor.data.data.attack.roll({ event, options });
        });

        $html.find(".crb-trait-selector").on("click", (event) => this.onTraitSelector(event));

        // expand and condense item description
        $html.find(".item-list").on("click", ".expandable", (event) => {
            $(event.currentTarget).removeClass("expandable").addClass("expanded");
        });

        $html.find(".item-list").on("click", ".expanded", (event) => {
            $(event.currentTarget).removeClass("expanded").addClass("expandable");
        });

        if (!this.isEditable) return;

        // item controls
        $html.find(".item-list").on("click", '[data-item-id]:not([data-item-id=""]) .item-edit', (event) => {
            const itemID = $(event.currentTarget).closest("[data-item-id]").attr("data-item-id");
            const item = this.actor.items.get(itemID ?? "");
            if (item) {
                item.sheet.render(true);
            }
        });
    }
}
