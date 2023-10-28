import type { ActorPF2e, CharacterPF2e } from "@actor";
import type { ConsumablePF2e } from "@item";
import { TrickMagicItemDifficultyData, calculateTrickMagicItemCheckDC } from "@item/consumable/spell-consumables.ts";
import { TRICK_MAGIC_SKILLS, TrickMagicItemEntry, TrickMagicItemSkill } from "@item/spellcasting-entry/trick.ts";
import { ErrorPF2e, localizer } from "@util";

export class TrickMagicItemPopup {
    /** The wand or scroll being "tricked" */
    readonly item: ConsumablePF2e<ActorPF2e>;

    /** The actor doing the tricking */
    declare readonly actor: CharacterPF2e;

    /** The skill DC of the action's check */
    readonly checkDC: TrickMagicItemDifficultyData;

    #localize = localizer("PF2E.TrickMagicItemPopup");

    constructor(item: ConsumablePF2e) {
        if (!item.isOfType("consumable")) {
            throw ErrorPF2e("Unexpected item used for Trick Magic Item");
        }
        if (!item.actor?.isOfType("character")) {
            throw ErrorPF2e(this.#localize("InvalidActor"));
        }

        this.item = item as ConsumablePF2e<CharacterPF2e>;
        this.actor = item.actor;
        this.checkDC = calculateTrickMagicItemCheckDC(item);

        this.#initialize();
    }

    async #initialize(): Promise<void> {
        const skills = TRICK_MAGIC_SKILLS.filter((skill) => skill in this.checkDC).map((value) => ({
            value,
            label: game.i18n.localize(`PF2E.Skill${value.capitalize()}`),
            modifier: this.actor.skills[value].check.mod,
        }));
        const buttons = skills.reduce((accumulated: Record<string, DialogButton>, skill) => {
            const button: DialogButton = {
                icon: '<i class="fas fa-dice-d20"></i>',
                label: `${skill.label} (${skill.modifier < 0 ? "" : "+"}${skill.modifier})`,
                callback: () => this.#handleTrickItem(skill.value),
            };
            return { ...accumulated, [skill.value]: button };
        }, {});
        new Dialog(
            {
                title: this.#localize("Title"),
                content: `<p>${this.#localize("Label")}</p>`,
                buttons,
            },
            { classes: ["dialog", "trick-magic-item"], width: "auto" },
        ).render(true);
    }

    #handleTrickItem(skill: TrickMagicItemSkill): void {
        const stat = this.actor.skills[skill];
        stat.check.roll({
            extraRollOptions: ["action:trick-magic-item"],
            dc: { value: this.checkDC[skill] ?? 0 },
            item: this.item,
        });

        const trick = new TrickMagicItemEntry(this.actor, skill);
        this.item.castEmbeddedSpell(trick);
    }
}
