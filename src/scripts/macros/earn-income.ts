import type { ActorPF2e, CharacterPF2e } from "@actor";
import type { CharacterSkill } from "@actor/character/types.ts";
import type { Rolled } from "@client/dice/roll.d.mts";
import { Coins, RawCoins } from "@item/physical/coins.ts";
import { ChatMessagePF2e } from "@module/chat-message/document.ts";
import type { OneToFour } from "@module/data.ts";
import { calculateDC } from "@module/dc.ts";
import { eventToRollParams } from "@module/sheet/helpers.ts";
import type { CheckRoll } from "@system/check/roll.ts";
import { DegreeAdjustmentsRecord, DegreeOfSuccess } from "@system/degree-of-success.ts";
import { ErrorPF2e } from "@util";

interface ConstructorParams extends DeepPartial<fa.ApplicationConfiguration> {
    actor: CharacterPF2e;
}

interface MakeCheckParams {
    event: Event | undefined;
    skill: CharacterSkill;
    days: number;
    dc: number;
}

interface CalculateParams extends Omit<MakeCheckParams, "event"> {
    level: number;
    roll: Rolled<CheckRoll>;
}

interface Result extends Pick<CalculateParams, "days" | "level" | "roll"> {
    reward: { perDay: Coins; total: Coins };
}

class EarnIncomeDialog extends fa.api.HandlebarsApplicationMixin(fa.api.ApplicationV2) {
    constructor(config: ConstructorParams) {
        super(config);
        this.#actor = config.actor;
    }

