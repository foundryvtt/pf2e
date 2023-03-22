import { ActorPF2e } from "@actor";
import { AbstractEffectPF2e, EffectBadge } from "@item/abstract-effect";
import { UserPF2e } from "@module/user";
import { AfflictionFlags, AfflictionSource, AfflictionSystemData } from "./data";

class AfflictionPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends AbstractEffectPF2e<TParent> {
    override get badge(): EffectBadge {
        const label = game.i18n.format("PF2E.Item.Affliction.Stage", { stage: this.stage });
        return { type: "counter", value: this.stage, label };
    }

    get stage(): number {
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
        const maxStage = Object.values(this.system.stages).length || 1;
        this.system.stage = Math.clamped(this.system.stage, 1, maxStage);

        // Set certain defaults
        for (const stage of Object.values(this.system.stages)) {
            for (const condition of Object.values(stage.conditions)) {
                condition.linked ??= true;
            }
        }
    }

    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DocumentModificationContext<TParent>,
        user: UserPF2e
    ): Promise<void> {
        const duration = changed.system?.duration;
        if (typeof duration?.unit === "string" && !["unlimited", "encounter"].includes(duration.unit)) {
            if (duration.value === -1) duration.value = 1;
        }

        return super._preUpdate(changed, options, user);
    }
}

interface AfflictionPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends AbstractEffectPF2e<TParent> {
    flags: AfflictionFlags;
    readonly _source: AfflictionSource;
    system: AfflictionSystemData;
}

export { AfflictionPF2e };
