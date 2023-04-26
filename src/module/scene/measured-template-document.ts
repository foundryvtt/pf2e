import { MeasuredTemplatePF2e } from "@module/canvas/measured-template.ts";
import { ScenePF2e } from "./document.ts";

export class MeasuredTemplateDocumentPF2e<
    TParent extends ScenePF2e | null = ScenePF2e | null
> extends MeasuredTemplateDocument<TParent> {}

export interface MeasuredTemplateDocumentPF2e<TParent extends ScenePF2e | null = ScenePF2e | null>
    extends MeasuredTemplateDocument<TParent> {
    get object(): MeasuredTemplatePF2e<this> | null;
}
