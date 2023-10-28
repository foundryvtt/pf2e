import { isObject, tupleHasValue } from "@util";
import {
    isFlavoredArithmetic,
    isSystemDamageTerm,
    markAsCrit,
    renderComponentDamage,
    simplifyTerm,
} from "./helpers.ts";
import { DamageInstance } from "./roll.ts";

class ArithmeticExpression extends RollTerm<ArithmeticExpressionData> {
    operator: ArithmeticOperator;

    operands: [RollTerm, RollTerm];

    constructor(termData: ArithmeticExpressionData) {
        super(termData);

        this.operator = termData.operator;
        this.operands = termData.operands.slice(0, 2).map((datum) => {
            if (datum instanceof RollTerm) return datum;
            const TermCls =
                CONFIG.Dice.termTypes[datum.class ?? ""] ??
                Object.values(CONFIG.Dice.terms).find((t) => t.name === datum.class) ??
                Die;
            return simplifyTerm(TermCls.fromData(datum));
        }) as [RollTerm, RollTerm];

        if (
            this.operator === "*" &&
            this.operands[0] instanceof NumericTerm &&
            tupleHasValue([2, 3] as const, this.operands[0].number)
        ) {
            markAsCrit(this.operands[1], this.operands[0].number);
        }
    }

    static override SERIALIZE_ATTRIBUTES = ["operator", "operands"];

    static override fromData<TTerm extends RollTerm>(this: ConstructorOf<TTerm>, data: TermDataOf<TTerm>): TTerm;
    static override fromData(data: RollTermData): RollTerm {
        return super.fromData({ ...data, class: "ArithmeticExpression" });
    }

    static totalOf(operator: ArithmeticOperator, left: number, right: number): number;
    static totalOf(
        operator: ArithmeticOperator,
        left: number | undefined,
        right: number | undefined,
    ): number | undefined;
    static totalOf(
        operator: ArithmeticOperator,
        left: number | undefined,
        right: number | undefined,
    ): number | undefined {
        if (left === undefined || right === undefined) return undefined;

        switch (operator) {
            case "+":
                return left + right;
            case "-":
                return left - right;
            case "*":
                return left * right;
            case "/":
                return left / right;
            case "%":
                return left % right;
        }
    }

    get dice(): DiceTerm[] {
        return this.operands.flatMap((o) =>
            o instanceof DiceTerm
                ? o
                : o instanceof Grouping || o instanceof ArithmeticExpression || o instanceof IntermediateDie
                ? o.dice
                : [],
        );
    }

    /**
     * Simplify the expression if this term is deterministic and not multiplication.
     * Multiplication is almost always going to be critical-hit doubling, which must be preserved for IWR analysis.
     */
    get expression(): string {
        // If this expression is deterministic and neither operand has its own flavor, return the stringified total
        if (
            this.isDeterministic &&
            typeof this.total === "number" &&
            !Number.isNaN(this.total) &&
            !isFlavoredArithmetic(this)
        ) {
            return this.total.toString();
        }
        const { operator, operands } = this;
        return `${operands[0].expression} ${operator} ${operands[1].expression}`;
    }

    /** Preserve flavor of inner terms */
    override get formula(): string {
        const { operator, operands } = this;
        return `${operands[0].formula} ${operator} ${operands[1].formula}`;
    }

    override get total(): number | undefined {
        if (!this._evaluated && !this.isDeterministic) return undefined;

        const operands: [number, number] = [Number(this.operands[0].total), Number(this.operands[1].total)];
        return ArithmeticExpression.totalOf(this.operator, ...operands);
    }

    get critImmuneTotal(): this["total"] {
        if (!this._evaluated) return undefined;

        const [left, right] = this.operands;

        // Critical doubling will always have the 2 operand on the left
        if (left instanceof NumericTerm && left.number === 2 && this.operator === "*") {
            return typeof right.total === "string" ? Number(right.total) : right.total;
        }

        const undoubledLeft = ((): number => {
            return left instanceof ArithmeticExpression || left instanceof Grouping
                ? Number(left.critImmuneTotal)
                : Number(left.total);
        })();

        const undoubledRight =
            right instanceof ArithmeticExpression || right instanceof Grouping
                ? Number(right.critImmuneTotal)
                : Number(right.total);

        return ArithmeticExpression.totalOf(this.operator, undoubledLeft, undoubledRight);
    }

