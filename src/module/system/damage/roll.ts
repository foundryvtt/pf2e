import { ResistanceType } from "@actor/types.ts";
import { DamageRollFlag } from "@module/chat-message/index.ts";
import { UserPF2e } from "@module/user/index.ts";
import { DegreeOfSuccessIndex } from "@system/degree-of-success.ts";
import { RollDataPF2e } from "@system/rolls.ts";
import { ErrorPF2e, fontAwesomeIcon, isObject, objectHasKey, tupleHasValue } from "@util";
import type Peggy from "peggy";
import { DamageCategorization, deepFindTerms, renderComponentDamage } from "./helpers.ts";
import { ArithmeticExpression, Grouping, GroupingData, InstancePool, IntermediateDie } from "./terms.ts";
import { DamageCategory, DamageTemplate, DamageType, MaterialDamageEffect } from "./types.ts";
import { DAMAGE_TYPE_ICONS } from "./values.ts";

abstract class AbstractDamageRoll extends Roll {
    /** Ensure the presence and validity of the `critRule` option for this roll */
    constructor(formula: string, data = {}, options: DamageInstanceData = {}) {
        options.critRule = ((): CriticalDoublingRule => {
            if (tupleHasValue(["double-damage", "double-dice"] as const, options.critRule)) {
                return options.critRule;
            }
            return game.settings.get("pf2e", "critRule") === "doubledamage" ? "double-damage" : "double-dice";
        })();

        super(formula, data, options);
    }

    declare static parser: Peggy.Parser;

    /** Strip out parentheses enclosing constants */
    static override replaceFormulaData(
        formula: string,
        data: Record<string, unknown>,
        options: { missing?: string; warn?: boolean } = {}
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

    protected override _evaluateSync(): never {
        throw ErrorPF2e("Damage rolls must be evaluated asynchronously");
    }
}

// Vite sets globals too late in dev server mode: push this to the end of the task queue so it'll wait
Promise.resolve().then(() => {
    AbstractDamageRoll.parser = ROLL_PARSER;
});

class DamageRoll extends AbstractDamageRoll {
    roller: UserPF2e | null;

    constructor(formula: string, data = {}, options: DamageRollDataPF2e = {}) {
        formula = formula.trim();
        const wrapped = formula.startsWith("{") ? formula : `{${formula}}`;
        super(wrapped, data, options);

        this.roller = game.users.get(options.rollerId ?? "") ?? null;

        if (options.evaluatePersistent) {
            for (const instance of this.instances) {
                instance.options.evaluatePersistent = true;
            }
        }

        // Ensure same crit rule is present on all instances
        for (const instance of this.instances) {
            instance.options.critRule = this.options.critRule;
        }
    }

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

    /** Ensure the roll is parsable as `PoolTermData` */
    static override validate(formula: string): boolean {
        formula = formula.trim();
        const wrapped = this.replaceFormulaData(formula.startsWith("{") ? formula : `{${formula}}`, {});
        try {
            const result = this.parser.parse(wrapped);
            return isObject(result) && "class" in result && ["PoolTerm", "InstancePool"].includes(String(result.class));
        } catch {
            return false;
        }
    }

    /** Identify each "DiceTerm" raw object with a non-abstract subclass name */
    static classifyDice(data: RollTermData): void {
        // Find all dice terms and resolve their class
        type PreProcessedDiceTerm = { class: string; faces?: string | number | object };
        const isDiceTerm = (v: unknown): v is PreProcessedDiceTerm =>
            isObject<PreProcessedDiceTerm>(v) && v.class === "DiceTerm";
        const deepFindDice = (value: object): PreProcessedDiceTerm[] => {
            const accumulated: PreProcessedDiceTerm[] = [];
            if (isDiceTerm(value)) {
                accumulated.push(value);
            } else if (value instanceof Object) {
                const objects = Object.values(value).filter((v): v is object => v instanceof Object);
                accumulated.push(...objects.flatMap((o) => deepFindDice(o)));
            }

            return accumulated;
        };
        const diceTerms = deepFindDice(data);

        for (const term of diceTerms) {
            if (typeof term.faces === "number" || term.faces instanceof Object) {
                term.class = "Die";
            } else if (typeof term.faces === "string") {
                const termClassName = CONFIG.Dice.terms[term.faces]?.name;
                if (!termClassName) throw ErrorPF2e(`No matching DiceTerm class for "${term.faces}"`);
                term.class = termClassName;
            }
        }
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
        const pool = this.terms[0];
        return pool instanceof PoolTerm
            ? pool.rolls.filter((r): r is DamageInstance => r instanceof DamageInstance)
            : [];
    }

    get materials(): MaterialDamageEffect[] {
        return [...new Set(this.instances.flatMap((i) => i.materials))];
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
    protected override _evaluateTotal(): number {
        const total = super._evaluateTotal();
        if (this.instances.some((i) => !i.persistent) && total <= 0) {
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
        return renderTemplate(this.constructor.TOOLTIP_TEMPLATE, { instances });
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

        if (!this._evaluated) await this.evaluate({ async: true });
        const formula = isPrivate ? "???" : (await Promise.all(instances.map((i) => i.render()))).join(" + ");
        const chatData = {
            formula,
            user: game.user.id,
            tooltip: isPrivate || this.dice.length === 0 ? "" : await this.getTooltip(),
            instances: isPrivate ? [] : instances,
            total: isPrivate ? "?" : Math.floor((this.total! * 100) / 100),
            increasedFrom: this.options.increasedFrom,
            splashOnly: !!this.options.splashOnly,
            allPersistent: this.instances.every((i) => i.persistent && !i.options.evaluatePersistent),
            showTripleDamage: game.settings.get("pf2e", "critFumbleButtons"),
        };

        return renderTemplate(template, chatData);
    }

    override alter(multiplier: number, addend: number, { multiplyNumeric = true } = {}): this {
        const { instances } = this;
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
                          operands: [deepClone(multiplierTerm), rightOperand],
                      });
                      if ([2, 3].includes(multiplier)) expression.options.crit = multiplier;

                      return DamageInstance.fromTerms([expression], deepClone(instance.options));
                  });

