import { ChatMessagePF2e } from "@module/chat-message";
import { DamageCategory, DamageDieSize } from "@system/damage/damage";
import { MATH_FUNCTION_NAMES } from "@module/data";

function asDamageDieSize(faces: number) {
    return `d${faces}` as DamageDieSize;
}

interface DamageCategoriesResult {
    categories: string[];
    dice: Partial<Record<DamageDieSize, number>>;
    formula: string;
    label: string;
    modifier: number;
    results: Partial<Record<DamageDieSize, number[]>>;
    total: number;
}

interface DamageCategoriesMultiplier {
    [multipliers: number]: DamageCategoriesResult;
}

interface DamageTypeResult {
    [categories: string]: DamageCategoriesMultiplier;
}

function getTermParts(term: RollTerm, flavor?: string) {
    const parts = (term.flavor || flavor || "untyped").split(",").map((part) => part.trim().toLowerCase());
    const type = parts[parts.length - 1];
    const base = DamageCategory.fromDamageType(type);
    const categories = parts.filter((c) => c !== type);
    if (!categories.includes(base)) {
        categories.push(base);
    }
    return { parts, type, base, categories };
}

function ensureDamageCategory(
    types: Record<string, DamageTypeResult>,
    categories: string[],
    base: string,
    type: string,
    multiplier: number
) {
    const set = categories.map((c) => c.toLowerCase()).join("-");
    const t = (types[type] ??= {} as DamageTypeResult);
    const m = (t[set] ??= {} as DamageCategoriesMultiplier);
    const category: DamageCategoriesResult = (m[multiplier] ??= {
        categories: [],
        dice: {},
        formula: "",
        label: "",
        modifier: 0,
        results: {},
        total: 0,
    });
    category.categories = categories;
    category.label = categories.filter((c) => c !== base).join(" ") || base;
    return category;
}

function applyDiceResult(category: DamageCategoriesResult, dice: Die, multiplier: number) {
    const faces = asDamageDieSize(dice.faces);
    category.dice[faces] = (category.dice[faces] ?? 0) + dice.number;
    category.results[faces] = (category.results[faces] ?? []).concat(dice.results.map((d) => d.result));
    category.total += (dice.total ?? 0) * multiplier;
}

function applyModifier(category: DamageCategoriesResult, modifier: number, multiplier: number) {
    category.modifier ??= 0;
    category.modifier += modifier * multiplier;
    category.total += modifier * multiplier;
}

function processRollTerms(
    types: Record<string, DamageTypeResult>,
    terms: RollTerm[],
    notes: string[],
    flavor?: string
) {
    let operand: Exclude<RollTerm, OperatorTerm> | null = null;
    let operator: OperatorTerm | null | undefined;
    for (const term of terms) {
        const { parts, type, base, categories } = getTermParts(term, flavor);
        if (term instanceof OperatorTerm) {
            if (["+", "-"].includes(term.operator) && operand instanceof Die) {
                const category = ensureDamageCategory(types, categories, base, type, 1);
                applyDiceResult(category, operand, 1);
                operand = null;
            }
            operator = term;
        } else if (term instanceof Die) {
            if (["*", "/"].includes(operator?.operator ?? "") && operand instanceof NumericTerm) {
                const multiplier = operator?.operator === "/" ? 1 / operand.number : operand.number;
                const category = ensureDamageCategory(types, categories, base, type, multiplier);
                applyDiceResult(category, term, multiplier);
                operand = null;
                operator = null;
            } else {
                operand = term;
            }
        } else if (term instanceof NumericTerm) {
            if (["*", "/"].includes(operator?.operator ?? "") && operand instanceof Die) {
                const multiplier = operator?.operator === "/" ? 1 / term.number : term.number;
                const category = ensureDamageCategory(types, categories, base, type, multiplier);
                applyDiceResult(category, operand, multiplier);
                operand = null;
            } else if (["+", "-"].includes(operator?.operator ?? "")) {
                const multiplier = 1;
                const modifier = operator?.operator === "-" ? -term.number : term.number;
                const category = ensureDamageCategory(types, categories, base, type, multiplier);
                applyModifier(category, modifier, multiplier);
                operand = null;
            } else {
                operand = term;
            }
            operator = null;
        } else if (term instanceof PoolTerm) {
            if (operator) {
                operator = null;
            } else {
                operand = term;
            }
            for (const roll of term.rolls) {
                processRollTerms(types, roll.terms, notes, parts.join(","));
            }
        }
    }

    // trailing or single operands
    if (operand) {
        const { type, base, categories } = getTermParts(operand, flavor);
        const multiplier = 1;
        const category = ensureDamageCategory(types, categories, base, type, multiplier);
        if (operand instanceof Die) {
            applyDiceResult(category, operand, multiplier);
        } else if (operand instanceof NumericTerm) {
            applyModifier(category, operand.number, multiplier);
        }
    }
}

