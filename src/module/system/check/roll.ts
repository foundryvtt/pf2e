import { UserPF2e } from "@module/user";
import { RollDataPF2e } from "@system/rolls";

class CheckRoll extends Roll<CheckRollDataPF2e> {
    roller: UserPF2e | null;

    isReroll: boolean;

    isRerollable: boolean;

    constructor(formula: string, data = {}, options: Partial<CheckRollDataPF2e> = {}) {
        super(formula, data, options);

        this.isReroll = options.isReroll ?? false;
        this.isRerollable =
            !this.isReroll && !this.dice.some((d) => d.modifiers.includes("kh") || d.modifiers.includes("kl"));
        this.roller = game.users.get(this.options.rollerId ?? "") ?? null;
    }
}

interface CheckRollDataPF2e extends RollDataPF2e {
    isReroll?: boolean;
}

export { CheckRoll, CheckRollDataPF2e };
