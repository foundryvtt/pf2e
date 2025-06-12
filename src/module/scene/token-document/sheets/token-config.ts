import type FormDataExtended from "@client/applications/ux/form-data-extended.d.mts";
import type { DatabaseCreateOperation, DatabaseUpdateOperation } from "@common/abstract/_types.d.mts";
import { TokenConfigMixinPF2e } from "./mixin.ts";

class TokenConfigPF2e extends TokenConfigMixinPF2e(fa.sheets.TokenConfig) {
    protected override _processFormData(
        event: SubmitEvent | null,
        form: HTMLFormElement,
        formData: FormDataExtended,
    ): Record<string, unknown> {
        const data = super._processFormData(event, form, formData);
        return this.processFormData(data, form);
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
