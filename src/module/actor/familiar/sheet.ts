import type { CharacterPF2e } from "@actor";
import type { CreatureSheetData } from "@actor/creature/index.ts";
import { CreatureSheetPF2e } from "@actor/creature/sheet.ts";
import type { SheetClickActionHandlers } from "@actor/sheet/base.ts";
import type { AbilityViewData } from "@actor/sheet/data-types.ts";
import { createAbilityViewData } from "@actor/sheet/helpers.ts";
import type { ActorSheetOptions } from "@client/appv1/sheets/actor-sheet.d.mts";
import { eventToRollParams } from "@module/sheet/helpers.ts";
import type { StatisticTraceData } from "@system/statistic/index.ts";
import * as R from "remeda";
import type { FamiliarPF2e } from "./document.ts";

/**
 * @category Actor
 */
export class FamiliarSheetPF2e<TActor extends FamiliarPF2e> extends CreatureSheetPF2e<TActor> {
    /** There is currently no actor config for familiars */
    protected readonly actorConfigClass = null;

    static override get defaultOptions(): ActorSheetOptions {
        const options = super.defaultOptions;
        return {
            ...options,
            classes: [...options.classes, "familiar"],
            width: 650,
            height: 680,
            tabs: [{ navSelector: ".sheet-navigation", contentSelector: ".sheet-content", initial: "attributes" }],
            template: `${SYSTEM_ROOT}/templates/actors/familiar/sheet.hbs`,
        };
    }

    override async getData(options?: ActorSheetOptions): Promise<FamiliarSheetData<TActor>> {
        const sheetData = await super.getData(options);
        const familiar = this.actor;

        // Get all potential masters of the familiar (always include current master regardless of User permissions)
        const masters = game.actors.filter(
            (a): a is CharacterPF2e<null> => a.type === "character" && (a.isOwner || a.id === familiar.master?.id),
        );

        // list of abilities that can be selected as spellcasting ability
        const size = CONFIG.PF2E.actorSizes[familiar.system.traits.size.value] ?? null;
        const familiarAbilities = this.actor.master?.attributes?.familiarAbilities;

        // Update save labels
        if (sheetData.data.saves) {
            for (const key of ["fortitude", "reflex", "will"] as const) {
                const save = sheetData.data.saves[key];
                save.label = CONFIG.PF2E.saves[key];
            }
        }

        const skills = Object.values(sheetData.data.skills).sort((a, b) =>
            a.label.localeCompare(b.label, game.i18n.lang),
        );

        return {
            ...sheetData,
            attributes: CONFIG.PF2E.abilities,
            familiarAbilities: {
                value: familiarAbilities?.value ?? 0,
                items: R.sortBy(
                    this.actor.itemTypes.action,
                    (a) => a.name,
                    (a) => a.sort,
                ).map((item) => createAbilityViewData(item)),
            },
            master: this.actor.master,
            masters,
            size,
            skills,
        };
    }

    protected override activateClickListener(html: HTMLElement): SheetClickActionHandlers {
        const handlers = super.activateClickListener(html);
        handlers["familiar-attack-roll"] = (event) => {
            this.actor.attackStatistic.roll(eventToRollParams(event, { type: "check" }));
        };

        return handlers;
    }
}

interface FamiliarSheetData<TActor extends FamiliarPF2e> extends CreatureSheetData<TActor> {
    attributes: typeof CONFIG.PF2E.abilities;
    familiarAbilities: {
        value: number;
        items: AbilityViewData[];
    };
    master: CharacterPF2e | null;
    masters: CharacterPF2e[];
    size: string;
    skills: StatisticTraceData[];
}
