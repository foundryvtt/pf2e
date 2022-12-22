import { DamageRollFlag } from "@module/chat-message";
import { UserPF2e } from "@module/user";
import { RollDataPF2e } from "@system/rolls";
import { ErrorPF2e, fontAwesomeIcon, isObject, setHasElement } from "@util";
import Peggy from "peggy";
import { DamageCategorization, deepFindTerms, renderSplashDamage } from "./helpers";
import { ArithmeticExpression, Grouping, InstancePool } from "./terms";
import { DamageCategory, DamageTemplate, DamageType } from "./types";
import { DAMAGE_TYPES, DAMAGE_TYPE_ICONS } from "./values";

abstract class AbstractDamageRoll extends Roll {
    static parser = Peggy.generate(ROLL_GRAMMAR);

    static override replaceFormulaData(
        formula: string,
        data: Record<string, unknown>,
        options: { missing?: string; warn?: boolean } = {}
    ): string {
        const replaced = super.replaceFormulaData(formula, data, options);
        return replaced.replace(/\((\d+)\)/g, "$1");
    }
}

class DamageRoll extends AbstractDamageRoll {
    roller: UserPF2e | null;

    constructor(formula: string, data = {}, options?: DamageRollDataPF2e) {
        const wrapped = formula.startsWith("{") ? formula : `{${formula}}`;
        super(wrapped, data, options);

        this.roller = game.users.get(options?.rollerId ?? "") ?? null;
    }

    static override CHAT_TEMPLATE = "systems/pf2e/templates/dice/damage-roll.hbs";

    static override TOOLTIP_TEMPLATE = "systems/pf2e/templates/dice/damage-tooltip.hbs";

    static override parse(formula: string, data: Record<string, unknown>): [InstancePool] {
        const replaced = this.replaceFormulaData(formula, data, { missing: "0" });
        const poolData = ((): PoolTermData | null => {
            try {
                return this.parser.parse(replaced);
            } catch {
                console.error(`Failed to parse damage formula "${formula}"`);
                return null;
            }
        })();
        if (poolData?.class !== "PoolTerm") {
            throw ErrorPF2e("A damage roll must consist of a single PoolTerm");
        }
        this.classifyDice(poolData);

        return [InstancePool.fromData(poolData)];
    }

