import { PredicateField } from "@system/schema-data-fields.ts";
import { ErrorPF2e, isObject, sluggify } from "@util";
import type { ArrayField, BooleanField, SchemaField, StringField } from "types/foundry/common/data/fields.d.ts";
import { RollOptionToggle } from "../synthetics.ts";
import { ResolvableValueField } from "./data.ts";
import { RuleElementOptions, RuleElementPF2e, RuleElementSchema, RuleElementSource } from "./index.ts";

/**
 * Set a roll option at a specificed domain
 * @category RuleElement
 */
class RollOptionRuleElement extends RuleElementPF2e<RollOptionSchema> {
    /**
     * Whether this roll option can be toggled by the user on an actor sheet: "totm" indicates it will only be present
     * if the Theather of the Mind Toggles setting is enabled
     */
    toggleable: boolean | "totm";

    constructor(source: RollOptionSource, options: RuleElementOptions) {
        const sourceValue = source.value;

        // This rule element behaves much like an override AE-like, so set its default priority to 50
        super({ priority: CONST.ACTIVE_EFFECT_MODES.OVERRIDE * 10, ...source }, options);

        this.toggleable = source.toggleable === "totm" ? "totm" : !!source.toggleable;
        this.value = typeof sourceValue === "string" ? sourceValue : !!(source.value ?? !this.toggleable);

        if (!["boolean", "string", "undefined"].includes(typeof sourceValue)) {
            this.failValidation('The "value" property must be a boolean, string, or otherwise omitted.');
        }

        if ("toggleable" in source && typeof source.toggleable !== "boolean" && source.toggleable !== "totm") {
            this.failValidation('The "togglable" property must be a boolean, the string "totm", or otherwise omitted.');
        }

        if (source.removeAfterRoll && !this.item.isOfType("effect")) {
            this.failValidation("removeAfterRoll may only be used on rule elements from effect items");
        }

        // Prevent all further processing of this RE if it is a totm toggle and the setting is disabled
        if (this.toggleable === "totm" && !game.settings.get("pf2e", "totmToggles")) {
            this.ignored = true;
        }

        // If no suboption has been selected yet, set the first as selected
        const firstSuboption = this.suboptions.at(0);
        if (firstSuboption && this.suboptions.every((s) => !s.selected)) {
            firstSuboption.selected = true;
        }
    }

    static override defineSchema(): RollOptionSchema {
        const { fields } = foundry.data;

        return {
            ...super.defineSchema(),
            scope: new fields.StringField({
                required: false,
                nullable: false,
                initial: "actions-tab",
                choices: ["actions-tab"],
            }),
            domain: new fields.StringField({
                required: true,
                nullable: false,
                initial: "all",
                validate: (v: unknown): boolean => typeof v === "string" && /^[-a-z0-9]+$/.test(v) && /[a-z]/.test(v),
                validationError: "must be a string consisting of only lowercase letters, numbers, and hyphens.",
            }),
            option: new fields.StringField({ required: true, nullable: false, blank: false }),
            suboptions: new fields.ArrayField(
                new fields.SchemaField({
                    label: new fields.StringField({
                        required: true,
                        nullable: false,
                        blank: false,
                        initial: undefined,
                    }),
                    value: new fields.StringField({
                        required: true,
                        nullable: false,
                        blank: false,
                        initial: undefined,
                    }),
                    selected: new fields.BooleanField({ required: true, nullable: false, initial: false }),
                }),
                {
                    required: false,
                    nullable: false,
                    initial: [],
                    validate: (v): boolean => Array.isArray(v) && v.length !== 1,
                    validationError: "must have zero or 2+ suboptions",
                }
            ),
            value: new ResolvableValueField({ required: false, nullable: false, initial: undefined }),
            disabledIf: new PredicateField({ required: false, nullable: false, initial: undefined }),
            disabledValue: new fields.BooleanField({ required: false, nullable: false, initial: undefined }),
            count: new fields.BooleanField({ required: false, nullable: false, initial: undefined }),
            removeAfterRoll: new fields.BooleanField({ required: false, nullable: false, initial: undefined }),
        };
    }

    static override validateJoint(source: SourceFromSchema<RollOptionSchema>): void {
        super.validateJoint(source);

        const toggleable = "toggleable" in source ? !!source.toggleable : false;

        if (source.suboptions.length > 0 && !toggleable) {
            throw Error("Only toggleable roll options can have suboptions");
        }

        if (source.disabledIf && !toggleable) {
            throw Error("Only toggleable roll options can have a disabledIf predicate");
        }

        if (source.count && toggleable) {
            throw Error("Only non-toggleable roll options can be configured to count");
        }

        if (typeof source.disabledValue === "boolean" && (!toggleable || !source.disabledIf)) {
            throw Error(
                'The "disabledValue" property may only be included if "toggeable" is true and there is a ' +
                    '"disabledIf" predicate.'
            );
        }
    }

    #resolveOption({ appendSuboption = true } = {}): string {
        const baseOption = this.resolveInjectedProperties(this.option)
            .replace(/[^-:\w]/g, "")
            .replace(/:+/g, ":")
            .replace(/-+/g, "-")
            .trim();