    override get isDeterministic(): boolean {
        return this.operands.every((o) => o.isDeterministic);
    }

    get minimumValue(): number {
        const left = DamageInstance.getValue(this.operands[0], "minimum");
        const right = DamageInstance.getValue(this.operands[1], "minimum");
        return ArithmeticExpression.totalOf(this.operator, left, right)!;
    }

    get expectedValue(): number {
        const left = DamageInstance.getValue(this.operands[0]);
        const right = DamageInstance.getValue(this.operands[1]);
        return ArithmeticExpression.totalOf(this.operator, left, right)!;
    }

    get maximumValue(): number {
        const left = DamageInstance.getValue(this.operands[0], "maximum");
        const right = DamageInstance.getValue(this.operands[1], "maximum");
        return ArithmeticExpression.totalOf(this.operator, left, right)!;
    }

    /** Construct a string for an HTML rendering of this term */
    render(): DocumentFragment {
        const fragment = new DocumentFragment();
        const { operator, operands } = this;
        // Display a simplified formula if the expression is merely a multiplied pair of numeric terms
        if (operator === "*" && operands[0] instanceof NumericTerm && operands[1] instanceof NumericTerm) {
            fragment.append((operands[0].total * operands[1].total).toString());
            return fragment;
        }

        const [left, right] = operands.map((o): HTMLElement | DocumentFragment | string =>
            ["precision", "splash"].includes(o.flavor)
                ? renderComponentDamage(o)
                : isSystemDamageTerm(o)
                ? o.render()
                : o.expression,
        );

        fragment.append(left, ` ${this.operator} `, right);

        return fragment;
    }

    protected override async _evaluate(
        options: { minimize?: boolean; maximize?: boolean } = {},
    ): Promise<Evaluated<this>> {
        for (const operand of this.operands) {
            if (!operand._evaluated) {
                await operand.evaluate({ async: true, ...options });
            }
        }
        this._evaluated = true;

        return this as Evaluated<this>;
    }

    override toJSON(): ArithmeticExpressionData {
        return {
            ...super.toJSON(),
            operands: [this.operands[0].toJSON(), this.operands[1].toJSON()],
        };
    }
}

interface ArithmeticExpression extends RollTerm<ArithmeticExpressionData> {
    constructor: typeof ArithmeticExpression;
}

interface ArithmeticExpressionData extends RollTermData {
    class?: "ArithmeticExpression";
    operator: ArithmeticOperator;
    operands: [RollTermData, RollTermData];
}

type ArithmeticOperator = "+" | "-" | "*" | "/" | "%";

/** A parenthetically-exclosed expression as a single arithmetic term or number */
class Grouping extends RollTerm<GroupingData> {
    term: RollTerm;

    constructor(termData: GroupingData) {
        const TermCls =
            CONFIG.Dice.termTypes[termData.term.class ?? ""] ??
            Object.values(CONFIG.Dice.terms).find((t) => t.name === termData.term.class) ??
            NumericTerm;
        const childTerm = simplifyTerm(TermCls.fromData(termData.term));

        // Remove redundant groupings
        if (childTerm instanceof Grouping) {
            super(childTerm.toJSON());
            this.term = childTerm.term;
        } else {
            super(termData);
            this.term = childTerm;
        }

        this._evaluated = termData.evaluated ?? this.term._evaluated ?? true;
    }

    static override SERIALIZE_ATTRIBUTES = ["term"];

    static override fromData<TTerm extends RollTerm>(this: ConstructorOf<TTerm>, data: TermDataOf<TTerm>): TTerm;
    static override fromData(data: RollTermData): RollTerm {
        return super.fromData({ ...data, class: "Grouping" });
    }

