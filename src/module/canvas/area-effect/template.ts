import { ActorPF2e } from '@actor/base';
import { EffectArea } from '@item/data-definitions';
import { SpellPF2e } from '@item/spell';
import { ErrorPF2e } from '@module/utils';
import { BurstPreview } from './preview/burst';
import { ConePreview } from './preview/cone';
import { EmanationPreview } from './preview/emanation';
import { LinePreview } from './preview/line';

/**
 * A helper class for building MeasuredTemplates for PF2e area effects
 * Cargo-culted from the dnd5e system (thanks, Atropos!)
 */
export class AreaEffectTemplate extends MeasuredTemplate {
    /** @override */
    constructor(
        data: Partial<MeasuredTemplateData>,
        scene: Scene,
        public readonly effectArea: EffectArea,
        private readonly actor: ActorPF2e,
        private readonly token: Token,
    ) {
        super(data, scene);
    }

    /**
     * A factory method to create an AbilityTemplate instance using provided data from a Spell instance
     * @param spell The Item object for which to construct the template
     * @return The template object, or null if the item does not produce a template
     */
    static fromItem(spell: SpellPF2e): AreaEffectTemplate | null {
        const actor = spell.actor;
        if (!actor) {
            throw ErrorPF2e('A spell must be owned in order to be cast.');
        }
        const effectArea = spell.effectArea;
        const token = canvas.tokens.controlled.find((controlledToken) => controlledToken.actor?.id === actor.id);
        if (!(canvas.scene && token && effectArea)) {
            return null;
        }

        const templateSize = effectArea.value;

        const templateShape = {
            burst: 'circle',
            cone: 'cone',
            emanation: 'circle',
            line: 'ray',
        }[effectArea.areaType];

        // Prepare template data
        const color = game.user.color!;
        const templateData: Partial<MeasuredTemplateData> = {
            _id: randomID(16),
            t: templateShape,
            user: game.user.id,
            distance: templateSize,
            direction: 180,
            x: token.x,
            y: token.y,
            fillColor: color,
            angle: templateShape === 'circle' ? 360 : 90,
            borderColor: color,
            height: templateSize,
            width: 5,
        };

        return new this(templateData, canvas.scene, effectArea, actor, token);
    }

    /**
     * Creates a preview of the spell template
     */
    async drawPreview(): Promise<boolean> {
        if (canvas.activeLayer === null) {
            return true;
        }
        const PreviewClass = {
            burst: BurstPreview,
            cone: ConePreview,
            emanation: EmanationPreview,
            line: LinePreview,
        }[this.effectArea.areaType];

        return new PreviewClass(this, this.actor, this.token).templatePlaced;
    }

    /** @override */
    protected _refreshRulerText() {
        super._refreshRulerText();
        const quantity = this.effectArea.value;
        const unit = canvas.scene!.data.gridUnits;
        this.ruler.text = `${quantity}${unit}`;
    }
}