        if (addend !== 0) {
            const firstInstance = instanceClones[0]!;

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
            instanceClones[0] = DamageInstance.fromTerms([expression], deepClone(firstInstance.options));
        }

        return DamageRoll.fromTerms([InstancePool.fromRolls(instanceClones)]) as this;
    }
}

interface DamageRoll extends AbstractDamageRoll {
    constructor: typeof DamageRoll;

    options: DamageRollDataPF2e;
}

class DamageInstance extends AbstractDamageRoll {
    type: DamageType;

    persistent: boolean;

    materials: MaterialDamageEffect[];

    constructor(formula: string, data = {}, options: DamageInstanceData = {}) {
        super(formula.trim(), data, options);

        const flavorIdentifiers = options.flavor?.replace(/[^a-z,_-]/g, "").split(",") ?? [];
        this.type =
            flavorIdentifiers.find((t): t is DamageType => objectHasKey(CONFIG.PF2E.damageTypes, t)) ?? "untyped";
        this.persistent = flavorIdentifiers.includes("persistent") || flavorIdentifiers.includes("bleed");
        this.materials = flavorIdentifiers.filter((i): i is MaterialDamageEffect =>
            objectHasKey(CONFIG.PF2E.materialDamageEffects, i)
        );
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

        return [RollTerm.fromData(syntaxTree)];
    }

    static override fromData<TRoll extends Roll>(this: ConstructorOf<TRoll>, data: RollJSON): TRoll;
    static override fromData(data: RollJSON): Roll {
        for (const term of data.terms) {
            DamageRoll.classifyDice(term);
        }

        return super.fromData(data);
    }

    /** Get the expected, minimum, or maximum value of a term */
    static getValue(term: RollTerm, type: "minimum" | "maximum" | "expected" = "expected"): number {
        if (term instanceof NumericTerm) return term.number;

        switch (type) {
            case "minimum":
                if (term instanceof Die) {
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
                if (term instanceof Die) {
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
                if (term instanceof Die) {
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
        const maybeNumber = this.persistent && !this.options.evaluatePersistent ? 0 : super.total;
        return typeof maybeNumber === "number" ? Math.floor(maybeNumber) : maybeNumber;
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
                this.materials.map((m) => `damage:material:${m}`),
            ].flat()
        );
    }

    get iconClass(): string | null {
        return DAMAGE_TYPE_ICONS[this.type];
    }

    /** Return 0 for persistent damage */
    protected override _evaluateTotal(): number {
        return this.persistent && !this.options.evaluatePersistent ? 0 : super._evaluateTotal();
    }

    override async render(): Promise<string> {
        const span = document.createElement("span");
        span.classList.add("instance", this.type);
        span.title = this.typeLabel;
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
                    (dice: (DiceTerm | never[])[], t) =>
                        t instanceof DiceTerm
                            ? [...dice, t]
                            : t instanceof Grouping || t instanceof ArithmeticExpression || t instanceof IntermediateDie
                            ? [...dice, ...t.dice]
                            : [],
                    this._dice
                )
                .flat()
        );
    }

    /** Get the head term of this instance */
    get head(): RollTerm {
        return this.terms[0]!;
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
        if (!this._evaluated) return undefined;

        const { head } = this;

        // Get the total with all damage-doubling removed
        const undoubledTotal =
            head instanceof ArithmeticExpression || head instanceof Grouping ? head.critImmuneTotal : this.total;

        if (this.options.critRule === "double-damage") {
            return undoubledTotal;
        } else {
            // Dice doubling for crits is enabled: discard the second half of all doubled dice
            const secondHalf = this.dice
                .filter((d) => /\bdoubled\b/.test(d.flavor))
                .flatMap((d) => d.results.slice(Math.ceil(d.results.length / 2)));
            return undoubledTotal! - secondHalf.reduce((sum, r) => sum + r.result, 0);
        }
    }

    componentTotal(component: "precision" | "splash"): number {
        if (!this._evaluated) {
            throw ErrorPF2e("Component totals may only be accessed from an evaluated damage instance");
        }

        return deepFindTerms(this.head, { flavor: component }).reduce(
            (total, t) => total + (Number(t.total!) || 0) * Number(t.options.crit || 1),
            0
        );
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

interface DamageInstance extends AbstractDamageRoll {
    options: DamageInstanceData;
}

type CriticalDoublingRule = "double-damage" | "double-dice";

interface AbstractDamageRollData extends RollOptions {
    evaluatePersistent?: boolean;
    critRule?: CriticalDoublingRule;
}

interface DamageRollDataPF2e extends RollDataPF2e, AbstractDamageRollData {
    /** Data used to construct the damage formula and options */
    damage?: DamageTemplate;
    result?: DamageRollFlag;
    degreeOfSuccess?: DegreeOfSuccessIndex | null;
    /** If the total was increased to 1, the original total */
    increasedFrom?: number;
    /** Whether this roll is the splash damage from another roll */
    splashOnly?: boolean;
    /** Resistance types to be ignored */
    ignoredResistances?: { type: ResistanceType; max: number | null }[];
}

type DamageInstanceData = AbstractDamageRollData;

export { DamageInstance, DamageRoll, DamageRollDataPF2e };