    get dice(): DiceTerm[] {
        if (this.term instanceof DiceTerm) return [this.term];

        if (isObject<{ dice?: unknown }>(this.term) && "dice" in this.term) {
            const { dice } = this.term;
            if (Array.isArray(dice) && dice.every((d): d is DiceTerm => d instanceof DiceTerm)) {
                return dice;
            }
        }
        return [];
    }

    /** Show a simplified expression if it is known that order of operations won't be lost */
    get expression(): string {
        if (
            this.isDeterministic &&
            typeof this.total === "number" &&
            !Number.isNaN(this.total) &&
            !isFlavoredArithmetic(this.term)
        ) {
            return this.total.toString();
        }
        return this.term instanceof DiceTerm || this.term instanceof MathTerm
            ? this.term.expression
            : `(${this.term.expression})`;
    }

    /** Preserve flavor of inner terms */
    override get formula(): string {
        const termFormula = this.term.formula;
        const flavor = this.flavor ? `[${this.flavor}]` : "";
        return `(${termFormula})${flavor}`;
    }

    override get total(): number | undefined {
        return this._evaluated || this.isDeterministic ? Number(this.term.total) : undefined;
    }

    get critImmuneTotal(): number | undefined {
        return this.term instanceof ArithmeticExpression || this.term instanceof Grouping
            ? this.term.critImmuneTotal
            : this.total;
    }

    override get isDeterministic(): boolean {
        return this.term.isDeterministic;
    }

    get minimumValue(): number {
        return DamageInstance.getValue(this.term, "minimum");
    }

    get expectedValue(): number {
        return DamageInstance.getValue(this.term);
    }

    get maximumValue(): number {
        return DamageInstance.getValue(this.term, "maximum");
    }

    protected override async _evaluate(
        options: { minimize?: boolean; maximize?: boolean } = {},
    ): Promise<Evaluated<this>> {
        if (!this.term._evaluated) {
            await this.term.evaluate({ async: true, ...options });
        }
        this._evaluated = true;

        return this as Evaluated<this>;
    }

    override toJSON(): GroupingData {
        return {
            ...super.toJSON(),
            term: this.term.toJSON(),
        };
    }

    /** Construct a string for an HTML rendering of this term */
    render(): DocumentFragment {
        const expression = ["precision", "splash"].includes(this.flavor)
            ? renderComponentDamage(this.term)
            : isSystemDamageTerm(this.term)
            ? this.term.render()
            : this.expression;

        const fragment = new DocumentFragment();
        // Don't render unnecessary parentheses
        const nodes =
            this.term instanceof NumericTerm || this.term instanceof Die ? [expression] : ["(", expression, ")"];
        fragment.append(...nodes);

        return fragment;
    }
}

interface GroupingData extends RollTermData {
    class?: "Grouping";
    term: RollTermData;
}

/**
 * A `Die` surrogate where the `number` or `faces` were not resolvable to numbers at parse time: serializes itself as a
 * `Die` as soon it is able (guaranteed after evaluation)
 */
class IntermediateDie extends RollTerm<IntermediateDieData> {
    number: number | MathTerm | Grouping;

    faces: number | MathTerm | Grouping;

    die: Die | null;

    constructor(data: IntermediateDieData) {
        super(data);

        const setTerm = (
            termData: number | NumericTermData | MathTermData | GroupingData,
        ): number | MathTerm | Grouping => {
            if (typeof termData === "number") return termData;

            const TermCls = CONFIG.Dice.termTypes[termData.class ?? "NumericTerm"];
            const term = simplifyTerm(TermCls.fromData(termData));
            if (term instanceof NumericTerm) return term.number;

            // Immediately evaluate deterministic number or faces
            if (term.isDeterministic) return Roll.safeEval(term.formula);

            // User is up to something weird
            if (term instanceof Grouping) {
                term.isIntermediate = true;
                return term;
            }

            // User is up to something _really_ weird
            if (!(term instanceof MathTerm)) {
                console.warn(`Unexpected term type: ${term.constructor.name}`);
            }

            return term as MathTerm;
        };

        this.number = setTerm(data.number);
        this.faces = setTerm(data.faces);
        this.die = ((): Die | null => {
            if (data.die) return Die.fromData({ ...data.die, class: "Die" });
            if (typeof this.number === "number" && typeof this.faces === "number") {
                return Die.fromData({
                    number: this.number,
                    faces: this.faces,
                    evaluated: this._evaluated,
                    options: this.options,
                });
            }
            return null;
        })();
    }

