import { ItemSourcePF2e, WeaponSource } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";

export class Migration940WeaponExpend extends MigrationBase {
    static override version = 0.94;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "weapon") return;

        // If this is an empty string reload, fix it
        if ((source.system.reload.value as unknown) === "") {
            source.system.reload.value = null;
        }

        // If expend was already set, return
        if (source.system.expend ?? null !== null) {
            return;
        }

        // If reload is null or the weapon is thrown, it cannot have an expend, so return early
        const isThrown = source.system.traits.value.includes("thrown");
        const isRanged = !!source.system.range;
        if (source.system.reload.value === null || isThrown || !isRanged) {
            source.system.expend = null;
            this.#removeExpendTraits(source);
            return;
        }

        // The SF2e playtest module used fake "expend" traits to implement expend, but we no longer need them
        // Anything else would use an expend value of 1
        const expendTrait = source.system.traits.value.find((t) => t.match(/^expend-\d$/));
        const expendFromTrait = expendTrait ? Number(expendTrait.replace("expend-", "")) : null;
        source.system.expend = Math.max(1, expendFromTrait ?? 1);

        // If there were expend traits, remove them
        this.#removeExpendTraits(source);
    }

    #removeExpendTraits(source: WeaponSource) {
        const filtered = source.system.traits.value.filter((t) => !t.match(/^expend-\d$/));
        if (source.system.traits.value.length !== filtered.length) {
            source.system.traits.value = filtered;
        }
    }
}
