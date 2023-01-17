import { AbstractEffectPF2e, EffectBadge } from "@item/abstract-effect";
import { UserPF2e } from "@module/user";
import { AfflictionData } from "./data";

class AfflictionPF2e extends AbstractEffectPF2e {
    override get badge(): EffectBadge {
        return { type: "counter", value: this.stage };
    }

    get stage() {
        return this.system.stage;
    }

    override async increase(): Promise<void> {
        const maxStage = Object.values(this.system.stages).length;
        if (this.stage === maxStage) return;

        const stage = Math.min(maxStage, this.system.stage + 1);
        await this.update({ system: { stage } });
    }

    override async decrease(): Promise<void> {
        const stage = this.system.stage - 1;
        if (stage === 0) {
            await this.delete();
            return;
        }

        await this.update({ system: { stage } });
    }

    override prepareBaseData(): void {
        super.prepareBaseData();
        const maxStage = Object.values(this.system.stages).length;
        this.system.stage = Math.min(this.system.stage, maxStage);
    }

    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DocumentModificationContext<this>,
        user: UserPF2e
    ): Promise<void> {
        const duration = changed.system?.duration;
        if (typeof duration?.unit === "string" && !["unlimited", "encounter"].includes(duration.unit)) {
            if (duration.value === -1) duration.value = 1;
        }

        return super._preUpdate(changed, options, user);
    }
}

interface AfflictionPF2e {
    readonly data: AfflictionData;
}

export { AfflictionPF2e };