// data structures suitable for rendering in the chat card

interface DamageBreakdownCategory {
    categories: string[];
    formula: string;
    label: string;
    modifier: number;
    results: Partial<Record<DamageDieSize, number[]>>;
    total: number;
    type: string;
}

interface DamageBreakdownType {
    [set: string]: DamageBreakdownCategory;
}

interface DamageBreakdown {
    [type: string]: DamageBreakdownType;
}

interface DamageBreakdownContext {
    suppress: {
        splashInlineRolls: boolean;
        persistentNotes: boolean;
    };
}

function prepareCardData(
    processed: Record<string, DamageTypeResult>,
    notes: string[],
    context: DamageBreakdownContext
) {
    const types: DamageBreakdown = {};
    const splash: DamageBreakdownCategory[] = [];
    for (const [type, categories] of Object.entries(processed)) {
        const breakdownType = (types[type] ??= {} as DamageBreakdownType);
        for (const [set, multipliers] of Object.entries(categories)) {
            const category = breakdownType[set] ?? ({} as DamageBreakdownCategory);
            category.formula ??= "";
            category.modifier ??= 0;
            category.results ??= {};
            category.total ??= 0;
            category.type = type;
            const sorted = Object.entries(multipliers)
                .sort(([a, _aa], [b, _bb]) => a.localeCompare(b))
                .reverse();
            for (const [multiplier, sourceCategory] of sorted) {
                if (multiplier === "0") continue; // skip zero multiplier damage

                // construct formula for this specific damage type/category combination
                let formula = Object.entries(sourceCategory.dice)
                    .map(([faces, number]) => `${number}${faces}`)
                    .join("+");
                if (sourceCategory.modifier) {
                    formula +=
                        sourceCategory.modifier < 0 || !formula
                            ? `${sourceCategory.modifier}`
                            : `+${sourceCategory.modifier}`;
                }
                if (category.formula) {
                    category.formula += " + ";
                }
                category.formula += multiplier === "1" ? formula : `${multiplier} × (${formula})`;

                category.categories ??= sourceCategory.categories;
                category.label ??= sourceCategory.label;
                category.modifier += sourceCategory.modifier;
                for (const [damageDie, results] of Object.entries(sourceCategory.results)) {
                    const dds = damageDie as DamageDieSize;
                    category.results[dds] = (category.results[dds] ?? []).concat(results as number[]);
                }
                category.total += sourceCategory.total;

                // collect splash damage to be put as a roll note
                if (category.categories.includes("splash")) {
                    splash.push(category);
                }
            }

            if (category.categories.includes("persistent") && !context.suppress.persistentNotes) {
                const base = DamageCategory.fromDamageType(category.type);
                const formula = category.formula;
                const categories = category.categories
                    .filter((c) => c !== base)
                    .concat(category.type)
                    .join(",");
                const label = category.categories
                    .filter((c) => c !== base)
                    .concat(category.type)
                    .join(" ");
                const suppress = `&lt;code style="display:none;"&gt;suppress-persistent-notes&lt;/code&gt;`;
                notes.push(`[[/roll {${formula}}[${categories}] # ${label} ${suppress}]]{${formula} ${label}}`);
            } else {
                breakdownType[set] = category;
            }
        }
    }

    if (splash.length && !context.suppress.splashInlineRolls) {
        const splashRoll = splash
            .map((s) => {
                const base = DamageCategory.fromDamageType(s.type);
                const categories = s.categories
                    .filter((c) => c !== base)
                    .concat(s.type)
                    .join(",");
                return `{${s.formula}}[${categories}]`;
            })
            .join(" + ");
        const splashLabel = splash
            .map((s) => {
                const base = DamageCategory.fromDamageType(s.type);
                const label = s.categories
                    .filter((c) => c !== base)
                    .concat(s.type)
                    .join(" ");
                return `${s.formula} ${label}`;
            })
            .join(" + ");
        notes.push(
            `<p class="compact-text">[[/roll ${splashRoll} # Splash Damage &lt;code style="display:none;"&gt;suppress-splash-inline-roll&lt;/code&gt;]]{${splashLabel}}</p>`
        );
    }

    return types;
}

