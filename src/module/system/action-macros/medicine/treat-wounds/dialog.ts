import { isTreatWoundsTier, TREAT_WOUNDS_TIERS, TreatWoundsTier } from "./types.ts";
import { CheckDC } from "@system/degree-of-success.ts";
import { CreaturePF2e } from "@actor";
import { htmlQuery, htmlQueryAll } from "@util";
import { PROFICIENCY_RANKS, ZeroToFour } from "@module/data.ts";
import { Statistic } from "@system/statistic/index.ts";

interface TreatWoundsDialogOptions extends ApplicationOptions {
    difficultyClass: number;
    rollOptions: string[];
    skill: string;
    strict: boolean;
    tier: TreatWoundsTier;
}

interface TreatWoundsDialogData {
    app: string;
    difficultyClass: {
        hint?: string;
        invalid: boolean;
        locked: boolean;
        value?: number;
    };
    invalid: boolean;
    rank: number;
    skills: SkillCandidate[];
    skill: {
        hint?: string;
        invalid: boolean;
        value?: string;
    };
    strict: boolean;
    tier: {
        hint?: string;
        invalid: boolean;
        value?: TreatWoundsTier;
    };
    toggles: TreatWoundsToggle[];
}

interface TreatWoundsContext {
    difficultyClass: CheckDC;
    rollOptions: string[];
    skill: string;
    tier: TreatWoundsTier;
}

interface SkillCandidate {
    label: string;
    proficiency: (typeof PROFICIENCY_RANKS)[number];
    rank: ZeroToFour;
    slug: string;
}
function isStatistic(statistic?: object): statistic is Statistic {
    return statistic instanceof Statistic;
}
function toSkillCandidate(statistic: Statistic): SkillCandidate {
    const rank = statistic.rank ?? 0;
    return {
        label: statistic.label,
        proficiency: PROFICIENCY_RANKS[rank],
        rank,
        slug: statistic.slug,
    };
}

interface TreatWoundsToggle {
    disabled: boolean;
    domain: string;
    label: string;
    rollOption: string;
    value: boolean;
    visible: boolean;
}
function isToggleVisible(domain: string, skill: string) {
    return ["all", "skill-check"].includes(domain) || domain === skill;
}

