import type { ActorPF2e } from "@actor";
import type { FormDataExtended } from "@client/applications/ux/_module.d.mts";
import { TokenConfigMixinPF2e } from "./mixin.ts";

class PrototypeTokenConfigPF2e extends TokenConfigMixinPF2e(fa.sheets.PrototypeTokenConfig) {
    override get linkToActorSize(): boolean {
        const actor = this.actor as unknown as ActorPF2e;
        return actor.prototypeToken.flags.pf2e.linkToActorSize;
    }

    override get autoscale(): boolean {
        const actor = this.actor as unknown as ActorPF2e;
        return actor.prototypeToken.flags.pf2e.autoscale;
    }

    protected override _processFormData(
        event: SubmitEvent | null,
        form: HTMLFormElement,
        formData: FormDataExtended,
    ): Record<string, unknown> {
        const data = super._processFormData(event, form, formData);
        return this.processFormData(data, form);
    }

    protected override async _processChanges(submitData: Record<string, unknown>): Promise<void> {
        this.processSubmitData(submitData);
        return super._processChanges(submitData);
    }
}

export { PrototypeTokenConfigPF2e };