        if (appendSuboption) {
            const selectedSuboption = this.suboptions.find((o) => o.selected);
            return selectedSuboption ? `${baseOption}:${selectedSuboption.value}` : baseOption;
        } else {
            return baseOption;
        }
    }

    #setFlag(value: boolean): void {
        const suboption = this.suboptions.find((o) => o.selected);
        if (value && suboption) {
            const flag = sluggify(this.#resolveOption({ appendSuboption: false }), { camel: "dromedary" });
            this.item.flags.pf2e.rulesSelections[flag] = suboption.value;
        }
    }

    override onApplyActiveEffects(): void {
        if (!this.test(this.actor.getRollOptions([this.domain]))) {
            return;
        }

        const { rollOptions } = this.actor;
        const domainRecord = (rollOptions[this.domain] ??= {});
        const option = this.#resolveOption();
        const baseOption = (this.option = this.#resolveOption({ appendSuboption: false }));

        if (!option || !baseOption) {
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
            if (value) {
                domainRecord[option] = value;
                // Also set option without the suboption appended
                domainRecord[baseOption] = value;
            }

            if (this.toggleable) {
                const toggle: RollOptionToggle = {
                    itemId: this.item.id,
                    label: this.getReducedLabel(),
                    scope: this.scope,
                    domain: this.domain,
                    option: baseOption,
                    suboptions: this.suboptions,
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
            this.#setFlag(value);
        }
    }

    /** Force false totm toggleable roll options if the totmToggles setting is disabled */
    protected override resolveValue(): boolean {
        if (this.toggleable === "totm" && !game.settings.get("pf2e", "totmToggles")) {
            return false;
        }
        return !!super.resolveValue(this.value);
    }

    /**
     * Toggle the provided roll option (swapping it from true to false or vice versa).
     * @returns the new value if successful or otherwise `null`
     */
    async toggle(newValue = !this.resolveValue(), newSuboption: string | null = null): Promise<boolean | null> {
        if (!this.toggleable) throw ErrorPF2e("Attempted to toggle non-toggleable roll option");

        // Directly update the rule element on the item
        const rulesSource = this.item.toObject().system.rules;
        const thisSource: Maybe<RollOptionSource> =
            typeof this.sourceIndex === "number" ? rulesSource.at(this.sourceIndex) : null;
        if (!thisSource) return null;
        thisSource.value = newValue;

        if (
            newSuboption &&
            Array.isArray(thisSource.suboptions) &&
            thisSource.suboptions.every((o): o is Record<string, unknown> => isObject(o))
        ) {
            for (const suboption of thisSource.suboptions) {
                suboption.selected = suboption.value === newSuboption;
            }
        }

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
        const option = this.#resolveOption();
        if (this.value) {
            rollOptions.add(option);
        } else {
            rollOptions.delete(option);
        }
    }

    /** Remove the parent effect if configured so */
    override async afterRoll({ domains, rollOptions }: RuleElementPF2e.AfterRollParams): Promise<void> {
        const option = this.#resolveOption();
        if (
            !this.ignored &&
            this.removeAfterRoll &&
            this.value &&
            this.actor.items.has(this.item.id) &&
            domains.includes(this.domain) &&
            rollOptions.has(option)
        ) {
            if (game.settings.get("pf2e", "automation.removeExpiredEffects")) {
                await this.item.delete();
            } else if (game.settings.get("pf2e", "automation.effectExpiration")) {
                await this.item.update({ "system.duration.value": -1, "system.expired": true });
            }
        }
    }
}

interface RollOptionRuleElement extends RuleElementPF2e<RollOptionSchema>, ModelPropsFromSchema<RollOptionSchema> {
    value: boolean | string;
}

type RollOptionSchema = RuleElementSchema & {
    scope: StringField<string, string, false, false, true>;
    domain: StringField<string, string, true, false, true>;
    option: StringField<string, string, true, false, false>;
    /** Suboptions for a toggle, appended to the option string */
    suboptions: ArrayField<
        SchemaField<SuboptionData, SourceFromSchema<SuboptionData>, SourceFromSchema<SuboptionData>, true, false, true>
    >;
    /**
     * The value of the roll option: either a boolean or a string resolves to a boolean If omitted, it defaults to
     * `true` unless also `togglable`, in which case to `false`.
     */
    value: ResolvableValueField<false, false, false>;
    /** An optional predicate to determine whether the toggle is interactable by the user */
    disabledIf: PredicateField<false, false, false>;
    /** The value of the roll option if its toggle is disabled: null indicates the pre-disabled value is preserved */
    disabledValue: BooleanField<boolean, boolean, false, false, false>;
    /** Whether this roll option is countable: it will have a numeric value counting how many rules added this option */
    count: BooleanField<boolean, boolean, false, false, false>;
    /** If the hosting item is an effect, remove or expire it after a matching roll is made */
    removeAfterRoll: BooleanField<boolean, boolean, false, false, false>;
};

type SuboptionData = {
    label: StringField<string, string, true, false, false>;
    value: StringField<string, string, true, false, false>;
    selected: BooleanField<boolean, boolean, true, false, true>;
};

interface RollOptionSource extends RuleElementSource {
    scope?: unknown;
    domain?: unknown;
    option?: unknown;
    toggleable?: unknown;
    suboptions?: unknown;
    disabledIf?: unknown;
    disabledValue?: unknown;
    count?: unknown;
    removeAfterRoll?: unknown;
}

export { RollOptionRuleElement };
