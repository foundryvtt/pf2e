import { ErrorPF2e, isObject } from "@util";
import { renderSplashDamage } from "./helpers";

class ArithmeticExpression extends RollTerm<ArithmeticExpressionData> {
    operator: ArithmeticOperator;

    operands: RollTerm[];

    constructor(termData: ArithmeticExpressionData) {
        super(termData);

        this.operator = termData.operator;
        this.operands = termData.operands.slice(0, 2).map((datum) => {
            if (datum instanceof RollTerm) return datum;
            const TermCls =
                CONFIG.Dice.termTypes[datum.class ?? ""] ??
                Object.values(CONFIG.Dice.terms).find((t) => t.name === datum.class) ??
                Die;
            return TermCls.fromData(datum);
        }) as [RollTerm, RollTerm];
    }

    static override SERIALIZE_ATTRIBUTES = ["operator", "operands"];

    get dice(): DiceTerm[] {
        return this.operands.flatMap((o) =>
            o instanceof DiceTerm ? o : o instanceof Grouping || o instanceof ArithmeticExpression ? o.dice : []
        );
    }

    get expression(): string {
        const { operator, operands } = this;
        return `${operands[0].expression} ${operator} ${operands[1].expression}`;
    }

    override get total(): number | undefined {
        if (!this._evaluated) return undefined;
        const operands = [Number(this.operands[0].total), Number(this.operands[1].total)];
        switch (this.operator) {
            case "+":
                return operands[0] + operands[1];
            case "-":
                return operands[0] - operands[1];
            case "*":
                return operands[0] * operands[1];
            case "/":
                return operands[0] / operands[1];
            case "%":
                return operands[0] % operands[1];
        }
    }

    /** Construct a string for an HTML rendering of this term */
    render(): DocumentFragment {
        const [left, right] = this.operands.map((o): HTMLElement | string =>
            o.flavor === "splash" ? renderSplashDamage(o) : o.expression
        );
        const fragment = new DocumentFragment();
        fragment.append(left, ` ${this.operator} `, right);

        return fragment;
    }

    protected override async _evaluate(
        options: { minimize?: boolean; maximize?: boolean } = {}
    ): Promise<Evaluated<this>> {
        for (const operand of this.operands) {
            if (!operand._evaluated) {
                await operand.evaluate({ async: true, ...options });
            }
        }
        this._evaluated = true;

        return this as Evaluated<this>;
    }

    protected override _evaluateSync(): never {
        throw ErrorPF2e("Damage rolls must be evaluated asynchronously");
    }
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
        const childTerm = TermCls.fromData(termData.term);

        // Remove redundant groupings
        if (childTerm instanceof Grouping) {
            super(childTerm.toJSON());
            this.term = childTerm.term;
        } else {
            super(termData);
            this.term = childTerm;
        }
    }

    static override SERIALIZE_ATTRIBUTES = ["term"];

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

    get expression(): string {
        return `(${this.term.expression})`;
    }

    override get total(): number | undefined {
        return this._evaluated ? Number(this.term.total) : undefined;
    }

    protected override async _evaluate(
        options: { minimize?: boolean; maximize?: boolean } = {}
    ): Promise<Evaluated<this>> {
        if (!this.term._evaluated) {
            await this.term.evaluate({ async: true, ...options });
        }
        this._evaluated = true;

        return this as Evaluated<this>;
    }

    protected override _evaluateSync(): never {
        throw ErrorPF2e("Damage rolls must be evaluated asynchronously");
    }
}

interface ArithmeticExpressionData extends RollTermData {
    operator: ArithmeticOperator;
    operands: [RollTermData, RollTermData];
}

interface GroupingData extends RollTermData {
    term: RollTermData;
}

export { ArithmeticExpression, Grouping };
