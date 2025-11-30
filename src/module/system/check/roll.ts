import { ZeroToThree } from "@module/data.ts";
import { UserPF2e } from "@module/user/index.ts";
import { DegreeOfSuccessIndex } from "@system/degree-of-success.ts";
import { DiceRollOptionsPF2e } from "@system/rolls.ts";
import { CheckType } from "./types.ts";
import dice = foundry.dice;

/** A foundry `Roll` subclass representing a Pathfinder 2e check */
class CheckRoll extends Roll {
    static override CHAT_TEMPLATE = `${SYSTEM_ROOT}/templates/chat/check/roll.hbs`;

    constructor(formula: string, data?: Record<string, unknown>, options?: CheckRollDataPF2e) {
        super(formula, data, options);
        this.options.showBreakdown ??= true;
    }

    get roller(): UserPF2e | null {
        return game.users.get(this.options.rollerId ?? "") ?? null;
    }

    get type(): CheckType {
        return this.options.type ?? "check";
    }

    get degreeOfSuccess(): DegreeOfSuccessIndex | null {
        return this.options.degreeOfSuccess ?? null;
    }

    get isReroll(): boolean {
        return this.options.isReroll ?? false;
    }

    get isRerollable(): boolean {
        return !this.isReroll && !this.dice.some((d) => d.modifiers.includes("kh") || d.modifiers.includes("kl"));
    }

    override async render(this: dice.Rolled<CheckRoll>, options: dice.RollRenderOptions = {}): Promise<string> {
        const { isPrivate, flavor, template } = options;
        if (!this._evaluated) await this.evaluate({ allowInteractive: !isPrivate });

        const { type, identifier, action, damaging } = this.options;
        const canRollDamage = !!(damaging && identifier && (this.roller === game.user || game.user.isGM));
        const showBreakdown = this.options.showBreakdown;
        const showDamageCue = canRollDamage && game.pf2e.settings.metagame.results;
        const tooltip = isPrivate || !(showBreakdown || game.user.isGM) ? "" : await this.getTooltip();

        const chatData: Record<string, unknown> = {
            formula: isPrivate ? "???" : this._formula,
            flavor: isPrivate ? null : flavor,
            user: game.user,
            tooltip,
            total: isPrivate ? "?" : Math.round(this.total * 100) / 100,
            type,
            identifier,
            action,
            degree: this.degreeOfSuccess,
            canRollDamage,
            showBreakdown,
            showDamageCue,
        };

        return fa.handlebars.renderTemplate(template ?? CheckRoll.CHAT_TEMPLATE, chatData);
    }

    override async getTooltip(): Promise<string> {
        const tooltip = await super.getTooltip();
        if (this.options.showBreakdown) return tooltip;
        return tooltip.replace('"dice-tooltip"', '"dice-tooltip" data-visibility="gm"');
    }
}

interface CheckRoll extends Roll {
    options: CheckRollDataPF2e & { showBreakdown: boolean };
}

/** A legacy class kept to allow chat messages to reconstruct rolls */
class StrikeAttackRoll extends CheckRoll {}

interface CheckRollDataPF2e extends DiceRollOptionsPF2e {
    type?: CheckType;
    /** A string of some kind to help system API identify the roll */
    identifier?: Maybe<string>;
    /** The slug of an action associated with this roll */
    action?: Maybe<string>;
    isReroll?: boolean;
    degreeOfSuccess?: ZeroToThree;
    /** Whether the check is part of a damaging action */
    damaging?: boolean;
    domains?: string[];
    /** The d20 roll expression including fortune/misfortune effects */
    dice?: string;
    /** The total modifier for the roll, after applying stacking rules. */
    totalModifier?: number;
}

export { CheckRoll, StrikeAttackRoll, type CheckRollDataPF2e };
