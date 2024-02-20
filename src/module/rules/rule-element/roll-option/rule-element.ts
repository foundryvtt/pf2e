import { DataUnionField, PredicateField, StrictBooleanField, StrictStringField } from "@system/schema-data-fields.ts";
import { ErrorPF2e, sluggify } from "@util";
import * as R from "remeda";
import { RollOptionToggle } from "../../synthetics.ts";
import { AELikeRuleElement } from "../ae-like.ts";
import { RuleElementOptions, RuleElementPF2e } from "../base.ts";
import { ModelPropsFromRESchema, ResolvableValueField, RuleElementSource } from "../data.ts";
import { Suboption, type RollOptionSchema } from "./data.ts";

/**
 * Set a roll option at a specificed domain
 * @category RuleElement
 */
class RollOptionRuleElement extends RuleElementPF2e<RollOptionSchema> {
    constructor(source: RollOptionSource, options: RuleElementOptions) {
        super(source, options);
        if (this.invalid) return;

        if (source.removeAfterRoll && !this.item.isOfType("effect")) {
            this.failValidation("removeAfterRoll may only be used on rule elements from effect items");
            return;
        }

        // Prevent all further processing of this RE if it is a totm toggle and the setting is disabled
        if (this.toggleable === "totm" && !game.pf2e.settings.totm) {
            this.ignored = true;
            return;
        }

        this.option = this.#resolveOption();

        // If no suboption has been selected yet, set the first as selected
        const firstSuboption = this.suboptions.at(0);
        if (firstSuboption && !this.suboptions.some((s) => s.value === this.selection)) {
            this.selection = firstSuboption.value;
        }
    }

