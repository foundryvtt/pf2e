import { CharacterPF2e } from "@actor";
import { CreatureSheetData } from "@actor/creature/index.ts";
import { CreatureSheetPF2e } from "@actor/creature/sheet.ts";
import { FamiliarPF2e } from "@actor/familiar/index.ts";
import { AbilityItemPF2e } from "@item";
import { eventToRollParams } from "@scripts/sheet-util.ts";
import { htmlQuery } from "@util";
import * as R from "remeda";

/**
 * @category Actor
 */
export class FamiliarSheetPF2e<TActor extends FamiliarPF2e> extends CreatureSheetPF2e<TActor> {
    /** There is currently no actor config for familiars */
    protected readonly actorConfigClass = null;

    static override get defaultOptions(): ActorSheetOptions {
        const options = super.defaultOptions;
        mergeObject(options, {
            classes: [...options.classes, "familiar"],
            width: 650,
            height: 680,
            tabs: [{ navSelector: ".sheet-navigation", contentSelector: ".sheet-content", initial: "attributes" }],
        });
        return options;
    }

    override get template(): string {
        return "systems/pf2e/templates/actors/familiar-sheet.hbs";
    }

    override async getData(options?: ActorSheetOptions): Promise<FamiliarSheetData<TActor>> {
        const baseData = await super.getData(options);
        const familiar = this.actor;
        // Get all potential masters of the familiar
        const masters = game.actors.filter(
            (a): a is CharacterPF2e<null> => a.type === "character" && a.testUserPermission(game.user, "OWNER")
        );

        // list of abilities that can be selected as spellcasting ability
        const abilities = CONFIG.PF2E.abilities;

        const size = CONFIG.PF2E.actorSizes[familiar.system.traits.size.value] ?? null;
        const familiarAbilities = this.actor.master?.attributes?.familiarAbilities;

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
            familiarAbilities: {
                value: familiarAbilities?.value ?? 0,
                items: R.sortBy(this.actor.itemTypes.action, (a) => a.sort),
            },
        };
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];

        htmlQuery(html, ".rollable[data-action=perception-check]")?.addEventListener("click", (event) => {
            this.actor.perception.roll(eventToRollParams(event));
        });

        htmlQuery(html, ".rollable[data-attack-roll]")?.addEventListener("click", (event) => {
            this.actor.system.attack.roll(eventToRollParams(event));
        });
    }
}

interface FamiliarSheetData<TActor extends FamiliarPF2e> extends CreatureSheetData<TActor> {
    master: CharacterPF2e | null;
    masters: CharacterPF2e[];
    abilities: ConfigPF2e["PF2E"]["abilities"];
    size: string;
    familiarAbilities: {
        value: number;
        items: AbilityItemPF2e[];
    };
}
