import { ArmyPF2e } from "@actor";
import { ActorSheetPF2e } from "@actor/sheet/base.ts";
import { CreatureConfig } from "@actor/creature/config.ts";

import { NPCPF2e } from "@actor";
import { Abilities, AbilityData, SkillAbbreviation } from "@actor/creature/data.ts";
import { CreatureSheetPF2e } from "@actor/creature/sheet.ts";
import { CreatureSheetData } from "@actor/creature/types.ts";
import { ALIGNMENTS, ALIGNMENT_TRAITS } from "@actor/creature/values.ts";
import { NPCSkillsEditor } from "@actor/npc/skills-editor.ts";
import { RecallKnowledgePopup } from "@actor/sheet/popups/recall-knowledge-popup.ts";
import { AbilityString, MovementType } from "@actor/types.ts";
import { ABILITY_ABBREVIATIONS, MOVEMENT_TYPES, SAVE_TYPES, SKILL_DICTIONARY } from "@actor/values.ts";
import { createTagifyTraits } from "@module/sheet/helpers.ts";
import { DicePF2e } from "@scripts/dice.ts";
import { eventToRollParams } from "@scripts/sheet-util.ts";
import {
    ErrorPF2e,
    getActionGlyph,
    getActionIcon,
    htmlQuery,
    htmlQueryAll,
    localizeList,
    objectHasKey,
    setHasElement,
    tagify,
} from "@util";
import { NPCConfig } from "@actor/npc/config.ts";
import { NPCSkillData } from "@actor/npc//data.ts";
import {
    NPCActionSheetData,
    NPCIdentificationSheetData,
    NPCSheetData,
    NPCSkillSheetData,
    NPCSpeedSheetData,
    NPCSpellcastingSheetData,
    NPCStrikeSheetData,
    NPCSystemSheetData,
} from "@actor/npc//types.ts";



class ArmySheetPF2e extends ActorSheetPF2e<ArmyPF2e> {
    protected readonly actorConfigClass = CreatureConfig;

    static override get defaultOptions() {
        const options = super.defaultOptions;
        return foundry.utils.mergeObject(options, {
            classes: [...options.classes, "pf2e", "army"],
            template: "systems/pf2e/templates/actors/army/sheet.hbs",
        });
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];

        /*
        // Subscribe to roll events
        const rollables = ["a.rollable", ".rollable a", ".item-icon.rollable"].join(", ");
        for (const rollable of htmlQueryAll(html, rollables)) {
            rollable.addEventListener("click", (event) => {
                this.#onClickRollable(rollable, event);
            });
        }
        */

        // Don't subscribe to edit buttons it the sheet is not editable
        if (!this.options.editable) return;

        // ================= //
        //      POTIONS      //
        // ================= //
        const potionBottlesList = htmlQueryAll(html, "button.potion");
        if (potionBottlesList.length > 0) {
            const listener = (event: Event) => {
                const oldbottlecount = this.actor.system.details.potions;
                const change = event.type === "click" ? 1 : -1;
                const newbottlecount = oldbottlecount + change;
                if (newbottlecount > 3) {
                    console.log("You cannot have more than 3 bottles");
                    this.actor.update({ "system.details.potions" : 3 });
                }
                else if (newbottlecount < 0) {
                    console.log("You cannot have fewer than 0 bottles");
                    this.actor.update({ "system.details.potions" : 0 });
                } else {
                this.actor.update({ "system.details.potions" : newbottlecount });
                }
            };
    
            for (const bottles of potionBottlesList) {
                bottles.addEventListener("click", listener);
                bottles.addEventListener("contextmenu", listener);
            }
        }
    }

    /*
    async #onClickRollable(link: HTMLElement, event: MouseEvent): Promise<void> {
        const check = link?.parentElement?.dataset ?? {};
        const rollParams = eventToRollParams(event);
        await this.actor.attributes.[check].roll(rollParams);
    } 
    */  
}

export { ArmySheetPF2e };