// provide a list of keywords to filter roll formulas by, as it is currently not possible to safely parse roll formulas
// containing math functions
const UNPARSEABLE_ROLL_SYNTAX = [...MATH_FUNCTION_NAMES];

export const DamageChatCard = {
    decorate: async (message: ChatMessagePF2e, html: JQuery): Promise<void> => {
        if (!game.settings.get("pf2e", "automation.experimentalDamageFormatting")) return;
        const preformatted = message.data.flags.pf2e?.preformatted as string;
        if (preformatted === "both") return;
        if (!message.isDamageRoll) return;

        const originalFormula = message.roll["_formula"];
        if (UNPARSEABLE_ROLL_SYNTAX.some((f) => originalFormula.includes(f))) {
            console.warn(
                "PF2E | Unable to safely parse roll formulas containing math functions, skipping formatting of roll with formula:",
                originalFormula
            );
            return;
        }

        const $flavor = (() => {
            let flavor = html.find(".flavor-text");
            if (!flavor.length) {
                flavor = $("<div class='flavor-text'></div>");
                html.find("header.message-header").after(flavor);
            }
            return flavor;
        })();
        const originalFlavor = $flavor.html()?.trim();
        if (originalFlavor?.includes("suppress-formatting")) return;
        const context: DamageBreakdownContext = {
            suppress: {
                splashInlineRolls: originalFlavor?.includes("suppress-splash-inline-roll") ?? false,
                persistentNotes: originalFlavor?.includes("suppress-persistent-notes") ?? false,
            },
        };

        const notes: string[] = [];
        const processed: Record<string, DamageTypeResult> = {};
        processRollTerms(processed, message.roll.terms, notes);

        // put the damage parts together in a format suitable for rendering in the chat card
        const types = prepareCardData(processed, notes, context);

        // flavor
        if (["both", "flavor"].includes(preformatted)) {
            // skip processing for messages with preformatted flavor
        } else {
            const flavor = await renderTemplate("systems/pf2e/templates/chat/damage/damage-card-flavor.html", {
                breakdown: message.data.flags.pf2e?.breakdown ?? [],
                dataset: {
                    traits: {
                        weapon: CONFIG.PF2E.weaponTraits,
                    },
                },
                flavor: message.data.flags.pf2e?.flavor ?? originalFlavor ?? "",
                //formula: message.roll.formula,
                notes: message.data.flags.pf2e?.notes ?? notes,
                outcome: message.data.flags.pf2e?.outcome,
                traits: message.data.flags.pf2e?.traits ?? [],
            });
            $flavor.html(flavor?.trim() ?? "");
        }

        // content
        if (["both", "content"].includes(preformatted)) {
            // skip processing for messages with preformatted content
        } else {
            const formula = Object.entries(types)
                .map(([type, categories]) => {
                    const base = DamageCategory.fromDamageType(type);
                    return Object.values(categories)
                        .map((result) => {
                            const categories = result.categories.filter((c) => c !== base).join(" ");
                            return `${result.formula} ${categories} ${type}`;
                        })
                        .join(" + ");
                })
                .join(" + ");
            const total = Object.values(types)
                .flatMap((categories) => Object.values(categories))
                .reduce((accumulator, current) => accumulator + current.total, 0);
            const content = await renderTemplate("systems/pf2e/templates/chat/damage/damage-card-content.html", {
                damage: { formula, notes, total, types },
            });
            html.find(".message-content").html(content.trim());
        }
    },
};
