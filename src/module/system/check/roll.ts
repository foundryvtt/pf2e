import { StrikeLookupData } from "@module/chat-message/index.ts";
import { ZeroToThree } from "@module/data.ts";
import { UserPF2e } from "@module/user/index.ts";
import { DegreeOfSuccessIndex } from "@system/degree-of-success.ts";
import { RollDataPF2e } from "@system/rolls.ts";
import { CheckType } from "./types.ts";

class CheckRoll extends Roll {
    static override CHAT_TEMPLATE = "systems/pf2e/templates/chat/check/roll.hbs";

    get roller(): UserPF2e | null {
        return game.users.get(this.options.rollerId ?? "") ?? null;
    }

    get type(): CheckType {
        return this.options.type ?? "check";
    }

    /** A string of some kind to help system API identify the roll */
    get identifier(): string | null {
        return this.options.identifier ?? null;
    }

    get action(): string | null {
        return this.options.action ?? null;
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

        const chatData: Record<string, unknown> = {
            formula: isPrivate ? "???" : this._formula,
            flavor: isPrivate ? null : flavor,
            user: game.user.id,
            tooltip: isPrivate ? "" : await this.getTooltip(),
            total: isPrivate ? "?" : Math.round(this.total * 100) / 100,
            identifier: this.options.identifier,
            action: this.options.action,
            degree: this.degreeOfSuccess,
            damaging: this.options.damaging,
            canRollDamage: this.roller === game.user || game.user.isGM,
        };

        return renderTemplate(template ?? CheckRoll.CHAT_TEMPLATE, chatData);
    }
}

interface CheckRoll extends Roll {
    options: CheckRollDataPF2e;
}

interface CheckRollDataPF2e extends RollDataPF2e {
    type?: CheckType;
    identifier?: Maybe<string>;
    action?: Maybe<string>;
    isReroll?: boolean;
    degreeOfSuccess?: ZeroToThree;
    strike?: StrikeLookupData;
    domains?: string[];
}

export { CheckRoll, CheckRollDataPF2e };
