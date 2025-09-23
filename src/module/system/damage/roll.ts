import type {
    DiceTermResult,
    EvaluateRollParams,
    RollJSON,
    RollOptions,
    RollParseNode,
    RollRenderOptions,
    Rolled,
} from "@client/dice/_module.d.mts";
import type { DiceTerm, NumericTermData, PoolTermData, RollTerm, RollTermData } from "@client/dice/terms/_module.d.mts";
import { DamageRollFlag } from "@module/chat-message/index.ts";
import type { UserPF2e } from "@module/user/index.ts";
import { DegreeOfSuccessIndex } from "@system/degree-of-success.ts";
import { DiceRollOptionsPF2e } from "@system/rolls.ts";
import { ErrorPF2e, fontAwesomeIcon, tupleHasValue } from "@util";
import type Peggy from "peggy";
import * as R from "remeda";
import { DamageCategorization, deepFindTerms, renderComponentDamage, simplifyTerm } from "./helpers.ts";
import { ArithmeticExpression, Grouping, GroupingData, InstancePool, IntermediateDie } from "./terms.ts";
import { DamageCategory, DamageIRBypassData, DamageTemplate, DamageType, MaterialDamageEffect } from "./types.ts";
import { DAMAGE_TYPE_ICONS } from "./values.ts";

const terms = foundry.dice.terms;

abstract class AbstractDamageRoll extends Roll {
    declare static parser: Peggy.Parser;

    /** Strip out parentheses enclosing constants */
    static override replaceFormulaData(
        formula: string,
        data: Record<string, unknown>,
        options: { missing?: string; warn?: boolean } = {},
    ): string {
        const replaced = super.replaceFormulaData(formula.trim(), data, options);
        return replaced.replace(/(?<![a-z])\((\d+)\)/gi, "$1");
    }

    /** The theoretically lowest total of this roll */
    abstract get minimumValue(): number;

    /** The expected value (average result over the course of a "large number" of rolls) of this roll */
    abstract get expectedValue(): number;

    /** The theoretically highest total of this roll */
    abstract get maximumValue(): number;
}

class DamageRoll extends AbstractDamageRoll {
    static override CHAT_TEMPLATE = "systems/pf2e/templates/dice/damage-roll.hbs";

    static override TOOLTIP_TEMPLATE = "systems/pf2e/templates/dice/damage-tooltip.hbs";

    static override parse(formula: string, data: Record<string, unknown>): InstancePool[] {
        const replaced = this.replaceFormulaData(formula, data, { missing: "0" });
        const poolData = ((): PoolTermData | null => {
            try {
                return this.parser.parse(replaced);
            } catch {
                console.error(`Failed to parse damage formula "${formula}"`);
                return null;
            }
        })();

        if (!poolData) {
            return [];
        } else if (!["PoolTerm", "InstancePool"].includes(poolData.class ?? "")) {
            throw ErrorPF2e("A damage roll must consist of a single InstancePool");
        }

        this.classifyDice(poolData);

        return [InstancePool.fromData(poolData)];
    }

    constructor(formula: string, data = {}, options: DamageRollData = {}) {
        formula = formula.trim();
        const wrapped = formula.startsWith("{") ? formula : `{${formula}}`;
        super(wrapped, data, options);

        this.options.showBreakdown ??= true;

        if (tupleHasValue(["double-damage", "double-dice"], options.critRule)) {
            // Ensure same crit rule is present on all instances
            for (const instance of this.instances) {
                instance.critRule = options.critRule;
            }
        } else {
            // Prune nullish `critRule` property
            delete options.critRule;
        }

        if (options.evaluatePersistent) {
            for (const instance of this.instances) {
                instance.options.evaluatePersistent = true;
            }
        }
    }

    get roller(): UserPF2e | null {
        return game.users.get(this.options.rollerId ?? "") ?? null;
    }

