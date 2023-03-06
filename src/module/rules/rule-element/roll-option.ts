import { ItemPF2e } from "@item";
import { PredicateField } from "@system/schema-data-fields";
import { ErrorPF2e } from "@util";
import { BooleanField, ModelPropsFromSchema, StringField } from "types/foundry/common/data/fields.mjs";
import { RuleElementOptions, RuleElementPF2e, RuleElementSchema, RuleElementSource } from ".";
import { RollOptionToggle } from "../synthetics";

const { fields } = foundry.data;

/**
 * Set a roll option at a specificed domain
 * @category RuleElement
 */
class RollOptionRuleElement extends RuleElementPF2e<RollOptionSchema> {
    /**
     * The value of the roll option: either a boolean or a string resolves to a boolean
     * If omitted, it defaults to `true` unless also `togglable`, in which case to `false`.
     */
    private value: string | boolean;

    /**
     * Whether this roll option can be toggled by the user on an actor sheet: "totm" indicates it will only be present
     * if the Theather of the Mind Toggles setting is enabled
     */
    toggleable: boolean | "totm";

    constructor(source: RollOptionSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        // This rule element behaves much like an override AE-like, so set its default priority to 50
        super({ priority: CONST.ACTIVE_EFFECT_MODES.OVERRIDE * 10, ...source }, item, options);

        this.toggleable = source.toggleable === "totm" ? "totm" : !!source.toggleable;
        this.value = typeof source.value === "string" ? source.value : !!(source.value ?? !this.toggleable);

        if ("value" in source && !["boolean", "string"].includes(typeof source.value)) {
            this.failValidation('The "value" property must be a boolean, string, or otherwise omitted.');
        }

        if ("toggleable" in source && typeof source.toggleable !== "boolean" && source.toggleable !== "totm") {
            this.failValidation('The "togglable" property must be a boolean, the string "totm", or otherwise omitted.');
        }

        if (source.removeAfterRoll && !item.isOfType("effect")) {
            this.failValidation("removeAfterRoll may only be used on rule elements from effect items");
        }

        // Prevent all further processing of this RE if it is a totm toggle and the setting is disabled
        if (this.toggleable === "totm" && !game.settings.get("pf2e", "totmToggles")) {
            this.ignored = true;
        }
    }

    static override defineSchema(): RollOptionSchema {
        return {
            ...super.defineSchema(),
            domain: new fields.StringField({
                required: true,
                nullable: false,
                initial: "all",
                validate: (value: unknown): void | Error => {
                    if (!(typeof value === "string" && /^[-a-z0-9]+$/.test(value) && /[a-z]/.test(value))) {
                        return Error(
                            'The "domain" property must be a string consisting of only lowercase letters, numbers, and hyphens.'
                        );
                    }
                },
            }),
            option: new fields.StringField({ required: true, nullable: false, blank: false }),
            disabledIf: new PredicateField({ required: false, nullable: false, initial: undefined }),
            disabledValue: new fields.BooleanField({ required: false, nullable: false, initial: undefined }),
            count: new fields.BooleanField({ required: false, nullable: false, initial: undefined }),
            removeAfterRoll: new fields.BooleanField({ required: false, nullable: false, initial: undefined }),
        };
    }

    protected override _validateModel(source: SourceFromSchema<RollOptionSchema>): void {
        super._validateModel(source);

        const toggleable = "toggleable" in source ? !!source.toggleable : false;

        if (source.disabledIf && !toggleable) {
            throw Error('The "disabledIf" property may only be included if "toggeable" is true.');
        }

        if (source.count && toggleable) {
            throw Error('The "count" property may not be included if "toggleable" is true.');
        }

        if (typeof source.disabledValue === "boolean" && (!toggleable || !source.disabledIf)) {
            this.failValidation(
                'The "disabledValue" property may only be included if "toggeable" is true and',
                'there is a "disabledIf" predicate.'
            );
        }
    }

