import { ActorPF2e } from "@actor";
import { RollToggle } from "@actor/data/base";
import { ItemPF2e } from "@item";
import { PredicatePF2e } from "@system/predication";
import { tupleHasValue } from "@util";
import { RuleElementOptions, RuleElementPF2e } from "./base";
import { RuleElementSource } from "./data";

/**
 * Set a roll option at a specificed domain
 * @category RuleElement
 */
class RollOptionRuleElement extends RuleElementPF2e {
    domain: string;

    option: string;

    /**
     * The value of the roll option: either a boolean or a string resolves to a boolean
     * If omitted, it defaults to `true` unless also `togglable`, in which case to `false`.
     */
    private value: string | boolean;

    /**
     * Whether this roll option can be toggled by the user on an actor sheet: "totm" indicates it will only be present
     * if the Theather of the Mind Toggles setting is enabled
     */
    private toggleable: boolean | "totm";

    /** An optional predicate to determine whether the toggle is interactable by the user */
    private disabledIf?: PredicatePF2e;

    /** The value of the roll option if its toggle is disabled: null indicates the pre-disabled value is preserved */
    private disabledValue?: boolean | null;

    /** Whether this roll option is countable: it will have a numeric value counting how many rules added this option */
    private count?: boolean;

    /** If the hosting item is an effect, remove or expire it after a matching roll is made */
    private removeAfterRoll: boolean;

    constructor(data: RollOptionSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        // This rule element behaves much like an override AE-like, so set its default priority to 50
        data.priority ??= CONST.ACTIVE_EFFECT_MODES.OVERRIDE * 10;
        super({ ...data, label: data.label ?? item.name }, item, options);

        this.domain = String(data.domain).trim();
        this.option = String(data.option).trim();
        this.toggleable = data.toggleable === "totm" ? "totm" : !!data.toggleable;
        this.value = typeof data.value === "string" ? data.value : !!(data.value ?? !this.toggleable);
        if (this.toggleable && Array.isArray(data.disabledIf)) {
            this.disabledIf = new PredicatePF2e(...data.disabledIf);
            this.disabledValue =
                data.disabledValue === null || typeof data.disabledValue === "boolean" ? data.disabledValue : false;
        }
        this.count = !!data.count;
        this.removeAfterRoll = this.item.isOfType("effect") && !!data.removeAfterRoll;

        if (!(typeof data.domain === "string" && /^[-a-z0-9]+$/.test(data.domain) && /[a-z]/.test(data.domain))) {
            this.failValidation(
                'The "domain" property must be a string consisting of only lowercase letters, numbers, and hyphens.'
            );
        }

        if ("value" in data && !["boolean", "string"].includes(typeof data.value)) {
            this.failValidation('The "value" property must be a boolean, string, or otherwise omitted.');
        }

        if ("toggleable" in data && typeof data.toggleable !== "boolean" && data.toggleable !== "totm") {
            this.failValidation('The "togglable" property must be a boolean, the string "totm", or otherwise omitted.');
        }

        if ("disabledIf" in data) {
            if (!(data.disabledIf instanceof Object)) {
                this.failValidation('The "disabledIf" property must be a predicate.');
            } else if (!this.toggleable) {
                this.failValidation('The "disabledIf" property may only be included if "toggeable" is true.');
            }
        }

        if ("disabledValue" in data) {
            if (typeof data.disabledValue !== "boolean" && data.disabledValue !== null) {
                this.failValidation('The "falseIfDisabled" property must be a boolean or null.');
            } else if (!this.toggleable || !data.disabledIf) {
                this.failValidation(
                    'The "disabledValue" property may only be included if "toggeable" is true and',
                    'there is an "disabledIf" predicate.'
                );
            }
        }

        if ("count" in data) {
            if (data.toggleable) {
                this.failValidation('The "count" property may not be included if "toggleable" is true.');
            } else if (typeof data.count !== "boolean") {
                this.failValidation('The "count" property must be a boolean or otherwise omitted.');
            }
        }

        // Prevent all further processing of this RE
        if (this.toggleable === "totm" && !game.settings.get("pf2e", "totmToggles")) {
            this.ignored = true;
        }
    }

    private resolveOption(): string {
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
        const option = this.resolveOption();

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
            const value = this.resolveValue(this.value);
            if (value) domainRecord[option] = value;

            const label = this.label.includes(":") ? this.label.replace(/^[^:]+:\s*|\s*\([^)]+\)$/g, "") : this.label;

            if (this.toggleable) {
                const toggle: RollToggle = {
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
                this.actor.system.toggles.push(toggle);
            }
        }
    }

    /** Force false totm toggleable roll options if the totmToggles setting is disabled */
    override resolveValue(value: string | boolean): boolean {
        if (this.toggleable === "totm" && !game.settings.get("pf2e", "totmToggles")) {
            return false;
        }
        return !!super.resolveValue(value);
    }

    /**
     * Toggle the provided roll option (swapping it from true to false or vice versa).
     * @returns the new value if successful or otherwise `null`
     */
    static async toggleOption({
        domain,
        option,
        actor,
        itemId,
        value = !actor.rollOptions[domain]?.[option],
    }: ToggleParameters): Promise<boolean | null> {
        domain = domain.replace(/[^-\w]/g, "");
        option = option.replace(/[^-:\w]/g, "");
        if (!itemId) return null;

        // Directly update the rule element on the item
        const item = actor.items.get(itemId, { strict: true });
        const rules = item.toObject().system.rules;
        const rule = rules.find(
            (r: RollOptionSource) =>
                r.key === "RollOption" &&
                tupleHasValue([true, "totm"], r.toggleable) &&
                r.domain === domain &&
                r.option === option &&
                r.value !== value
        );
        if (rule) {
            rule.value = value;
            const result = await actor.updateEmbeddedDocuments("Item", [{ _id: item.id, "system.rules": rules }]);
            return result.length === 1 ? value : null;
        }

        return null;
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

        this.option = this.resolveOption();
        this.value = !!this.resolveValue(this.value);
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

interface RollOptionSource extends RuleElementSource {
    domain?: unknown;
    option?: unknown;
    toggleable?: unknown;
    disabledIf?: unknown;
    disabledValue?: unknown;
    count?: unknown;
    removeAfterRoll?: unknown;
}

interface ToggleParameters {
    domain: string;
    option: string;
    actor: ActorPF2e;
    itemId?: string | null;
    value?: boolean;
}

export { RollOptionRuleElement };