    /** Ensure the roll is parsable as `PoolTermData` */
    static override validate(formula: string): boolean {
        formula = formula.trim();
        const wrapped = this.replaceFormulaData(formula.startsWith("{") ? formula : `{${formula}}`, {});
        try {
            const result = this.parser.parse(wrapped.replace(/@([a-z.0-9_-]+)/gi, "1"));
            return (
                R.isPlainObject(result) &&
                "class" in result &&
                ["PoolTerm", "InstancePool"].includes(String(result.class))
            );
        } catch {
            return false;
        }
    }

    /** Identify each "DiceTerm" raw object with a non-abstract subclass name */
    static classifyDice(data: RollTermData): void {
        // Find all dice terms and resolve their class
        type PreProcessedDiceTerm = { class: string; faces?: string | number | object };
        const isDiceTerm = (v: unknown): v is PreProcessedDiceTerm => R.isPlainObject(v) && v.class === "DiceTerm";
        const deepFindDice = (value: object): PreProcessedDiceTerm[] => {
            const accumulated: PreProcessedDiceTerm[] = [];
            if (isDiceTerm(value)) {
                accumulated.push(value);
            } else if (R.isObjectType(value)) {
                const objects = Object.values(value).filter((v): v is object => R.isObjectType(v));
                accumulated.push(...objects.flatMap((o) => deepFindDice(o)));
            }

            return accumulated;
        };
        const diceTerms = deepFindDice(data);

        for (const term of diceTerms) {
            if (typeof term.faces === "number" || R.isPlainObject(term.faces)) {
                term.class = "Die";
            } else if (typeof term.faces === "string") {
                const termClassName = CONFIG.Dice.terms[term.faces]?.name;
                if (!termClassName) throw ErrorPF2e(`No matching DiceTerm class for "${term.faces}"`);
                term.class = termClassName;
            }
        }
    }

    get pool(): InstancePool | null {
        const firstTerm = this.terms.at(0);
        return firstTerm instanceof InstancePool ? firstTerm : null;
    }