    #resolveOption(): string {
        return this.resolveInjectedProperties(this.option)
            .replace(/[^-:\w]/g, "")
            .replace(/:+/g, ":")
            .replace(/-+/g, "-")
            .trim();
    }

    override onApplyActiveEffects(): void {
        if (!this.test(this.actor.getRollOptions([this.domain]))) {
            return;
        }

        const { rollOptions } = this.actor;
        const domainRecord = (rollOptions[this.domain] ??= {});
        const option = (this.option = this.#resolveOption());

        if (!option) {
            this.failValidation(
                'The "option" property must be a string consisting of only letters, numbers, colons, and hyphens'
            );
            return;
        }

        if (this.count) {
            const existing = Object.keys(domainRecord)
                .flatMap((key: string) => {
                    return {
                        key,
                        count: Number(new RegExp(`^${option}:(\\d+)$`).exec(key)?.[1]),
                    };
                })
                .find((keyAndCount) => !!keyAndCount.count);
            if (existing) {
                delete domainRecord[existing.key];
                domainRecord[`${option}:${existing.count + 1}`] = true;
            } else {
                domainRecord[`${option}:1`] = true;
            }
        } else {
            const value = this.resolveValue();
            if (value) domainRecord[option] = value;

            const label = this.label.includes(":") ? this.label.replace(/^[^:]+:\s*|\s*\([^)]+\)$/g, "") : this.label;

            if (this.toggleable) {
                const toggle: RollOptionToggle = {
                    itemId: this.item.id,
                    label,
                    domain: this.domain,
                    option,
                    checked: value,
                    enabled: true,
                };
                if (this.disabledIf) {
                    const rollOptions = this.actor.getRollOptions([this.domain]);
                    toggle.enabled = !this.disabledIf.test(rollOptions);
                    if (!toggle.enabled && typeof this.disabledValue === "boolean") {
                        toggle.checked = this.disabledValue;
                        if (!this.disabledValue) delete domainRecord[option];
                    }
                }
                this.actor.synthetics.toggles.push(toggle);
            }
        }
    }

    /** Force false totm toggleable roll options if the totmToggles setting is disabled */
    override resolveValue(): boolean {
        if (this.toggleable === "totm" && !game.settings.get("pf2e", "totmToggles")) {
            return false;
        }
        return !!super.resolveValue(this.value);
    }

    /**
     * Toggle the provided roll option (swapping it from true to false or vice versa).
     * @returns the new value if successful or otherwise `null`
     */
    async toggle(newValue = !this.resolveValue()): Promise<boolean | null> {
        if (!this.toggleable) throw ErrorPF2e("Attempted to toggle non-toggleable roll option");

        // Directly update the rule element on the item
        const rulesSource = this.item.toObject().system.rules;
        const thisSource = typeof this.sourceIndex === "number" ? rulesSource.at(this.sourceIndex) : null;
        if (!thisSource) return null;
        thisSource.value = newValue;

        const result = await this.actor.updateEmbeddedDocuments("Item", [
            { _id: this.item.id, "system.rules": rulesSource },
        ]);

        return result.length === 1 ? newValue : null;
    }

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    /**
     * Add or remove directly from/to a provided set of roll options. All RollOption REs, regardless of phase, are
     * (re-)called here.
     */
    override beforeRoll(domains: string[], rollOptions: Set<string>): void {
        if (!(this.test(rollOptions) && domains.includes(this.domain))) return;

        this.value = this.resolveValue();
        if (this.value) {
            rollOptions.add(this.option);
        } else {
            rollOptions.delete(this.option);
        }
    }

    /** Remove the parent effect if configured so */
    override async afterRoll({ domains, rollOptions }: RuleElementPF2e.AfterRollParams): Promise<void> {
        if (
            !this.ignored &&
            this.removeAfterRoll &&
            this.value &&
            this.actor.items.has(this.item.id) &&
            domains.includes(this.domain) &&
            rollOptions.has(this.option)
        ) {
            if (game.settings.get("pf2e", "automation.removeExpiredEffects")) {
                await this.item.delete();
            } else if (game.settings.get("pf2e", "automation.effectExpiration")) {
                await this.item.update({ "system.duration.value": -1, "system.expired": true });
            }
        }
    }
}

interface RollOptionRuleElement extends RuleElementPF2e<RollOptionSchema>, ModelPropsFromSchema<RollOptionSchema> {}

type RollOptionSchema = RuleElementSchema & {
    domain: StringField<string, string, true, false, true>;
    option: StringField<string, string, true, false, false>;
    /** An optional predicate to determine whether the toggle is interactable by the user */
    disabledIf: PredicateField<false, false, false>;
    /** The value of the roll option if its toggle is disabled: null indicates the pre-disabled value is preserved */
    disabledValue: BooleanField<boolean, boolean, false, false, false>;
    /** Whether this roll option is countable: it will have a numeric value counting how many rules added this option */
    count: BooleanField<boolean, boolean, false, false, false>;
    /** If the hosting item is an effect, remove or expire it after a matching roll is made */
    removeAfterRoll: BooleanField<boolean, boolean, false, false, false>;
};

interface RollOptionSource extends RuleElementSource {
    domain?: unknown;
    option?: unknown;
    toggleable?: unknown;
    disabledIf?: unknown;
    disabledValue?: unknown;
    count?: unknown;
    removeAfterRoll?: unknown;
}

export { RollOptionRuleElement };
