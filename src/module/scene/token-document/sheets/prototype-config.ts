import type { DocumentSheetConfiguration } from "@client/applications/api/document-sheet.d.mts";
import type { FormDataExtended } from "@client/applications/ux/_module.d.mts";
import { TokenConfigMixinPF2e } from "./mixin.ts";

class PrototypeTokenConfigPF2e extends TokenConfigMixinPF2e(fa.sheets.PrototypeTokenConfig) {
    constructor(options: DeepPartial<DocumentSheetConfiguration>) {
        super(options);
        this.token.flags = fu.mergeObject(this.token.flags, { pf2e: {} });
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
