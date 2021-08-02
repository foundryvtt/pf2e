import { MeasuredTemplatePF2e } from './';

export class TemplateLayerPF2e<
    TMeasuredTemplate extends MeasuredTemplatePF2e = MeasuredTemplatePF2e,
> extends TemplateLayer<TMeasuredTemplate> {
    protected override _onMouseWheel(event: WheelEvent) {
        // Abort if there's no hovered template
        const template = this._hover;
        if (!template) return;

        // Determine the incremental angle of rotation from event data
        const snap = template.type === 'cone' ? 45 : event.shiftKey ? 15 : 5;
        const delta = snap * Math.sign(event.deltaY);
        return template.rotate(template.data.direction + delta, snap);
    }
}
