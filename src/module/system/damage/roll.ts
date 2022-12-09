import { DamageRollFlag } from "@module/chat-message";
import { UserPF2e } from "@module/user";
import { DEGREE_OF_SUCCESS_STRINGS } from "@system/degree-of-success";
import { RollDataPF2e } from "@system/rolls";
import { DamageCategory, DamageCategoryRenderData, DamageRollRenderData, DamageType } from "./types";
import { DAMAGE_TYPE_ICONS } from "./values";
import { DamageTemplate } from "./weapon";

class DamageRoll extends Roll {
    roller: UserPF2e | null;

    override get formula(): string {
        const outcome = DEGREE_OF_SUCCESS_STRINGS[this.options.degreeOfSuccess ?? 2];
        return this.options.damage.formula[outcome ?? 2]?.formula ?? super.formula;
    }

    constructor(formula: string, data = {}, options: DamageRollDataPF2e) {
        super(formula, data, options);
        this.roller = game.users.get(options?.rollerId ?? "") ?? null;
        if (options.result) {
            this._evaluated = true;
            this._total = options.result.total;
        }
    }

    protected override async _evaluate(options?: Omit<EvaluateRollParams, "async"> | undefined): Promise<Rolled<this>> {
        const { damage } = this.options;
        const outcome = DEGREE_OF_SUCCESS_STRINGS[this.options.degreeOfSuccess ?? 2];
        const formula = this.options.damage.formula[outcome ?? 2];
        if (!formula) return this as Rolled<this>;

        const rollData: DamageRollFlag = {
            outcome,
            traits: damage.traits ?? [],
            types: {},
            total: 0,
            diceResults: {},
            baseDamageDice: damage.effectDice,
        };

        const rolls: Rolled<Roll>[] = [];

        for (const [damageType, categories] of Object.entries(formula.partials)) {
            rollData.diceResults[damageType] = {};
            for (const [damageCategory, partial] of Object.entries(categories)) {
                const roll = await new Roll(partial, formula.data).evaluate({ ...options, async: true });
                rolls.push(roll);
                const damageValue = rollData.types[damageType] ?? {};
                damageValue[damageCategory] = roll.total;
                rollData.types[damageType] = damageValue;
                rollData.total += roll.total;
                rollData.diceResults[damageType][damageCategory] = roll.dice.flatMap((d) =>
                    d.results.map((r) => ({ faces: d.faces ?? 0, result: r.result }))
                );
            }
        }

        const pool = PoolTerm.fromRolls(rolls);

        // Work around above cobbling together roll card template above while constructing the actual roll
        const firstResult = pool.results.at(0);
        if (rollData.total === 0 && firstResult?.result === 0) {
            rollData.total = 1;
            firstResult.result = 1;
        }

        this.options.result = rollData;
        this.terms = [pool];
        this._evaluated = true;
        this._total = pool.total;

        return this as Rolled<this>;
    }

    override async getTooltip(): Promise<string> {
        const { result } = this.options;
        const outcome = DEGREE_OF_SUCCESS_STRINGS[this.options.degreeOfSuccess ?? 2];
        const formula = this.options.damage.formula[outcome ?? 2];
        if (!result || !formula) return super.getTooltip();

        const damageTypes = CONFIG.PF2E.damageTypes;
        const damageCategories = CONFIG.PF2E.damageCategories;

        const renderData: DamageRollRenderData = { damageTypes: {} };
        for (const [damageType, categories] of Object.entries(result.diceResults)) {
            renderData.damageTypes[damageType] = {
                icon: DAMAGE_TYPE_ICONS[damageType] ?? damageType,
                label: damageTypes[damageType as DamageType] ?? damageType,
                categories: Object.entries(categories).reduce((output, [damageCategory, dice]) => {
                    output[damageCategory] = {
                        dice,
                        formula: formula.partials[damageType]?.[damageCategory],
                        label: damageCategories[damageCategory as DamageCategory] ?? damageCategory,
                        total: result.types[damageType]?.[damageCategory] ?? 0,
                    };

                    return output;
                }, {} as Record<string, DamageCategoryRenderData>),
            };
        }

        return await renderTemplate("systems/pf2e/templates/chat/damage/damage-card-details.html", renderData);
    }

    /** Overriden to use formula override instead of _formula */
    override async render(chatOptions?: RollRenderOptions | undefined): Promise<string> {
        if (this._evaluated) this._formula = this.formula;
        return super.render(chatOptions);
    }
}

interface DamageRoll {
    options: DamageRollDataPF2e;
}

interface DamageRollDataPF2e extends RollDataPF2e {
    damage: DamageTemplate;
    result?: DamageRollFlag;
}

export { DamageRoll };
