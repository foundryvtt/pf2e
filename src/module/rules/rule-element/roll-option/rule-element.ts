import {
    DataUnionField,
    PredicateField,
    StrictArrayField,
    StrictBooleanField,
    StrictStringField,
} from "@system/schema-data-fields.ts";
import { ErrorPF2e, sluggify } from "@util";
import * as R from "remeda";
import { RollOptionToggle } from "../../synthetics.ts";
import { AELikeRuleElement } from "../ae-like.ts";
import { RuleElementPF2e, type RuleElementOptions } from "../base.ts";
import { ModelPropsFromRESchema, ResolvableValueField, RuleElementSource } from "../data.ts";
import type { RollOptionSchema, SuboptionField, SuboptionSource, SuboptionsArrayField } from "./data.ts";
import { Suboption } from "./data.ts";

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
        if (this.toggleable === "totm" && !game.pf2e.settings.totm) {
            this.ignored = true;
        }
    }

    static override defineSchema(): RollOptionSchema {
        const fields = foundry.data.fields;

        // This rule element behaves much like an override AE-like, so set its default priority to 50
        const baseSchema = super.defineSchema();
        baseSchema.priority.initial = AELikeRuleElement.CHANGE_MODE_DEFAULT_PRIORITIES.override;

        const trueFalseUndefined = { required: true, nullable: false, initial: undefined } as const;

        const suboptionField: SuboptionField = new fields.EmbeddedDataField(Suboption, { ...trueFalseUndefined });
        const suboptionsArrayField: SuboptionsArrayField = new StrictArrayField<SuboptionField>(suboptionField, {
            ...trueFalseUndefined,
            validate: (v): boolean => Array.isArray(v) && v.length !== 1,
            validationError: "must have zero or 2+ suboptions",
        });
        const suboptionsRefField = new StrictStringField({ ...trueFalseUndefined });
        const suboptionsFieldTuple = [suboptionsArrayField, suboptionsRefField];

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
                choices: fu.deepClone(AELikeRuleElement.PHASES),
                initial: "applyAEs",
            }),
            suboptions: new DataUnionField(suboptionsFieldTuple, { required: false, nullable: false, initial: [] }),
            value: new ResolvableValueField({
                required: false,
                initial: (d) => !d.toggleable,
                validate: (v) => ["boolean", "string"].includes(typeof v),
                validationError: "must be a boolean, string, or otherwise omitted",
            }),
            selection: new fields.StringField({ required: false, blank: false, nullable: false, initial: undefined }),
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
            placement: new fields.StringField({ required: false, nullable: false, initial: undefined }),
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
            throw Error("suboptions: must be omitted if not toggleable");
        }

        if (source.disabledIf && !source.toggleable) {
            throw Error("disabledIf: must be false if not toggleable");
        }

        if (source.count && source.toggleable) {
            throw Error("count: must be false if toggleable");
        }

        if (typeof source.disabledValue === "boolean" && (!source.toggleable || !source.disabledIf)) {
            throw Error("disabledValue: may only be included if toggeable and there is a disabledIf predicate.");
        }

        if (source.alwaysActive && (!source.toggleable || source.suboptions.length === 0)) {
            throw Error("alwaysActive: must be false unless toggleable and containing suboptions");
        }

        if (source.placement && !source.toggleable) {
            throw Error("placement: may only be present if toggleable");
        }
    }

    /** Process this rule element during item pre-creation to inform subsequent choice sets. */
    override async preCreate(): Promise<void> {
        if (this.phase === "applyAEs") this.#setOptionAndFlag();
    }

    override onApplyActiveEffects(): void {
        if (this.phase === "applyAEs") this.#setOptionAndFlag();
    }

    override beforePrepareData(): void {
        if (this.phase === "beforeDerived") this.#setOptionAndFlag();
    }

    override afterPrepareData(): void {
        if (this.phase === "afterDerived") this.#setOptionAndFlag();
    }

    /** Force false totm toggleable roll options if the totmToggles setting is disabled. */
    override resolveValue(): boolean {
        if (this.toggleable === "totm" && !game.settings.get("pf2e", "totmToggles")) {
            return false;
        }
        return this.alwaysActive ? true : !!super.resolveValue(this.value);
    }

    /** Return internal suboptions or resolve and return them if referenced by flag. */
    #resolveSuboptions(): Suboption[] {
        if (Array.isArray(this.suboptions)) return this.suboptions;

        const fromRef = this.actor.flags.pf2e.toggleSuboptions[this.suboptions];
        if (Array.isArray(fromRef)) {
            const context = { parent: this, strict: false };
            const constructed = fromRef.map(
                (s) => new Suboption((R.isPlainObject(s) ? s : {}) as Partial<SuboptionSource>, context),
            );
            if (constructed.some((s) => s.invalid)) {
                const message = `suboptions: failed to construct from actor.flags.pf2e.suboptions.${this.suboptions}`;
                this.failValidation(message);
                return [];
            }
            return constructed;
        } else {
            this.failValidation(`suboptions: failed to resolve at actor.flags.pf2e.suboptions.${this.suboptions}`);
            return [];
        }
    }

    #resolveOption({ appendSuboption = true } = {}): string {
        const baseOption = this.resolveInjectedProperties(this.option)
            .replace(/[^-:\w]/g, "")
            .replace(/:+/g, ":")
            .replace(/-+/g, "-")
            .trim();

        return appendSuboption && this.selection ? `${baseOption}:${this.selection}` : baseOption;
    }

    #setOptionAndFlag(): void {
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

        const baseOption = (this.option = this.#resolveOption({ appendSuboption: false }));
        if (!baseOption) {
            this.failValidation("option: must be a string consisting of only letters, numbers, colons, and hyphens");
            return;
        }

        if (this.toggleable) {
            const suboptions = this.#resolveSuboptions();
            if (this.ignored) return;
            const filteredSuboptions = suboptions.filter((s) => s.predicate.test(optionSet));
            if (
                filteredSuboptions.length > 0 &&
                (!this.selection || !filteredSuboptions.some((s) => s.value === this.selection))
            ) {
                // If predicate testing eliminated the selected suboption, select the first and deselect the rest.
                this.selection = filteredSuboptions[0].value;
            } else if (suboptions.length > 0 && filteredSuboptions.length === 0) {
                // If no suboptions remain after predicate testing, don't set the roll option or expose the toggle.
                return;
            }

            const toggle: RollOptionToggle = {
                itemId: this.item.id,
                label: this.getReducedLabel(),
                placement: this.placement ?? "actions",
                domain: this.domain,
                option: baseOption,
                suboptions: filteredSuboptions.map((s) => ({ ...s, selected: s.value === this.selection })),
                alwaysActive: !!this.alwaysActive,
                checked: false,
                enabled: true,
            };

            if (this.disabledIf) {
                const rollOptions = this.actor.getRollOptions([this.domain]);
                toggle.enabled = !this.disabledIf.test(rollOptions);
                if (!toggle.enabled && !this.alwaysActive && typeof this.disabledValue === "boolean") {
                    this.value = this.disabledValue;
                }
            }

            const value = (toggle.checked = this.resolveValue());
            this.#setOption(baseOption, value);
            this.#setFlag(value);
            this.actor.synthetics.toggles.push(toggle);
        } else if (this.count) {
            this.#setCount(baseOption);
        } else {
            this.#setOption(baseOption, this.resolveValue());
        }
    }

    #setOption(baseOption: string, value: boolean) {
        const rollOptions = this.actor.rollOptions;
        const domainRecord = (rollOptions[this.domain] ??= {});
        const fullOption = this.#resolveOption();

        if (value) {
            domainRecord[fullOption] = true;
            // Also set option without the suboption appended
            domainRecord[baseOption] = true;
        } else {
            delete domainRecord[fullOption];
            delete domainRecord[baseOption];
        }
    }

    #setFlag(value: boolean): void {
        if (this.selection) {
            const flagKey = sluggify(this.#resolveOption({ appendSuboption: false }), { camel: "dromedary" });
            if (value) {
                const flagValue = /^\d+$/.test(this.selection) ? Number(this.selection) : this.selection;
                this.item.flags.pf2e.rulesSelections[flagKey] = flagValue;
            } else {
                this.item.flags.pf2e.rulesSelections[flagKey] = null;
            }
        }
    }

    #setCount(option: string): void {
        const rollOptions = this.actor.rollOptions;
        const domainRecord = (rollOptions[this.domain] ??= {});
        const existing = Object.keys(domainRecord)
            .flatMap((key: string) => ({
                key,
                count: Number(new RegExp(`^${option}:(\\d+)$`).exec(key)?.[1]) || 0,
            }))
            .find((kc) => !!kc.count);

        if (existing) {
            delete domainRecord[existing.key];
            domainRecord[`${option}:${existing.count + 1}`] = true;
        } else {
            domainRecord[`${option}:1`] = true;
        }
    }

    /**
     * Toggle the provided roll option (swapping it from true to false or vice versa).
     * @returns the new value if successful or otherwise `null`
     */
    async toggle(newValue = !this.resolveValue(), newSelection: string | null = null): Promise<boolean | null> {
        if (!this.toggleable) throw ErrorPF2e("Attempted to toggle non-toggleable roll option");

        // Directly update the rule element on the item
        const rulesSource = this.item.toObject().system.rules;
        const thisSource: Maybe<RollOptionSource> =
            typeof this.sourceIndex === "number" ? rulesSource.at(this.sourceIndex) : null;
        if (!thisSource) return null;
        thisSource.value = newValue;
        if (newSelection) thisSource.selection = newSelection;

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

interface RollOptionRuleElement extends RuleElementPF2e<RollOptionSchema>, ModelPropsFromRESchema<RollOptionSchema> {
    value: boolean | string;
}

interface RollOptionSource extends RuleElementSource {
    domain?: JSONValue;
    option?: JSONValue;
    toggleable?: JSONValue;
    suboptions?: JSONValue;
    value?: JSONValue;
    selection?: JSONValue;
    disabledIf?: JSONValue;
    disabledValue?: JSONValue;
    count?: JSONValue;
    removeAfterRoll?: JSONValue;
}

export { RollOptionRuleElement };