class TreatWoundsDialog extends Application<TreatWoundsDialogOptions> {
    #resolve: (context: TreatWoundsContext | undefined) => void;
    #actor: CreaturePF2e;
    #difficultyClass?: number;
    readonly #locked: {
        difficultyClass?: number;
        skill?: string;
        tier?: TreatWoundsTier;
    };

    readonly #rollOptions: string[];
    #skill: string;
    readonly #strict: boolean;
    #tier?: TreatWoundsTier;
    #toggles: TreatWoundsToggle[];
    #context?: TreatWoundsContext;

    private constructor(
        actor: CreaturePF2e,
        options: Partial<TreatWoundsDialogOptions> = {},
        resolve: (context: TreatWoundsContext | undefined) => void
    ) {
        super(options);
        this.#resolve = resolve;
        this.#actor = actor;
        this.#difficultyClass = options.difficultyClass;
        this.#locked = {
            difficultyClass: options.difficultyClass,
            skill: options.skill,
            tier: options.tier,
        };
        this.#rollOptions = options.rollOptions ?? [];
        this.#skill = options.skill ?? "medicine";
        this.#strict = options.strict ?? true;
        this.#tier = options.tier;
        this.#toggles = this.#actor.synthetics.toggles
            .filter((toggle) => toggle.placement === "treat-wounds-dialog")
            .map((toggle) => {
                return {
                    domain: toggle.domain,
                    label: toggle.label,
                    disabled: this.#rollOptions.includes(toggle.option), // lock toggles for roll options set explicitly
                    rollOption: toggle.option,
                    value: this.#rollOptions.includes(toggle.option), // enable toggle for roll options set explicitly
                    visible: isToggleVisible(toggle.domain, this.#skill),
                };
            });
    }

    static override get defaultOptions(): ApplicationOptions {
        return {
            ...super.defaultOptions,
            resizable: true,
            template: "systems/pf2e/templates/system/actions/treat-wounds/dialog.hbs",
            title: "PF2E.Actions.TreatWounds.Dialog.Title",
            width: 270,
        };
    }

    static getContext(
        actor: CreaturePF2e,
        options: Partial<TreatWoundsDialogOptions> = {}
    ): Promise<TreatWoundsContext | undefined> {
        return new Promise((resolve) => {
            new this(actor, options, resolve).render(true);
        });
    }

    override async getData(options: Partial<ApplicationOptions>): Promise<TreatWoundsDialogData> {
        const medicine = toSkillCandidate(this.#actor.skills.medicine);
        // consider replacing this with something from the actor synthetics originating from a skill replacement rule element
        const replacements = (() => {
            const replacements = this.#actor.flags.pf2e.replacements as { treatWounds?: string[] };
            return (replacements?.treatWounds ?? [])
                .filter((slug) => slug !== "medicine")
                .map((replacement) => this.#actor.skills[replacement])
                .filter(isStatistic)
                .sort((a, b) => game.i18n.localize(a.label).localeCompare(game.i18n.localize(b.label)))
                .map(toSkillCandidate);
        })();
        const skills = [medicine, ...replacements];

        // include a skill specified in the action function options, if it is not already a candidate
        if (this.#skill && !skills.find((candidate) => candidate.slug === this.#skill)) {
            const candidate = [this.#skill]
                .map((slug) => this.#actor.skills[slug])
                .filter(isStatistic)
                .map(toSkillCandidate)
                .find((candidate) => !!candidate);
            if (candidate) {
                skills.unshift(candidate);
            }
        }

        const rank = this.#actor.skills[this.#skill]?.rank ?? 0;
        const skill = (() => {
            const invalid = rank < 1;
            return {
                hint: invalid ? "PF2E.Actions.TreatWounds.Warning.MinimumProficiency" : undefined,
                invalid,
                value: this.#skill,
            };
        })();

        const difficultyClass = (() => {
            const minimum = TREAT_WOUNDS_TIERS[this.#tier ?? "trained"]?.difficultyClass;
            const value =
                this.#locked.difficultyClass ??
                this.#difficultyClass ??
                TREAT_WOUNDS_TIERS[this.#tier ?? "trained"]?.difficultyClass;
            const invalid = value < minimum;
            return {
                hint: invalid ? "PF2E.Actions.TreatWounds.Warning.MinimumDifficultyClass" : undefined,
                locked: typeof this.#locked.difficultyClass === "number",
                invalid,
                value,
            };
        })();

        const tier = (() => {
            const tier = this.#tier ?? "trained";
            const invalid = PROFICIENCY_RANKS.indexOf(tier) > PROFICIENCY_RANKS.indexOf(PROFICIENCY_RANKS[rank || 1]);
            return {
                hint: invalid ? "PF2E.Actions.TreatWounds.Warning.MaximumTier" : undefined,
                invalid,
                value: tier,
            };
        })();

        return {
            ...(await super.getData(options)),
            app: this.id,
            difficultyClass,
            invalid: difficultyClass.invalid || skill.invalid || tier.invalid,
            rank,
            skill,
            skills,
            strict: this.#strict,
            tier,
            toggles: this.#toggles,
        };
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0]!;

        htmlQuery(html, "[data-event-handler=skill]")?.addEventListener("change", (event) => {
            if (event.target instanceof HTMLSelectElement) {
                this.#skill = event.target.value;
                if (this.#strict) {
                    const skill = this.#actor.skills[this.#skill];

                    // retain tier selection unless skill does not have sufficient ranks
                    const tier = this.#tier ?? "trained";
                    const rank = PROFICIENCY_RANKS[skill?.rank || 1];
                    this.#tier = PROFICIENCY_RANKS.indexOf(tier) < PROFICIENCY_RANKS.indexOf(rank) ? tier : rank;

                    if (typeof this.#locked.difficultyClass !== "number") {
                        this.#difficultyClass = TREAT_WOUNDS_TIERS[this.#tier].difficultyClass;
                    }
                }
                this.#toggles.forEach((toggle) => {
                    toggle.visible = isToggleVisible(toggle.domain, this.#skill);
                });
                this.render();
            }
        });

        htmlQuery(html, "[data-event-handler=tier]")?.addEventListener("change", (event) => {
            if (event.target instanceof HTMLSelectElement) {
                this.#tier = isTreatWoundsTier(event.target.value) ? event.target.value : "trained";
                if (typeof this.#locked.difficultyClass !== "number") {
                    this.#difficultyClass = TREAT_WOUNDS_TIERS[this.#tier].difficultyClass;
                }
                this.render();
            }
        });

        htmlQuery(html, "[data-event-handler=difficulty-class]")?.addEventListener("blur", (event) => {
            if (event.target instanceof HTMLInputElement) {
                this.#difficultyClass = Number(event.target.value);
                this.render();
            }
        });

        for (const toggle of htmlQueryAll<HTMLInputElement>(html, "[data-toggle-index]")) {
            toggle.addEventListener("click", () => {
                const index = Number(toggle.dataset.toggleIndex);
                this.#toggles[index].value = toggle.checked;
                this.render();
            });
        }

        htmlQuery(html, "[data-event-handler=treat-wounds]")?.addEventListener("click", () => {
            const rollOptions = this.#toggles
                .filter((toggle) => toggle.value && toggle.visible)
                .map((toggle) => toggle.rollOption)
                .concat(this.#rollOptions);
            const tier = game.i18n.localize(`PF2E.ProficiencyRank.${this.#tier ?? "trained"}`);
            this.#context = {
                difficultyClass: {
                    label: game.i18n.format("PF2E.Actions.TreatWounds.DifficultyClass", { tier }),
                    value: this.#difficultyClass ?? 15,
                    visible: true,
                },
                rollOptions,
                skill: this.#skill.trim(),
                tier: this.#tier ?? "trained",
            };
            this.close();
        });

        htmlQuery(html, "[data-event-handler=cancel]")?.addEventListener("click", () => {
            this.close();
        });
    }

    override close(options?: { force?: boolean }): Promise<void> {
        this.#resolve(this.#context);
        return super.close(options);
    }
}

export { type TreatWoundsContext, TreatWoundsDialog, type TreatWoundsDialogOptions };