    override get formula(): string {
        const { instances } = this;
        // Backward compatibility for pre-instanced damage rolls
        const firstInstance = instances.at(0);
        if (!firstInstance) {
            return super.formula;
        } else if (instances.length === 1 && firstInstance.head instanceof Grouping) {
            const instanceFormula = firstInstance.formula;
            return instanceFormula.startsWith("(")
                ? instanceFormula.slice(1).replace(/\)([^)]*)$/i, "$1")
                : instanceFormula;
        }

        return instances.map((i) => i.formula).join(" + ");
    }

    get instances(): DamageInstance[] {
        return this.pool?.rolls.filter((r): r is DamageInstance => r instanceof DamageInstance) ?? [];
    }

    /**
     * Damage roll rules more-or-less also applying to healing rolls and can be both or even include components of
     * either.
     */
    get kinds(): Set<"damage" | "healing"> {
        return new Set(this.instances.flatMap((i) => Array.from(i.kinds)));
    }

    get materials(): Set<MaterialDamageEffect> {
        return new Set(this.instances.flatMap((i) => Array.from(i.materials)));
    }

    /** Return an Array of the individual DiceTerm instances contained within this Roll. */
    override get dice(): DiceTerm[] {
        const { instances } = this;
        return instances.length > 0 ? instances.flatMap((i) => i.dice) : super.dice;
    }

    get minimumValue(): number {
        return this.instances.reduce((sum, i) => sum + i.minimumValue, 0);
    }

    get expectedValue(): number {
        return this.instances.reduce((sum, i) => sum + i.expectedValue, 0);
    }

    get maximumValue(): number {
        return this.instances.reduce((sum, i) => sum + i.maximumValue, 0);
    }

    static override fromData<TRoll extends Roll>(this: AbstractConstructorOf<TRoll>, data: RollJSON): TRoll;
    static override fromData(data: RollJSON): AbstractDamageRoll {
        for (const term of data.terms) {
            this.classifyDice(term);
        }

        return super.fromData(data);
    }

    /** Increase total to 1 if evaluating to 0 or less */
    protected override async _evaluateASTAsync(
        node: RollParseNode | RollTerm,
        options?: EvaluateRollParams,
    ): Promise<string | number> {
        const total = await super._evaluateASTAsync(node, options);
        if (typeof total !== "number") return total;
        if (this.instances.some((i) => !i.persistent || this.options.evaluatePersistent) && total <= 0) {
            this.options.increasedFrom = total;
            // Send alteration to top of call stack since the Roll is currently updating itself
            Promise.resolve().then(() => {
                this.alter(1, 1 - total);
            });

            return 1;
        }

        return total;
    }

    override async getTooltip(): Promise<string> {
        const instances = this.instances
            .filter((i) => i.dice.length > 0 && (!i.persistent || i.options.evaluatePersistent))
            .map((i) => ({
                type: i.type,
                typeLabel: i.typeLabel,
                iconClass: i.iconClass,
                dice: i.dice.map((d) => ({ ...d.getTooltipData() })),
            }));
        const showBreakdown = this.options.showBreakdown;

        return fa.handlebars.renderTemplate(this.constructor.TOOLTIP_TEMPLATE, { instances, showBreakdown });
    }

    /** Work around upstream issue in which display base formula is used for chat messages instead of display formula */
    override async render({
        flavor,
        template = this.constructor.CHAT_TEMPLATE,
        isPrivate = false,
    }: RollRenderOptions = {}): Promise<string> {
        const { instances } = this;
        const firstInstance = instances.at(-1);
        // Backward compatibility for pre-instanced damage rolls
        if (!firstInstance) {
            return super.render({ flavor, template, isPrivate });
        }

        if (!this._evaluated) await this.evaluate({ allowInteractive: !isPrivate });
        const formula = isPrivate ? "???" : (await Promise.all(instances.map((i) => i.render()))).join(" + ");
        const total = this.total ?? NaN;
        const damageKinds = this.kinds;
        const showBreakdown = this.options.showBreakdown;
        const showTotalInstances = instances.length > 1 || !(showBreakdown || game.user.isGM);
        const tooltip =
            isPrivate || this.dice.length === 0 || !(showBreakdown || game.user.isGM) ? "" : await this.getTooltip();

        const chatData = {
            formula,
            tooltip,
            instances: isPrivate ? [] : instances,
            total: isPrivate ? "?" : Math.floor((total * 100) / 100),
            increasedFrom: this.options.increasedFrom,
            splashOnly: !!this.options.splashOnly,
            damageOnly: !damageKinds.has("healing"),
            healingOnly: !damageKinds.has("damage"),
            allPersistent: this.instances.every((i) => i.persistent),
            persistentEvaluated: this.instances.some((i) => i.persistent && i.options.evaluatePersistent),
            showBreakdown,
            showButtons: !isPrivate,
            showTotalInstances,
            showTripleDamage: game.pf2e.settings.critFumble.buttons,
            user: game.user,
        };

        return fa.handlebars.renderTemplate(template, chatData);
    }

    override alter(multiplier: number, addend: number, { multiplyNumeric = true } = {}): this {
        const instances = this.instances;
        if (!this._evaluated || instances.length === 0) {
            return super.alter(multiplier, addend, { multiplyNumeric });
        } else if (multiplier === 1 && addend === 0) {
            return this;
        }

        const instanceClones =
            multiplier === 1
                ? this.instances.map((i) => DamageInstance.fromData(i.toJSON()))
                : instances.map((instance): DamageInstance => {
                      const { head } = instance;
                      const rightOperand: RollTermData | GroupingData =
                          head instanceof ArithmeticExpression && ["+", "-"].includes(head.operator)
                              ? { class: "Grouping", term: head.toJSON() }
                              : head.toJSON();

                      const multiplierTerm: NumericTermData = { class: "NumericTerm", number: multiplier };
                      const expression = ArithmeticExpression.fromData({
                          operator: "*",
                          operands: [fu.deepClone(multiplierTerm), rightOperand],
                      });
                      if ([2, 3].includes(multiplier)) expression.options.crit = multiplier;

                      return DamageInstance.fromTerms([expression], fu.deepClone(instance.options));
                  });

        if (addend !== 0) {
            const firstInstance = instanceClones[0];

            const term = firstInstance.head.toJSON();
            const options = term.options ?? {};
            delete term.options;
            const termClone: GroupingData = { class: "Grouping", term, options };

            const addendTerm: NumericTermData = { class: "NumericTerm", number: Math.abs(addend) };

            const expression = ArithmeticExpression.fromData({
                operator: addend > 0 ? "+" : "-",
                operands: [termClone, addendTerm],
                evaluated: true,
            });
            instanceClones[0] = DamageInstance.fromTerms([expression], fu.deepClone(firstInstance.options));
        }

        return DamageRoll.fromTerms([InstancePool.fromRolls(instanceClones)]) as this;
    }
}