    static override defineSchema(): RollOptionSchema {
        const fields = foundry.data.fields;

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
                choices: fu.deepClone(AELikeRuleElement.PHASES),
                initial: "applyAEs",
            }),
            suboptions: new fields.ArrayField(new fields.EmbeddedDataField(Suboption), {
                required: false,
                nullable: false,
                initial: [],
            }),
            mergeable: new fields.BooleanField({ required: false }),
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

    /** Force false totm toggleable roll options if the totmToggles setting is disabled */
    override resolveValue(): boolean {
        if (this.toggleable === "totm" && !game.settings.get("pf2e", "totmToggles")) {
            return false;
        }
        return this.alwaysActive ? true : !!super.resolveValue(this.value);
    }

    /** Filter suboptions, including those among the same merge family. */
    #resolveSuboptions(test?: Set<string>): Suboption[] {
        const localSuboptions = this.suboptions.filter((s) => !test || s.predicate.test(test));
        const foreignSuboptions = this.mergeable
            ? this.actor.rules.flatMap((r) =>
                  r !== this &&
                  !r.ignored &&
                  r instanceof RollOptionRuleElement &&
                  r.toggleable &&
                  r.mergeable &&
                  r.domain === this.domain &&
                  r.option === this.option &&
                  (!test || r.test(test))
                      ? r.suboptions
                      : [],
              )
            : [];

        const suboptions = R.uniqBy([...localSuboptions, ...foreignSuboptions], (s) => s.value)
            .filter((s) => !test || s.predicate.test(test))
            .map((suboption) => {
                suboption.label = suboption.rule.resolveInjectedProperties(suboption.label);
                return suboption;
            });

        // Resolve family disagreement on selection
        if (suboptions.length > 0 && suboptions.filter((s) => s.selected).length > 1) {
            const suboptionValues = R.uniq(suboptions.map((s) => s.value));
            const rules = R.uniq(suboptions.map((s) => s.rule));
            const consensusSelection = R.uniq(
                R.compact(suboptions.map((s) => s.rule._source.selection ?? s.rule.selection)).filter((s) =>
                    suboptionValues.includes(s),
                ),
            ).at(0);
            const selection = consensusSelection ?? suboptionValues[0];
            for (const rule of rules) {
                rule.selection = selection;
            }
        }

        return suboptions;
    }

    #resolveOption({ withSuboption = false } = {}): string {
        const baseOption = this.resolveInjectedProperties(this.option)
            .replace(/[^-:\w]/g, "")
            .replace(/:+/g, ":")
            .replace(/-+/g, "-")
            .trim();

        return withSuboption && this.selection ? `${baseOption}:${this.selection}` : baseOption;
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

        const test = new Set([this.actor.getRollOptions([this.domain]), this.parent.getRollOptions("parent")].flat());
        if (!this.test(test)) return this.#setFlag(false);

        const baseOption = (this.option = this.#resolveOption());
        if (!baseOption) {
            this.failValidation("option: must be a string consisting of only letters, numbers, colons, and hyphens");
            return;
        }

        if (this.toggleable) {
            const suboptions = this.#resolveSuboptions(test);
            const toggleDomain = (this.actor.synthetics.toggles[this.domain] ??= {});

            // Exit early if another mergeable roll option has already completed the following
            if (this.mergeable && toggleDomain[this.option]) return;

            if (suboptions.length > 0 && !suboptions.some((s) => s.value === this.selection)) {
                // If predicate testing eliminated the selected suboption, select the first and deselect the rest
                this.selection = suboptions[0].value;
            } else if (this.suboptions.length > 0 && suboptions.length === 0) {
                // If no suboptions remain after predicate testing, don't set the roll option or expose the toggle
                return;
            } else if (this.mergeable && this.actor.synthetics.toggles[this.domain]?.[this.option]) {
                // Also return if this is a mergeable toggle and the sheet toggle has already bee created
                return;
            }

            const managingItem = suboptions.find((s) => s.selected)?.parent.item ?? this.item;
            const toggle: RollOptionToggle = {
                itemId: managingItem.id,
                label: this.getReducedLabel(),
                placement: this.placement ?? "actions",
                domain: this.domain,
                option: baseOption,
                suboptions,
                alwaysActive: !!this.alwaysActive,
                checked: false,
                enabled: true,
            };

            if (this.disabledIf) {
                toggle.enabled = !this.disabledIf.test(test);
                if (!toggle.enabled && !this.alwaysActive && typeof this.disabledValue === "boolean") {
                    this.value = this.disabledValue;
                }
            }

            const value = (toggle.checked = this.resolveValue());
            this.#setOption(baseOption, value);
            this.#setFlag(value);
            toggleDomain[this.option] = toggle;
        } else if (this.count) {
            this.#setCount(baseOption);
        } else {
            this.#setOption(baseOption, this.resolveValue());
        }
    }

    #setOption(baseOption: string, value: boolean) {
        const rollOptions = this.actor.rollOptions;
        const domainRecord = (rollOptions[this.domain] ??= {});
        const fullOption = this.#resolveOption({ withSuboption: true });

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
            const flagKey = sluggify(this.#resolveOption(), { camel: "dromedary" });
            if (value) {
                const flagValue = /^\d+$/.test(this.selection) ? Number(this.selection) : this.selection;
                this.item.flags.pf2e.rulesSelections[flagKey] = flagValue;
            } else {
                this.item.flags.pf2e.rulesSelections[flagKey] ??= null;
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
     * @param value The new roll option value
     * @param [selection] The new suboption selection
     * @returns the new value if successful or otherwise `null`
     */
    async toggle(value = !this.resolveValue(), selection: string | null = null): Promise<boolean | null> {
        if (!this.toggleable) throw ErrorPF2e("Attempted to toggle non-toggleable roll option");

        const actor = this.actor;
        const updates: { _id: string; "system.rules": RuleElementSource[] }[] = [];

        if (this.mergeable && selection) {
            // Update the items containing rule elements in the merge family
            const rules = R.groupBy(R.uniq(this.#resolveSuboptions().map((s) => s.rule)), (r) => r.item.id);
            for (const itemId of Object.keys(rules)) {
                const item = actor.items.get(itemId, { strict: true });
                const ruleSources = item.toObject().system.rules;
                const rollOptionSources = ruleSources.filter(
                    (_r, index): _r is RollOptionSource => rules[itemId][index]?.sourceIndex === index,
                );
                for (const ruleSource of rollOptionSources) {
                    ruleSource.value = value;
                    ruleSource.selection = selection;
                }
                updates.push({ _id: itemId, "system.rules": ruleSources });
            }
        } else {
            // Directly update the rule element on the item
            const ruleSources = this.item.toObject().system.rules;
            const thisSource: Maybe<RollOptionSource> =
                typeof this.sourceIndex === "number" ? ruleSources.at(this.sourceIndex) : null;
            if (!thisSource) return null;
            thisSource.value = value;
            if (selection) thisSource.selection = selection;
            updates.push({ _id: this.item.id, "system.rules": ruleSources });
        }

        const result = await this.actor.updateEmbeddedDocuments("Item", updates);

        return result.length > 0 ? value : null;
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
        const option = this.#resolveOption({ withSuboption: true });
        if (this.value) {
            rollOptions.add(option);
        } else {
            rollOptions.delete(option);
        }
    }

    /** Remove the parent effect if configured so */
    override async afterRoll({ domains, rollOptions }: RuleElementPF2e.AfterRollParams): Promise<void> {
        const option = this.#resolveOption({ withSuboption: true });
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
