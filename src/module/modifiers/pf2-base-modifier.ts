import { DegreeOfSuccess, DegreeOfSuccessMultipliers } from '../degree-of-success';

export class PF2BaseModifier {
    /** The name of this modifier; should generally be a localization key (see en.json). */
    name: string;
    /** The display name of this modifier, overriding the name field if specific; can be a localization key (see en.json). */
    label?: string;
    /** If true, this modifier will be applied to the final roll; if false, it will be ignored. */
    enabled: boolean;
    /** If true, this modifier should be explicitly ignored in calculation; it is usually set by user action. */
    ignored: boolean;
    /** If true, this modifier is a custom player-provided modifier. */
    custom: boolean;
    /** The list of traits that this modifier gives to the underlying attack, if any. */
    traits?: string[];
    /** Modifiers for this damage size based on DegreeOfSuccess */
    multipliers: Record<DegreeOfSuccess, number>;

    /**
     * Create a new modifier.
     * @param {string} name The name for the modifier; should generally be a localization key.
     * @param {number} modifier The actual numeric benefit/penalty that this modifier provides.
     * @param {string} type The type of the modifier - modifiers of the same type do not stack (except for `untyped` modifiers).
     * @param {boolean} enabled If true, this modifier will be applied to the result; otherwise, it will not.
     * @param {string} source The source which this modifier originates from, if any.
     * @param {string} notes Any notes about this modifier.
     */
    constructor(params: Partial<PF2BaseModifier> & Pick<PF2BaseModifier, 'name'>) {
        if (params.name) {
            this.name = params.name;
        } else {
            throw new Error('name is mandatory');
        }

        this.label = params.label;
        this.enabled = params.enabled ?? true;
        this.ignored = params.ignored ?? false;
        this.custom = params.custom ?? false;
        this.traits = params.traits ?? [];

        this.multipliers = params.multipliers ?? DegreeOfSuccessMultipliers.getDefault();
    }
}
