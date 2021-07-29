import { MeasuredTemplatePF2e } from '@module/canvas/measured-template';
import { ScenePF2e } from './document';

export class MeasuredTemplateDocumentPF2e extends MeasuredTemplateDocument {}

export interface MeasuredTemplateDocumentPF2e extends MeasuredTemplateDocument {
    readonly parent: ScenePF2e | null;

    readonly _object: MeasuredTemplatePF2e | null;
}
