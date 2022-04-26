import { UserPF2e } from "@module/user";
import { RollDataPF2e } from "@system/rolls";

class CheckRoll extends Roll<RollDataPF2e> {
    roller: UserPF2e | null;

    constructor(formula: string, data?: Partial<RollDataPF2e>, options?: Partial<RollDataPF2e>) {
        super(formula, data, options);

        this.roller = game.users.get(this.data.rollerId ?? "") ?? null;
    }

    override toJSON(): CheckRollJSON {
        return mergeObject(super.toJSON(), { data: { rollerId: this.roller?.id } });
    }
}

interface CheckRollJSON extends RollJSON {
    data?: Partial<RollDataPF2e>;
}

export { CheckRoll, CheckRollJSON };