    /** Identify each "DiceTerm" raw object with a non-abstract subclass name */
    static classifyDice(data: RollTermData): void {
        // Find all dice terms and resolve their class
        type PreProcessedDiceTerm = { class?: string; faces?: string | number | object };
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
                ? instanceFormula.slice(1).replace(/\)([^)]+)$/i, "$1")
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

    /** Return an Array of the individual DiceTerm instances contained within this Roll. */
    override get dice(): DiceTerm[] {
        const { instances } = this;
        return instances.length > 0 ? instances.flatMap((i) => i.dice) : super.dice;
    }

    static override fromData<TRoll extends Roll>(this: AbstractConstructorOf<TRoll>, data: RollJSON): TRoll;
    static override fromData(data: RollJSON): AbstractDamageRoll {
        for (const term of data.terms) {
            this.classifyDice(term);
        }

        return super.fromData(data);
    }

    protected override _evaluateSync(): never {
        throw ErrorPF2e("Damage rolls must be evaluated asynchronously");
    }

    override async getTooltip(): Promise<string> {
        const instances = this.instances.map((i) => ({
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
            tooltip: isPrivate ? "" : await this.getTooltip(),
            instances,
            total: isPrivate ? "?" : Math.floor((this.total! * 100) / 100),
        };

        return renderTemplate(template, chatData);
    }
}

interface DamageRoll extends AbstractDamageRoll {
    constructor: typeof DamageRoll;

    options: DamageRollDataPF2e;
}

class DamageInstance extends AbstractDamageRoll {
    type: DamageType;

    persistent: boolean;

    partialTotal(this: Rolled<DamageInstance>, subinstance: "precision" | "splash"): number {
        if (!this._evaluated) {
            throw ErrorPF2e("Splash damage may not be accessed from an unevaluated damage instance");
        }

        return deepFindTerms(this.head, { flavor: subinstance }).reduce(
            (total, t) => total + (Number(t.total!) || 0),
            0
        );
    }

    constructor(formula: string, data = {}, options?: RollOptions) {
        super(formula, data, options);

        const flavorIdentifiers = (this.options.flavor?.replace(/[^a-z,]/g, "").split(",") ?? []).map((f) => f.trim());
        this.type = flavorIdentifiers.find((t): t is DamageType => setHasElement(DAMAGE_TYPES, t)) ?? "untyped";
        this.persistent = flavorIdentifiers.includes("persistent") || flavorIdentifiers.includes("bleed");
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
        if (syntaxTree.class === "Die") {
            return [Die.fromData(syntaxTree)];
        } else if (syntaxTree.class in CONFIG.Dice.termTypes) {
            return [CONFIG.Dice.termTypes[syntaxTree.class].fromData(syntaxTree)];
        }

        return [];
    }

    static override fromData<TRoll extends Roll>(this: ConstructorOf<TRoll>, data: RollJSON): TRoll;
    static override fromData(data: RollJSON): Roll {
        for (const term of data.terms) {
            DamageRoll.classifyDice(term);
        }

        return super.fromData(data);
    }

    /** Get the expected value of a term */
    static expectedValueOf(term: RollTerm): number {
        if (term instanceof NumericTerm) {
            return term.number;
        } else if (term instanceof Die) {
            return term.number * ((term.faces + 1) / 2);
        } else if (term instanceof ArithmeticExpression || term instanceof Grouping) {
            return term.expectedValue;
        }

        return 0;
    }

    override get formula(): string {
        const damageType =
            this.persistent && this.type !== "bleed"
                ? game.i18n.format("PF2E.Damage.RollFlavor.persistent", {
                      damageType: game.i18n.localize(`PF2E.Damage.RollFlavor.${this.type}`),
                  })
                : this.type
                ? game.i18n.localize(`PF2E.Damage.RollFlavor.${this.type}`)
                : "";
        return [this.head.expression, damageType].join(" ").trim();
    }

    override get total(): number | undefined {
        return this.persistent ? 0 : super.total;
    }

    /** The expected value of this damage instance */
    get expectedValue(): number {
        return DamageInstance.expectedValueOf(this.head);
    }

    get iconClass(): string | null {
        return DAMAGE_TYPE_ICONS[this.type];
    }

    /** Return 0 for persistent damage */
    protected override _evaluateTotal(): number {
        return this.persistent ? 0 : super._evaluateTotal();
    }

    override async render(): Promise<string> {
        const span = document.createElement("span");
        span.classList.add("instance", this.type);
        span.append(this.#renderFormula());

        if (this.persistent) {
            const icon = fontAwesomeIcon("clock");
            icon.classList.add("icon");
            icon.title = game.i18n.localize(CONFIG.PF2E.conditionTypes["persistent-damage"]);
            span.append(" ", icon);
        }

        const { iconClass } = this;
        if (iconClass) {
            if (!this.persistent) span.append(" ");
            const icon = fontAwesomeIcon(iconClass);
            icon.classList.add("icon");
            span.append(icon);
            span.title = game.i18n.localize(CONFIG.PF2E.damageTypes[this.type]);
        }

        return span.outerHTML;
    }

    /** Render this roll's formula for display in chat */
    #renderFormula(): DocumentFragment | HTMLElement | string {
        const head = this.head instanceof Grouping ? this.head.term : this.head;
        return head instanceof ArithmeticExpression
            ? head.render()
            : head.flavor === "splash"
            ? renderSplashDamage(head)
            : head.expression;
    }

    override get dice(): DiceTerm[] {
        return this.terms
            .reduce(
                (dice: (DiceTerm | never[])[], t) =>
                    t instanceof DiceTerm
                        ? [...dice, t]
                        : t instanceof Grouping || t instanceof ArithmeticExpression
                        ? [...dice, ...t.dice]
                        : [],
                this._dice
            )
            .flat();
    }

    /** Get the head term of this instance */
    get head(): RollTerm {
        return this.terms[0]!;
    }

    get category(): DamageCategory | null {
        return DamageCategorization.fromDamageType(this.type);
    }

    get typeLabel(): string {
        return game.i18n.localize(CONFIG.PF2E.damageTypes[this.type]);
    }
}

interface DamageRoll {
    options: DamageRollDataPF2e;
}

interface DamageRollDataPF2e extends RollDataPF2e {
    damage?: DamageTemplate;
    result?: DamageRollFlag;
}

export { DamageRoll, DamageInstance };