interface DamageRoll extends AbstractDamageRoll {
    constructor: typeof DamageRoll;

    options: DamageRollData & { showBreakdown: boolean };
}

class DamageInstance extends AbstractDamageRoll {
    kinds: Set<"damage" | "healing">;

    type: DamageType;

    persistent: boolean;

    materials: Set<MaterialDamageEffect>;

    critRule: CriticalDoublingRule | null = null;

    constructor(formula: string, data = {}, { flavor = "damage,healing", ...options }: DamageInstanceData = {}) {
        super(formula.trim(), data, { flavor, ...options });

        const flavorIdentifiers = flavor?.replace(/[^a-z,_-]/g, "").split(",") ?? [];
        this.type = flavorIdentifiers.find((i): i is DamageType => i in CONFIG.PF2E.damageTypes) ?? "untyped";
        this.persistent = flavorIdentifiers.includes("persistent") || flavorIdentifiers.includes("bleed");
        this.materials = new Set(
            flavorIdentifiers.filter((i): i is MaterialDamageEffect => i in CONFIG.PF2E.materialDamageEffects),
        );

        const canBeHealing =
            !this.persistent && this.materials.size === 0 && ["vitality", "void", "untyped"].includes(this.type);
        if (canBeHealing && flavorIdentifiers.includes("healing")) {
            if (!flavorIdentifiers.includes("damage")) {
                this.kinds = new Set(["healing"]);
            } else {
                this.kinds = new Set(["damage", "healing"]);
            }
        } else {
            this.kinds = new Set(["damage"]);
        }
    }

    static override parse(formula: string, data: Record<string, unknown>): RollTerm[] {
        const replaced = this.replaceFormulaData(formula, data, { missing: "0" });
        const syntaxTree = ((): { class: string } | null => {
            try {
                return this.parser.parse(replaced);
            } catch {
                console.error(`Failed to parse damage formula "${formula}"`);
                return null;
            }
        })();
        if (!syntaxTree) return [];

        DamageRoll.classifyDice(syntaxTree);

        return [terms.RollTerm.fromData(syntaxTree)];
    }

    static override fromData<TRoll extends Roll>(this: ConstructorOf<TRoll>, data: RollJSON): TRoll;
    static override fromData(data: RollJSON): Roll {
        for (const term of data.terms) {
            DamageRoll.classifyDice(term);
        }
        const roll = super.fromData(data);
        roll.terms = roll.terms.map((t) => simplifyTerm(t));

        return roll;
    }

    /** Get the expected, minimum, or maximum value of a term */
    static getValue(term: RollTerm, type: "minimum" | "maximum" | "expected" = "expected"): number {
        if (term instanceof terms.NumericTerm) return term.number;

        if (term instanceof terms.FunctionTerm) {
            try {
                return Roll.safeEval(term.formula);
            } catch {
                return 0;
            }
        }

        switch (type) {
            case "minimum":
                if (term instanceof terms.Die) {
                    return term.number;
                } else if (
                    term instanceof ArithmeticExpression ||
                    term instanceof Grouping ||
                    term instanceof IntermediateDie
                ) {
                    return term.minimumValue;
                }
                break;
            case "maximum":
                if (term instanceof terms.Die) {
                    return term.number * term.faces;
                } else if (
                    term instanceof ArithmeticExpression ||
                    term instanceof Grouping ||
                    term instanceof IntermediateDie
                ) {
                    return term.maximumValue;
                }
                break;
            default: {
                if (term instanceof terms.Die) {
                    return term.number * ((term.faces + 1) / 2);
                } else if (
                    term instanceof ArithmeticExpression ||
                    term instanceof Grouping ||
                    term instanceof IntermediateDie
                ) {
                    return term.expectedValue;
                }
            }
        }

        return 0;
    }