    static override DEFAULT_OPTIONS: DeepPartial<fa.ApplicationConfiguration> = {
        id: "earn-income",
        tag: "form",
        window: {
            icon: "fa-solid fa-hand-holding-circle-dollar",
            title: "PF2E.Actions.EarnIncome.Title",
            contentClasses: ["standard-form"],
        },
        position: { width: 480 },
        actions: { cancel: EarnIncomeDialog.#onClickCancel },
        form: {
            closeOnSubmit: true,
            handler: EarnIncomeDialog.#onSubmit,
        },
    };

    static override PARTS = {
        prompt: {
            template: `systems/${SYSTEM_ID}/templates/macros/earn-income/prompt.hbs`,
            templates: [`systems/${SYSTEM_ID}/templates/macros/earn-income/result.hbs`],
            root: true,
        },
        footer: { template: "templates/generic/form-footer.hbs" },
    };

    static REWARDS_BY_LEVEL = {
        0: { failure: { cp: 1 }, rewards: EarnIncomeDialog.#buildRewards({ cp: 5 }) },
        1: { failure: { cp: 2 }, rewards: EarnIncomeDialog.#buildRewards({ sp: 2 }) },
        2: { failure: { cp: 4 }, rewards: EarnIncomeDialog.#buildRewards({ sp: 3 }) },
        3: { failure: { cp: 8 }, rewards: EarnIncomeDialog.#buildRewards({ sp: 5 }) },
        4: { failure: { sp: 1 }, rewards: EarnIncomeDialog.#buildRewards({ sp: 7 }, { sp: 8 }) },
        5: { failure: { sp: 2 }, rewards: EarnIncomeDialog.#buildRewards({ sp: 9 }, { gp: 1 }) },
        6: { failure: { sp: 3 }, rewards: EarnIncomeDialog.#buildRewards({ gp: 1, sp: 5 }, { gp: 2 }) },
        7: { failure: { sp: 4 }, rewards: EarnIncomeDialog.#buildRewards({ gp: 2 }, { gp: 2, sp: 5 }) },
        8: { failure: { sp: 5 }, rewards: EarnIncomeDialog.#buildRewards({ gp: 2, sp: 5 }, { gp: 3 }) },
        9: { failure: { sp: 6 }, rewards: EarnIncomeDialog.#buildRewards({ gp: 3 }, { gp: 4 }) },
        10: { failure: { sp: 7 }, rewards: EarnIncomeDialog.#buildRewards({ gp: 4 }, { gp: 5 }, { gp: 6 }) },
        11: { failure: { sp: 8 }, rewards: EarnIncomeDialog.#buildRewards({ gp: 5 }, { gp: 6 }, { gp: 8 }) },
        12: { failure: { sp: 9 }, rewards: EarnIncomeDialog.#buildRewards({ gp: 6 }, { gp: 8 }, { gp: 10 }) },
        13: { failure: { gp: 1 }, rewards: EarnIncomeDialog.#buildRewards({ gp: 7 }, { gp: 10 }, { gp: 15 }) },
        14: { failure: { gp: 1, sp: 5 }, rewards: EarnIncomeDialog.#buildRewards({ gp: 8 }, { gp: 15 }, { gp: 20 }) },
        15: { failure: { gp: 2 }, rewards: EarnIncomeDialog.#buildRewards({ gp: 10 }, { gp: 20 }, { gp: 28 }) },
        16: {
            failure: { gp: 2, sp: 5 },
            rewards: EarnIncomeDialog.#buildRewards({ gp: 13 }, { gp: 25 }, { gp: 36 }, { gp: 40 }),
        },
        17: {
            failure: { gp: 3 },
            rewards: EarnIncomeDialog.#buildRewards({ gp: 15 }, { gp: 30 }, { gp: 45 }, { gp: 55 }),
        },
        18: {
            failure: { gp: 4 },
            rewards: EarnIncomeDialog.#buildRewards({ gp: 20 }, { gp: 45 }, { gp: 70 }, { gp: 90 }),
        },
        19: {
            failure: { gp: 6 },
            rewards: EarnIncomeDialog.#buildRewards({ gp: 30 }, { gp: 60 }, { gp: 100 }, { gp: 130 }),
        },
        20: {
            failure: { gp: 8 },
            rewards: EarnIncomeDialog.#buildRewards({ gp: 40 }, { gp: 75 }, { gp: 150 }, { gp: 200 }),
        },
        21: {
            failure: { cp: 0 },
            rewards: EarnIncomeDialog.#buildRewards({ gp: 50 }, { gp: 90 }, { gp: 175 }, { gp: 300 }),
        },
    };

    #actor: CharacterPF2e;

    static create(actor?: Maybe<ActorPF2e>): Promise<EarnIncomeDialog> | null {
        actor ??= game.user.character;
        if (!actor?.isOfType("character")) {
            ui.notifications.error(`Select at least one PC.`);
            return null;
        }
        return new EarnIncomeDialog({ actor }).render({ force: true });
    }

    static #buildRewards(...rewards: RawCoins[]): Record<OneToFour, Coins> {
        const [trained, expert, master, legendary] = rewards;
        return {
            1: new Coins(trained),
            2: new Coins(expert ?? trained),
            3: new Coins(master ?? expert ?? trained),
            4: new Coins(legendary ?? master ?? expert ?? trained),
        };
    }

    protected override async _prepareContext(
        options: fa.ApplicationRenderOptions,
    ): Promise<fa.ApplicationRenderContext> {
        const context = await super._prepareContext(options);
        const skillOptions = Object.values(this.#actor.skills)
            .filter((s) => s.proficient)
            .map((s) => ({ value: s.slug, label: s.label }));
        return Object.assign(context, {
            maxLevel: Math.min(this.#actor.level, 20),
            defaults: game.settings.get(SYSTEM_ID, "earnIncome"),
            skillOptions,
            buttons: [
                {
                    type: "submit",
                    icon: "fa-solid fa-dice-d20",
                    label: "PF2E.Roll.Roll",
                    default: true,
                },
                {
                    type: "button",
                    icon: "fa-solid fa-times",
                    label: "Cancel",
                    action: "cancel",
                },
            ],
        });
    }

    /**
     * @param level number between 0 and 20
     * @param days how many days you want to work for
     * @param rollBrief the die result and total modifier of a check roll
     * @param proficiency proficiency in the relevant skill
     * @param options feats or items that affect earn income
     * @param dcOptions if dc by level is active
     */
    #calculateResult({ skill, level, days, dc, roll }: CalculateParams): Result {
        if (skill.rank === 0) throw ErrorPF2e("Unexpected skill rank");
        type IncomeLevelMap = typeof EarnIncomeDialog.REWARDS_BY_LEVEL;
        type IncomeEarnerLevel = keyof IncomeLevelMap;
        type IncomeForLevel = { failure: Coins; rewards: Record<OneToFour, Coins> };

        const incomeForLevel = (level: number): IncomeForLevel => {
            const income = EarnIncomeDialog.REWARDS_BY_LEVEL[Math.clamp(level, 0, 21) as IncomeEarnerLevel];
            return { failure: new Coins(income.failure), rewards: income.rewards };
        };

        const experiencedSkill = this.#actor.itemTypes.feat.find((f) => f.slug === "experienced-professional");
        const adjustments: DegreeAdjustmentsRecord =
            skill.lore && experiencedSkill
                ? { criticalFailure: { label: experiencedSkill.name, amount: "failure" } }
                : {};
        const degree = new DegreeOfSuccess(roll, dc, adjustments);
        const rewardPerDay = (() => {
            switch (degree.value) {
                case DegreeOfSuccess.CRITICAL_SUCCESS:
                    return incomeForLevel(level + 1).rewards[skill.rank];
                case DegreeOfSuccess.SUCCESS:
                    return incomeForLevel(level).rewards[skill.rank];
                case DegreeOfSuccess.FAILURE: {
                    const baseAmount = incomeForLevel(level).failure;
                    return experiencedSkill ? baseAmount.scale(2) : baseAmount;
                }
                default:
                    return new Coins();
            }
        })();
        return {
            level,
            days,
            reward: { perDay: rewardPerDay, total: rewardPerDay.scale(days) },
            roll,
        };
    }

    async #toMessage(result: Result): Promise<void> {
        const templatePath = `systems/${SYSTEM_ID}/templates/macros/earn-income/result.hbs`;
        const content = await fa.handlebars.renderTemplate(templatePath, { ...result, systemId: SYSTEM_ID });
        await ChatMessagePF2e.create({ content, speaker: ChatMessagePF2e.getSpeaker({ actor: this.#actor }) });
    }

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    static async #onSubmit(
        this: EarnIncomeDialog,
        event: Event,
        _form: HTMLFormElement,
        formData: fa.ux.FormDataExtended,
    ): Promise<void> {
        const submitData = formData.object;
        const level = Number(submitData["level"]) || 0;
        const days = Number(submitData["days"]) || 1;
        const skillSlug = typeof submitData["skill"] === "string" ? submitData["skill"] || null : null;
        if (!skillSlug) throw ErrorPF2e("No skill selected");
        const skill = this.#actor.skills[skillSlug];
        if (!skill?.proficient) throw ErrorPF2e("Skill not found");
        await game.settings.set(SYSTEM_ID, "earnIncome", { level, days, skill: skillSlug });
        const dc = calculateDC(level);
        const roll = await skill.roll({
            ...eventToRollParams(event, { type: "check" }),
            action: "earn-income",
            dc,
            label: `Earn Income: ${skill.label}`,
            traits: ["downtime"],
        });
        if (!roll) throw ErrorPF2e("Unexpected failure to make check roll");
        const result = this.#calculateResult({ skill, level, days, dc, roll });
        return this.#toMessage(result);
    }

    static #onClickCancel(this: EarnIncomeDialog) {
        return this.close();
    }
}

export { EarnIncomeDialog };
