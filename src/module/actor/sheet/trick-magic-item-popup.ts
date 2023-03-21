import { ActorPF2e, CharacterPF2e } from "@actor";
import { ConsumablePF2e } from "@item";
import { calculateTrickMagicItemCheckDC, TrickMagicItemDifficultyData } from "@item/consumable/spell-consumables";
import { TrickMagicItemEntry, TrickMagicItemSkill, TRICK_MAGIC_SKILLS } from "@item/spellcasting-entry/trick";
import { LocalizePF2e } from "@module/system/localize";
import { ErrorPF2e } from "@util";

export class TrickMagicItemPopup {
    /** The wand or scroll being "tricked" */
    readonly item: ConsumablePF2e<ActorPF2e>;

    /** The actor doing the tricking */
    readonly actor!: CharacterPF2e;

    /** The skill DC of the action's check */
    readonly checkDC: TrickMagicItemDifficultyData;

    #translations = LocalizePF2e.translations.PF2E.TrickMagicItemPopup;

    constructor(item: ConsumablePF2e<ActorPF2e>) {
        if (!item.isOfType("consumable")) {
            throw ErrorPF2e("Unexpected item used for Trick Magic Item");
        }

        this.item = item;
        this.checkDC = calculateTrickMagicItemCheckDC(item);

        if (!(item.actor instanceof CharacterPF2e)) {
            ui.notifications.warn(this.#translations.InvalidActor);
            return;
        }
        this.actor = item.actor;

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
                title: this.#translations.Title,
                content: `<p>${this.#translations.Label}</p>`,
                buttons,
            },
            { classes: ["dialog", "trick-magic-item"], width: "auto" }
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