    override get formula(): string {
        const typeFlavor = game.i18n.localize(CONFIG.PF2E.damageRollFlavors[this.type] ?? this.type);
        const damageType =
            this.persistent && this.type !== "bleed"
                ? game.i18n.format("PF2E.Damage.RollFlavor.persistent", { damageType: typeFlavor })
                : this.type !== "untyped"
                  ? typeFlavor
                  : "";
        return [this.head.expression, damageType].join(" ").trim();
    }

    override get total(): number | undefined {
        if (this.persistent && !this.options.evaluatePersistent) return 0;
        const maybeNumber = super.total;
        return typeof maybeNumber === "number" ? Math.max(Math.floor(maybeNumber), 0) : maybeNumber;
    }

    get minimumValue(): number {
        return DamageInstance.getValue(this.head, "minimum");
    }

    get expectedValue(): number {
        return DamageInstance.getValue(this.head);
    }

    get maximumValue(): number {
        return DamageInstance.getValue(this.head, "maximum");
    }

    /** An array of statements for use in predicate testing */
    get formalDescription(): Set<string> {
        const typeCategory = DamageCategorization.fromDamageType(this.type);
        return new Set(
            [
                "damage",
                `damage:type:${this.type}`,
                typeCategory ? `damage:category:${typeCategory}` : [],
                this.persistent ? "damage:category:persistent" : [],
                Array.from(this.materials).map((m) => `damage:material:${m}`),
            ].flat(),
        );
    }

    get iconClass(): string | null {
        return DAMAGE_TYPE_ICONS[this.type];
    }

    /** Return 0 for persistent damage */
    protected override _evaluateTotal(): number {
        return this.persistent && !this.options.evaluatePersistent ? 0 : super._evaluateTotal();
    }

    override async render({ tooltips = true }: InstanceRenderOptions = {}): Promise<string> {
        const span = document.createElement("span");
        span.classList.add(this.type, "damage", "instance", "color");
        if (tooltips) span.dataset.tooltip = this.typeLabel;
        span.append(this.#renderFormula());

        if (this.persistent && this.type !== "bleed") {
            const icon = fontAwesomeIcon("hourglass", { style: "duotone" });
            icon.classList.add("icon");
            span.append(" ", icon);
        }

        const { iconClass } = this;
        if (iconClass) {
            if (!this.persistent || this.type === "bleed") span.append(" ");
            const icon = fontAwesomeIcon(iconClass);
            icon.classList.add("icon");
            span.append(icon);
        }

        return span.outerHTML;
    }

    /** Render this roll's formula for display in chat */
    #renderFormula(): DocumentFragment | HTMLElement | string {
        const head = this.head instanceof Grouping ? this.head.term : this.head;
        return head instanceof ArithmeticExpression
            ? head.render()
            : ["precision", "splash"].includes(head.flavor)
              ? renderComponentDamage(head)
              : head.expression;
    }

    override get dice(): DiceTerm[] {
        return this._dice.concat(
            this.terms
                .reduce(
                    (dice: (DiceTerm | never[])[], term) => {
                        if (term instanceof terms.DiceTerm) {
                            dice.push(term);
                        } else if (
                            term instanceof Grouping ||
                            term instanceof ArithmeticExpression ||
                            term instanceof IntermediateDie
                        ) {
                            dice.push(...term.dice);
                        }
                        return dice;
                    },
                    [...this._dice],
                )
                .flat(),
        );
    }

    /** Get the head term of this instance */
    get head(): RollTerm {
        return this.terms[0];
    }

