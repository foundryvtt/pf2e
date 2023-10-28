import { DataUnionField, PredicateField, StrictBooleanField, StrictStringField } from "@system/schema-data-fields.ts";
import { ErrorPF2e, isObject, sluggify } from "@util";
import type { ArrayField, BooleanField, SchemaField, StringField } from "types/foundry/common/data/fields.d.ts";
import { RollOptionToggle } from "../synthetics.ts";
import { AELikeDataPrepPhase, AELikeRuleElement } from "./ae-like.ts";
import { ResolvableValueField } from "./data.ts";
import { RuleElementOptions, RuleElementPF2e, RuleElementSchema, RuleElementSource } from "./index.ts";

/**
 * Set a roll option at a specificed domain
 * @category RuleElement
 */
class RollOptionRuleElement extends RuleElementPF2e<RollOptionSchema> {
    constructor(source: RollOptionSource, options: RuleElementOptions) {
        super(source, options);

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

        // This rule element behaves much like an override AE-like, so set its default priority to 50
        const baseSchema = super.defineSchema();
        baseSchema.priority.initial = AELikeRuleElement.CHANGE_MODE_DEFAULT_PRIORITIES.override;

        return {
            ...baseSchema,
            domain: new fields.StringField({
                required: true,
                nullable: false,
                initial: "all",
                blank: false,
            }),
            option: new fields.StringField({ required: true, nullable: false, blank: false }),
            phase: new fields.StringField({
                required: false,
                nullable: false,
                choices: deepClone(AELikeRuleElement.PHASES),
                initial: "applyAEs",
            }),
            suboptions: new fields.ArrayField(
                new fields.SchemaField({
                    label: new fields.StringField({
                        required: true,
                        nullable: false,
                        blank: false,
                        initial: undefined,
                    }),
                    value: new StrictStringField({
                        required: true,
                        nullable: false,
                        blank: false,
                        initial: undefined,
                    }),
                    predicate: new PredicateField(),
                    selected: new fields.BooleanField(),
                }),
                {
                    required: false,
                    nullable: false,
                    initial: [],
                    validate: (v): boolean => Array.isArray(v) && v.length !== 1,
                    validationError: "must have zero or 2+ suboptions",
                },
            ),
            value: new ResolvableValueField({
                required: false,
                initial: (d) => !d.toggleable,
                validate: (v) => ["boolean", "string"].includes(typeof v),
                validationError: "must be a boolean, string, or otherwise omitted",
            }),
            toggleable: new DataUnionField(
                [
                    new StrictStringField<"totm">({
                        required: false,
                        nullable: false,
                        choices: ["totm"],
                        initial: undefined,
                    }),
                    new StrictBooleanField({ required: false, nullable: false, initial: false }),
                ],
                { required: false, nullable: false, initial: undefined },
            ),
            placement: new fields.StringField({
                required: false,
                nullable: false,
                initial: undefined,
            }),
            disabledIf: new PredicateField({ required: false, initial: undefined }),
            disabledValue: new fields.BooleanField({ required: false, initial: undefined }),
            alwaysActive: new fields.BooleanField({ required: false, initial: undefined }),
            count: new fields.BooleanField({ required: false, initial: undefined }),
            removeAfterRoll: new fields.BooleanField({ required: false, initial: undefined }),
        };
    }

    static override validateJoint(source: SourceFromSchema<RollOptionSchema>): void {
        super.validateJoint(source);

        if (source.suboptions.length > 0 && !source.toggleable) {
            throw Error("  suboptions: must be omitted if not toggleable");
        }

        if (source.disabledIf && !source.toggleable) {
            throw Error("  disabledIf: must be false if not toggleable");
        }

        if (source.count && source.toggleable) {
            throw Error("  count: must be false if toggleable");
        }

        if (typeof source.disabledValue === "boolean" && (!source.toggleable || !source.disabledIf)) {
            throw Error("  disabledValue: may only be included if toggeable and there is a disabledIf predicate.");
        }

        if (source.alwaysActive && (!source.toggleable || source.suboptions.length === 0)) {
            throw Error("  alwaysActive: must be false unless toggleable and containing suboptions");
        }

        if (source.placement && !source.toggleable) {
            throw Error("  placement: may only be present if toggleable");
        }
    }

    /** Process this rule element during item pre-creation to inform subsequent choice sets. */
    override async preCreate(): Promise<void> {
        if (this.phase === "applyAEs") this.#setRollOption();
    }

    override onApplyActiveEffects(): void {
        if (this.phase === "applyAEs") this.#setRollOption();
    }

    override beforePrepareData(): void {
        if (this.phase === "beforeDerived") this.#setRollOption();
    }