    static override SERIALIZE_ATTRIBUTES = ["number", "faces", "die"];

    get expression(): string {
        return this.die?.expression ?? `${this.number}d${this.faces}`;
    }

    override get total(): number | undefined {
        return this.isDeterministic ? Number(this.number) * Number(this.faces) : this.die?.total;
    }

    get dice(): Die[] {
        return this.die ? [this.die] : [];
    }

    override get isDeterministic(): boolean {
        return this.number === 0 || this.faces === 0 || this.faces === 1;
    }

    get minimumValue(): number {
        return DamageInstance.getValue(
            this.die ?? new Die({ number: Number(this.number), faces: Number(this.faces) }),
            "minimum",
        );
    }

    /** Not able to get an expected value from a Math term */
    get expectedValue(): number {
        return DamageInstance.getValue(this.die ?? new Die({ number: Number(this.number), faces: Number(this.faces) }));
    }

    get maximumValue(): number {
        return DamageInstance.getValue(
            this.die ?? new Die({ number: Number(this.number), faces: Number(this.faces) }),
            "maximum",
        );
    }

    protected override async _evaluate(): Promise<Evaluated<this>>;
    protected override async _evaluate(): Promise<this> {
        if (typeof this.number !== "number") {
            this.number = (await this.number.evaluate({ async: true })).total;
        }
        if (typeof this.faces !== "number") {
            this.faces = (await this.faces.evaluate({ async: true })).total;
        }

        this.die = await new Die({
            number: this.number,
            faces: this.faces,
            options: this.options,
        }).evaluate({ async: true });
        this._evaluated = true;

        return this;
    }

    override toJSON(): DieData | IntermediateDieData {
        if (this.die) return this.die.toJSON();
        if (typeof this.number === "number" && typeof this.faces === "number") {
            return Die.fromData({
                class: "Die",
                number: this.number,
                faces: this.faces,
                evaluated: this._evaluated,
                options: this.options,
            });
        }
        return {
            ...super.toJSON(),
            number: typeof this.number === "number" ? this.number : this.number.toJSON(),
            faces: typeof this.faces === "number" ? this.faces : this.faces.toJSON(),
        };
    }
}

interface IntermediateDieData extends RollTermData {
    class?: string;
    number: number | NumericTermData | MathTermData | GroupingData;
    faces: number | NumericTermData | MathTermData | GroupingData;
    die?: DieData | null;
}

class InstancePool extends PoolTerm {
    /** Work around upstream bug in which method attempts to construct `Roll`s from display formulas */
    static override fromRolls<TTerm extends PoolTerm>(this: ConstructorOf<TTerm>, rolls?: Roll[]): TTerm;
    static override fromRolls(rolls: DamageInstance[] = []): PoolTerm {
        const allEvaluated = rolls.every((r) => r._evaluated);
        const noneEvaluated = !rolls.some((r) => r._evaluated);
        if (!(allEvaluated || noneEvaluated)) return super.fromRolls(rolls);

        const pool = new this({
            terms: rolls.map((r) => r._formula),
            modifiers: [],
            rolls: rolls,
            results: allEvaluated ? rolls.map((r) => ({ result: r.total!, active: true })) : [],
        });
        pool._evaluated = allEvaluated;

        return pool;
    }
}

interface InstancePool extends PoolTerm {
    rolls: DamageInstance[];
}

export { ArithmeticExpression, Grouping, InstancePool, IntermediateDie };
export type { GroupingData };
