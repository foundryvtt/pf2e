import { StrikeLookupData } from "@module/chat-message/index.ts";
import { ZeroToThree } from "@module/data.ts";
import { UserPF2e } from "@module/user/index.ts";
import { DegreeOfSuccessIndex } from "@system/degree-of-success.ts";
import { RollDataPF2e } from "@system/rolls.ts";

class CheckRoll extends Roll {
    roller: UserPF2e | null;

    isReroll: boolean;

    isRerollable: boolean;

    static override MATH_PROXY = {
        ...Roll.MATH_PROXY,
        eq: (a: number, b: number) => a === b,
        gt: (a: number, b: number) => a > b,
        gte: (a: number, b: number) => a >= b,
        lt: (a: number, b: number) => a < b,
        lte: (a: number, b: number) => a <= b,
        ne: (a: number, b: number) => a !== b,
        ternary: (condition: boolean | number, ifTrue: number, ifFalse: number) => (condition ? ifTrue : ifFalse),
    };

    constructor(formula: string, data = {}, options: CheckRollDataPF2e = {}) {
        super(formula, data, options);

        this.isReroll = options.isReroll ?? false;
        this.isRerollable =
            !this.isReroll && !this.dice.some((d) => d.modifiers.includes("kh") || d.modifiers.includes("kl"));
        this.roller = game.users.get(this.options.rollerId ?? "") ?? null;
    }

    get degreeOfSuccess(): DegreeOfSuccessIndex | null {
        return this.options.degreeOfSuccess ?? null;
    }
}

interface CheckRoll extends Roll {
    options: CheckRollDataPF2e;
}

interface CheckRollDataPF2e extends RollDataPF2e {
    isReroll?: boolean;
    degreeOfSuccess?: ZeroToThree;
    strike?: StrikeLookupData;
    domains?: string[];
}

export { CheckRoll, CheckRollDataPF2e };