    get category(): DamageCategory | null {
        return DamageCategorization.fromDamageType(this.type);
    }

    get typeLabel(): string {
        const damageType = game.i18n.localize(CONFIG.PF2E.damageTypes[this.type]);
        return this.persistent && this.type !== "bleed"
            ? game.i18n.format("PF2E.Damage.PersistentTooltip", { damageType })
            : damageType;
    }

    /** Get the total of this instance without any doubling or tripling from a critical hit */
    get critImmuneTotal(): this["total"] {
        if (this.total === undefined) return undefined;
        const head = this.head;

        // Get the total with all damage-doubling removed
        const undoubledTotal =
            head instanceof ArithmeticExpression || head instanceof Grouping ? (head.critImmuneTotal ?? 0) : this.total;

        if (this.critRule === "double-damage") {
            return undoubledTotal;
        } else {
            // Dice doubling for crits is enabled: discard the second half of all doubled dice
            const secondHalf = this.dice
                .filter((d) => /\bdoubled\b/.test(d.flavor))
                .flatMap((d) => d.results.slice(Math.ceil(d.results.length / 2)));
            return undoubledTotal - secondHalf.reduce((sum, r) => sum + r.result, 0);
        }
    }

    componentTotal(component: "precision" | "splash"): number {
        if (!this._evaluated) {
            throw ErrorPF2e("Component totals may only be accessed from an evaluated damage instance");
        }

        const terms = deepFindTerms(this.head, { flavor: component });
        const rawTotal = terms.reduce((total, t) => total + (Number(t.total) || 0), 0);
        const critMultiplier = Number(this.head.options.crit) || 1;

        return rawTotal * critMultiplier;
    }

    /**
     * Set a "hidden" property for DsN! so that it doesn't simulate rolling deferred persistent damage.
     * See https://gitlab.com/riccisi/foundryvtt-dice-so-nice/-/wikis/API/Roll#hiding-a-dice-from-a-roll-animation
     */
    protected override async _evaluate(params?: Omit<EvaluateRollParams, "async">): Promise<Rolled<this>> {
        await super._evaluate(params);

        if (this.persistent && !this.options.evaluatePersistent) {
            type HiddenResult = DiceTermResult & { hidden?: boolean };
            const results: HiddenResult[] = this.dice.flatMap((d) => d.results);
            for (const result of results) {
                result.hidden = true;
            }
        }

        return this as Rolled<this>;
    }
}

// Called asynchronously due to vite adding `define` variables to `globalThis` late in serve mode
Promise.resolve().then(() => {
    // Peggy calls `eval` by default, which makes build tools cranky: instead use the generated source and pass it to a
    // function constructor.
    const Evaluator = function () {}.constructor as new (...args: unknown[]) => (obj: object) => void;
    new Evaluator("AbstractDamageRoll", ROLL_PARSER).call(this, AbstractDamageRoll);
});

interface DamageInstance extends AbstractDamageRoll {
    options: DamageInstanceData;
}

interface InstanceRenderOptions extends RollRenderOptions {
    /** Whether to attach tooltips to the damage type icons */
    tooltips?: boolean;
}

type CriticalDoublingRule = "double-damage" | "double-dice";

interface AbstractDamageRollData extends RollOptions {
    evaluatePersistent?: boolean;
}

interface DamageRollData extends DiceRollOptionsPF2e, AbstractDamageRollData {
    /** Whether to double dice or total on critical hits */
    critRule?: Maybe<CriticalDoublingRule>;
    /** Data used to construct the damage formula and options */
    damage?: DamageTemplate;
    result?: DamageRollFlag;
    degreeOfSuccess?: DegreeOfSuccessIndex | null;
    /** If the total was increased to 1, the original total */
    increasedFrom?: number;
    /** Whether this roll is the splash damage from another roll */
    splashOnly?: boolean;
    bypass?: DamageIRBypassData;
}

type DamageInstanceData = AbstractDamageRollData;

export { DamageInstance, DamageRoll, type DamageRollData };
