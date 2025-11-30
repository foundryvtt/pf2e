import type FormDataExtended from "@client/applications/ux/form-data-extended.d.mts";
import type { DatabaseCreateOperation, DatabaseUpdateOperation } from "@common/abstract/_types.d.mts";
import { TokenConfigMixinPF2e } from "./mixin.ts";

class TokenConfigPF2e extends TokenConfigMixinPF2e(fa.sheets.TokenConfig) {
    get linkToActorSize(): boolean {
        return !!this.token.flags.pf2e.linkToActorSize;
    }

    get autoscale(): boolean {
        return !!this.token.flags.pf2e.autoscale;
    }

    protected override _processFormData(
        event: SubmitEvent | null,
        form: HTMLFormElement,
        formData: FormDataExtended,
    ): Record<string, unknown> {
        this.processFormData(formData.object, form);
        return super._processFormData(event, form, formData);
    }

    protected override async _processSubmitData(
        event: SubmitEvent,
        form: HTMLFormElement,
        submitData: Record<string, unknown>,
        options?: Partial<DatabaseCreateOperation<Scene | null>> | Partial<DatabaseUpdateOperation<Scene | null>>,
    ): Promise<void> {
        this.processSubmitData(submitData);
        return super._processSubmitData(event, form, submitData, options);
    }
}

export { TokenConfigPF2e };
