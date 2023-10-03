import { ZeroToThree } from "@module/data.ts";
import { UserPF2e } from "@module/user/index.ts";
import { DegreeOfSuccessIndex } from "@system/degree-of-success.ts";
import { RollDataPF2e } from "@system/rolls.ts";
import { CheckType } from "./types.ts";

/** A foundry `Roll` subclass representing a Pathfinder 2e check */
class CheckRoll extends Roll {
    static override CHAT_TEMPLATE = "systems/pf2e/templates/chat/check/roll.hbs";

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

    override async render(this: Rolled<CheckRoll>, options: RollRenderOptions = {}): Promise<string> {
        if (!this._evaluated) await this.evaluate({ async: true });
        const { isPrivate, flavor, template } = options;
        const { type, identifier, action, damaging } = this.options;
        const canRollDamage = !!(damaging && identifier && (this.roller === game.user || game.user.isGM));
        const limitCueVisibility = !game.settings.get("pf2e", "metagame_showResults");

        const chatData: Record<string, unknown> = {
            formula: isPrivate ? "???" : this._formula,
            flavor: isPrivate ? null : flavor,
            user: game.user.id,
            tooltip: isPrivate ? "" : await this.getTooltip(),
            total: isPrivate ? "?" : Math.round(this.total * 100) / 100,
            type,
            identifier,
            action,
            degree: this.degreeOfSuccess,
            canRollDamage,
            limitCueVisibility,
        };

        return renderTemplate(template ?? CheckRoll.CHAT_TEMPLATE, chatData);
    }
}

interface CheckRoll extends Roll {
    options: CheckRollDataPF2e;
}

/** A legacy class kept to allow chat messages to reconstruct rolls */
class StrikeAttackRoll extends CheckRoll {}

interface CheckRollDataPF2e extends RollDataPF2e {
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
}

export { CheckRoll, StrikeAttackRoll, type CheckRollDataPF2e };