    override afterPrepareData(): void {
        if (this.phase === "afterDerived") this.#setRollOption();
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
        const suboption = this.suboptions.find((o) => o.selected) ?? this.suboptions.at(0);
        if (suboption) {
            const flagKey = sluggify(this.#resolveOption({ appendSuboption: false }), { camel: "dromedary" });
            if (value) {
                const flagValue = /^\d+$/.test(suboption.value) ? Number(suboption.value) : suboption.value;
                this.item.flags.pf2e.rulesSelections[flagKey] = flagValue;
            } else {
                this.item.flags.pf2e.rulesSelections[flagKey] = null;
            }
        }
    }

    #setRollOption(): void {
        this.domain = this.resolveInjectedProperties(this.domain);
        const isStandardDomain = /^[-a-z0-9]+$/.test(this.domain) && /[a-z]/.test(this.domain);
        // Domains can be of the form "{id}-term"
        const isIdDomain = /^[a-zA-Z0-9]{16}-[-a-z0-9]+[a-z0-9]$/.test(this.domain);
        if (!isStandardDomain && !isIdDomain) {
            return this.failValidation(
                "domain must be a string consisting of only lowercase letters, numbers, and hyphens.",
            );
        }

        const optionSet = new Set(
            [this.actor.getRollOptions([this.domain]), this.parent.getRollOptions("parent")].flat(),
        );
        if (!this.test(optionSet)) return this.#setFlag(false);

        const { rollOptions } = this.actor;
        const domainRecord = (rollOptions[this.domain] ??= {});
        const baseOption = (this.option = this.#resolveOption({ appendSuboption: false }));

        if (!baseOption) {
            this.failValidation(
                'The "option" property must be a string consisting of only letters, numbers, colons, and hyphens',
            );
            return;
        }

        if (this.count) {
            const existing = Object.keys(domainRecord)
                .flatMap((key: string) => {
                    return {
                        key,
                        count: Number(new RegExp(`^${baseOption}:(\\d+)$`).exec(key)?.[1]),
                    };
                })
                .find((keyAndCount) => !!keyAndCount.count);
            if (existing) {
                delete domainRecord[existing.key];
                domainRecord[`${baseOption}:${existing.count + 1}`] = true;
            } else {
                domainRecord[`${baseOption}:1`] = true;
            }
        } else {
            const suboptions = this.suboptions.filter((s) => s.predicate.test(optionSet));
            if (suboptions.length > 0 && !suboptions.some((s) => s.selected)) {
                // If predicate testing eliminated the selected suboption, select the first and deselect the rest.
                suboptions[0].selected = true;
                for (const otherSuboption of this.suboptions) {
                    if (otherSuboption !== suboptions[0]) otherSuboption.selected = false;
                }
            } else if (this.suboptions.length > 0 && suboptions.length === 0) {
                // If no suboptions remain after predicate testing, don't set the roll option or expose the toggle.
                return;
            }

            const fullOption = this.#resolveOption();
            const value = this.resolveValue();
            if (value) {
                domainRecord[fullOption] = value;
                // Also set option without the suboption appended
                domainRecord[baseOption] = value;
            }

            if (this.toggleable) {
                const toggle: RollOptionToggle = {
                    itemId: this.item.id,
                    label: this.getReducedLabel(),
                    placement: this.placement ?? "actions-tab",
                    domain: this.domain,
                    option: baseOption,
                    suboptions,
                    alwaysActive: !!this.alwaysActive,
                    checked: value,
                    enabled: true,
                };
                if (this.disabledIf) {
                    const rollOptions = this.actor.getRollOptions([this.domain]);
                    toggle.enabled = !this.disabledIf.test(rollOptions);
                    if (!toggle.enabled && !this.alwaysActive && typeof this.disabledValue === "boolean") {
                        toggle.checked = this.disabledValue;
                        if (!this.disabledValue) delete domainRecord[fullOption];
                    }
                }
                this.actor.synthetics.toggles.push(toggle);
            }
            this.#setFlag(value);
        }
    }

    /** Force false totm toggleable roll options if the totmToggles setting is disabled */
    override resolveValue(): boolean {
        if (this.toggleable === "totm" && !game.settings.get("pf2e", "totmToggles")) {
            return false;
        }
        return this.alwaysActive ? true : !!super.resolveValue(this.value);
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
    domain: StringField<string, string, true, false, true>;
    phase: StringField<AELikeDataPrepPhase, AELikeDataPrepPhase, false, false, true>;
    option: StringField<string, string, true, false, false>;
    /** Suboptions for a toggle, appended to the option string */
    suboptions: ArrayField<
        SchemaField<
            SuboptionData,
            SourceFromSchema<SuboptionData>,
            ModelPropsFromSchema<SuboptionData>,
            true,
            false,
            true
        >
    >;
    /**
     * The value of the roll option: either a boolean or a string resolves to a boolean If omitted, it defaults to
     * `true` unless also `togglable`, in which case to `false`.
     */
    value: ResolvableValueField<false, false, true>;
    /** Whether the roll option is toggleable: a checkbox will appear in interfaces (usually actor sheets) */
    toggleable: DataUnionField<StrictStringField<"totm"> | StrictBooleanField, false, false, true>;
    /** If toggleable, the location to be found in an interface */
    placement: StringField<string, string, false, false, false>;
    /** An optional predicate to determine whether the toggle is interactable by the user */
    disabledIf: PredicateField<false, false, false>;
    /** The value of the roll option if its toggle is disabled: null indicates the pre-disabled value is preserved */
    disabledValue: BooleanField<boolean, boolean, false, false, false>;
    /**
     * Whether this (toggleable and suboptions-containing) roll option always has a `value` of `true`, allowing only
     * suboptions to be changed
     */
    alwaysActive: BooleanField<boolean, boolean, false, false, false>;
    /** Whether this roll option is countable: it will have a numeric value counting how many rules added this option */
    count: BooleanField<boolean, boolean, false, false, false>;
    /** If the hosting item is an effect, remove or expire it after a matching roll is made */
    removeAfterRoll: BooleanField<boolean, boolean, false, false, false>;
};

type SuboptionData = {
    label: StringField<string, string, true, false, false>;
    value: StringField<string, string, true, false, false>;
    predicate: PredicateField;
    selected: BooleanField<boolean, boolean, true, false, true>;
};

interface RollOptionSource extends RuleElementSource {
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
