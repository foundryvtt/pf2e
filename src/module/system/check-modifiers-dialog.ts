import { ModifierPF2e, MODIFIER_TYPE, StatisticModifier } from '../modifiers';
import { ActorPF2e } from '@actor/base';
import { RollNotePF2e } from '../notes';
import { getDegreeOfSuccess, DegreeOfSuccessText, PF2CheckDC } from './check-degree-of-success';
import { LocalizePF2e } from './localize';
import { RollDataPF2e } from './rolls';
import { DegreeAdjustment } from '@module/degree-of-success';
import { ItemPF2e } from '@item';

export interface CheckModifiersContext {
    /** Any options which should be used in the roll. */
    options?: string[];
    /** Any notes which should be shown for the roll. */
    notes?: RollNotePF2e[];
    /** If true, this is a secret roll which should only be seen by the GM. */
    secret?: boolean;
    /** The roll mode (i.e., 'roll', 'blindroll', etc) to use when rendering this roll. */
    rollMode?: string;
    /** Fortune effect which applies to the roll:
     * 'fortune' (2 dice, keep higher)
     * 'misfortune' (2 dice, keep lower)
     * 'assurance' (10 + proficiency)
     * 'override' (Replace dice roll with value specified in fateValue)
     */
    fate?: string;
    /** The value to use instead of a dice roll for fate 'override'*/
    fateOverride?: number;
    /** The actor which initiated this roll. */
    actor?: ActorPF2e;
    /** The originating item of this attack, if any */
    item?: Embedded<ItemPF2e> | null;
    /** Optional title of the roll options dialog; defaults to the check name */
    title?: string;
    /** The type of this roll, like 'perception-check' or 'saving-throw'. */
    type?: string;
    /** Any traits for the check. */
    traits?: string[];
    /** Optional DC data for the check */
    dc?: PF2CheckDC;
}

/**
 * Dialog for excluding certain modifiers before rolling a check.
 * @category Other
 */
export class CheckModifiersDialog extends Application {
    /** The check which is being edited. */
    check: StatisticModifier;
    /** Relevant context for this roll, like roll options. */
    context: CheckModifiersContext;
    /** Callback called when the roll occurs. */
    callback?: (roll: Rolled<Roll>) => void;

    constructor(check: StatisticModifier, context?: CheckModifiersContext, callback?: (roll: Rolled<Roll>) => void) {
        super({
            title: context?.title || check.name,
            template: 'systems/pf2e/templates/chat/check-modifiers-dialog.html',
            classes: ['dice-checks', 'dialog'],
            popOut: true,
            width: 380,
        });

        this.check = check;
        this.context = context ?? {}; // might include a reference to actor, so do not do mergeObject or similar
        this.callback = callback;
        if (this.context.secret) {
            this.context.rollMode = 'blindroll';
        } else {
            this.context.rollMode = game.settings.get('core', 'rollMode') ?? 'roll';
        }

        CheckModifiersDialog.checkAssurance(check, this.context);
    }

    /** Roll the given check, rendering the roll to the chat menu. */
    static async roll(
        check: StatisticModifier,
        context: CheckModifiersContext = {},
        callback?: (roll: Rolled<Roll>) => void,
    ) {
        const options: string[] = [];
        const ctx = context as any;

        let dice = '1d20';
        if (ctx.fate === 'misfortune') {
            dice = '2d20kl';
            options.push('PF2E.TraitMisfortune');
        } else if (ctx.fate === 'fortune') {
            dice = '2d20kh';
            options.push('PF2E.TraitFortune');
        } else if (ctx.fate === 'assurance' || ctx.fate === 'override') {
            dice = ctx.fateOverride ?? 10;
            options.push('PF2E.TraitFortune');
        }

        const speaker: { actor?: ActorPF2e } = {};
        if (ctx.actor) {
            speaker.actor = ctx.actor;
            ctx.actor = ctx.actor.id;
        }
        if (ctx.token) {
            ctx.token = ctx.token.id;
        }
        if (ctx.user) {
            ctx.user = ctx.user.id;
        }
        const item = context.item;
        delete context.item;

        ctx.rollMode =
            ctx.rollMode ?? (ctx.secret ? 'blindroll' : undefined) ?? game.settings.get('core', 'rollMode') ?? 'roll';

        this.checkAssurance(check, context);

        let modifierBreakdown = '';
        const optionTemplate = (input: string) => `<span class="tag tag_alt">${input}</span>`;

        if (ctx.fate === 'assurance') {
            modifierBreakdown += optionTemplate(`${game.i18n.localize('PF2E.Roll.Assurance')} ${dice}`);
        } else if (ctx.fate === 'override') {
            modifierBreakdown += optionTemplate(`${game.i18n.localize('PF2E.Roll.Override')} ${dice}`);
        }

        modifierBreakdown += check.modifiers
            .filter((m) => m.enabled)
            .map((m) => {
                const label = game.i18n.localize(m.label ?? m.name);
                return optionTemplate(`${label} ${m.modifier < 0 ? '' : '+'}${m.modifier}`);
            })
            .join('');

        const optionStyle =
            'white-space: nowrap; margin: 0 2px 2px 0; padding: 0 3px; font-size: 10px; line-height: 16px; border: 1px solid #000000; border-radius: 3px; color: white; background: var(--secondary);';
        const optionBreakdown = options
            .map((o) => `<span style="${optionStyle}">${game.i18n.localize(o)}</span>`)
            .join('');

        const totalModifierPart = check.totalModifier === 0 ? '' : `+${check.totalModifier}`;
        const roll = new Roll(`${dice}${totalModifierPart}`, check as RollDataPF2e).evaluate({ async: false });

        let flavor = `<strong>${check.name}</strong>`;
        if (ctx.type === 'spell-attack-roll' && game.modules.get('pf2qr')?.active) {
            // Until the PF2eQR module uses the roll type instead of feeling around for "Attack Roll"
            flavor = flavor.replace(/^<strong>/, '<strong data-pf2qr-hint="Attack Roll">');
        }

        // Add the degree of success if a DC was supplied
        if (ctx.dc) {
            const degreeOfSuccess = getDegreeOfSuccess(roll, ctx.dc);
            const degreeOfSuccessText = DegreeOfSuccessText[degreeOfSuccess.value];
            ctx.outcome = degreeOfSuccessText;
            ctx.unadjustedOutcome = '';

            // Add degree of success to roll for the callback function
            roll.data.degreeOfSuccess = degreeOfSuccess.value;

            const needsDCParam =
                typeof ctx.dc.label === 'string' && Number.isInteger(ctx.dc.value) && !ctx.dc.label.includes('{dc}');
            if (needsDCParam) ctx.dc.label = `${ctx.dc.label.trim()}: {dc}`;

            const dcLabel = game.i18n.format(ctx.dc.label ?? 'PF2E.DCLabel', { dc: ctx.dc.value });
            const showDC = game.settings.get('pf2e', 'metagame.showDC').toString();
            flavor += `<div data-visibility="${ctx.dc.visibility ?? showDC}"><b>${dcLabel}</b></div>`;

            let adjustmentLabel = '';
            if (degreeOfSuccess.degreeAdjustment !== undefined) {
                switch (degreeOfSuccess.degreeAdjustment) {
                    case DegreeAdjustment.INCREASE_BY_TWO:
                        adjustmentLabel = game.i18n.localize('PF2E.TwoDegreesBetter');
                        break;
                    case DegreeAdjustment.INCREASE:
                        adjustmentLabel = game.i18n.localize('PF2E.OneDegreeBetter');
                        break;
                    case DegreeAdjustment.LOWER:
                        adjustmentLabel = game.i18n.localize('PF2E.OneDegreeWorse');
                        break;
                    case DegreeAdjustment.LOWER_BY_TWO:
                        adjustmentLabel = game.i18n.localize('PF2E.TwoDegreesWorse');
                }
                adjustmentLabel = ` (${adjustmentLabel})`;

                ctx.unadjustedOutcome = DegreeOfSuccessText[degreeOfSuccess.unadjusted];
            }

            const resultLabel = game.i18n.localize('PF2E.ResultLabel');
            const degreeLabel = game.i18n.localize(`PF2E.${ctx.dc.scope ?? 'CheckOutcome'}.${degreeOfSuccessText}`);
            const showResults = game.settings.get('pf2e', 'metagame.showResults').toString();
            flavor += `<div data-visibility="${
                ctx.dc.visibility ?? showResults
            }" class="degree-of-success"><b>${resultLabel}:<span class="${degreeOfSuccessText}"> ${degreeLabel}</span></b>${adjustmentLabel}`;
            flavor += '</div>';
        }

        const notes = ((ctx.notes as RollNotePF2e[]) ?? [])
            .filter(
                (note) =>
                    ctx.dc === undefined ||
                    note.outcome.length === 0 ||
                    note.outcome.includes(ctx.outcome) ||
                    note.outcome.includes(ctx.unadjustedOutcome),
            )
            .map((note: { text: string }) => TextEditor.enrichHTML(note.text))
            .join('<br />');

        if (ctx.traits) {
            const traits = ctx.traits.map((trait: string) => `<span class="tag">${trait}</span>`).join('');
            flavor += `<div class="tags">${traits}</div><hr>`;
        }
        flavor += `<div class="tags">${modifierBreakdown}${optionBreakdown}</div>${notes}`;
        const origin = item ? { uuid: item.uuid, type: item.type } : null;
        await roll.toMessage(
            {
                speaker: ChatMessage.getSpeaker(speaker),
                flavor,
                flags: {
                    core: {
                        canPopout: true,
                    },
                    pf2e: {
                        isCheck: true,
                        canReroll: !['fortune', 'misfortune', 'assurance', 'override'].includes(ctx.fate),
                        context,
                        unsafe: flavor,
                        totalModifier: check.totalModifier,
                        origin,
                    },
                },
            },
            {
                rollMode: ctx.rollMode ?? 'roll',
            },
        );

        if (callback) {
            callback(roll);
        }
    }

    override getData() {
        const fortune = this?.context?.fate === 'fortune';
        const misfortune = this?.context?.fate === 'misfortune';
        const assurance = this?.context?.fate === 'assurance';
        const override = this?.context?.fate === 'override';
        const none = !fortune && !misfortune && !assurance && !override;

        const fateOverride: number = +(this?.context?.fateOverride ?? 10);

        return {
            appId: this.id,
            check: this.check,
            rollModes: CONFIG.Dice.rollModes,
            rollMode: this.context.rollMode,
            rollNumber: (assurance ? 10 : 0) + this.check.totalModifier,
            rollSign: !assurance,
            showRollDialogs: game.user.getFlag('pf2e', 'settings.showRollDialogs'),
            fate: {
                fortune: fortune,
                misfortune: misfortune,
                assurance: assurance,
                override: override,
                overrideValue: fateOverride,
                none: none,
            },
            assuranceAllowed: this?.context?.type === 'skill-check',
        };
    }

    /**
     * If the fate condition is "assurance" then auto-disable all non-proficiency bonuses. Using the "autoIgnored"
     * rather "ignored" means that, if the fate is changed from "assurance", the previously-enabled modifiers will
     * be automatically re-enabled.
     */
    static checkAssurance(check: StatisticModifier, context: CheckModifiersContext) {
        const isAssurance = context.fate === 'assurance';
        check.modifiers
            .filter((m) => m.type !== MODIFIER_TYPE.PROFICIENCY)
            .forEach((m) => (m.autoIgnored = isAssurance));
        check.applyStackingRules();
    }

    override activateListeners(html: JQuery) {
        html.find('.roll').on('click', (_event) => {
            CheckModifiersDialog.roll(this.check, this.context, this.callback);
            this.close();
        });

        html.find('.modifier-container').on('click', 'input[type=checkbox]', (event) => {
            const index = Number(event.currentTarget.getAttribute('data-modifier-index'));
            this.check.modifiers[index].ignored = event.currentTarget.checked;
            this.check.applyStackingRules();
            this.render();
        });

        html.find('.add-modifier-panel').on('click', '.add-modifier', (event) => this.onAddModifier(event));
        html.find('[name=rollmode]').on('change', (event) => this.onChangeRollMode(event));

        html.find('.fate')
            .on('click', 'input[type=radio]', (event) => this.onChangeFate(event))
            .on('input', 'input[type=number]', (event) => this.onChangeFateOverride(event));

        // Dialog settings menu
        const $settings = html.closest(`#${this.id}`).find('a.header-button.settings');
        const $tooltip = $settings.attr({ 'data-tooltip-content': `#${this.id}-settings` }).tooltipster({
            animation: 'fade',
            trigger: 'click',
            arrow: false,
            contentAsHTML: true,
            debug: BUILD_MODE === 'development',
            interactive: true,
            side: ['top'],
            theme: 'crb-hover',
            minWidth: 165,
        });
        html.find<HTMLInputElement>('.settings-list input.quick-rolls-submit').on('change', async (event) => {
            const $checkbox = $(event.delegateTarget);
            await game.user.setFlag('pf2e', 'settings.showRollDialogs', $checkbox[0].checked);
            $tooltip.tooltipster('close');
        });
    }

    onAddModifier(event: JQuery.ClickEvent) {
        const parent = $(event.currentTarget).parents('.add-modifier-panel');
        const value = Number(parent.find('.add-modifier-value').val());
        const type = `${parent.find('.add-modifier-type').val()}`;
        let name = `${parent.find('.add-modifier-name').val()}`;
        const errors: string[] = [];
        if (Number.isNaN(value)) {
            errors.push('Modifier value must be a number.');
        } else if (value === 0) {
            errors.push('Modifier value must not be zero.');
        }
        if (!type || !type.trim().length) {
            errors.push('Modifier type is required.');
        }
        if (!name || !name.trim()) {
            name = game.i18n.localize(value < 0 ? `PF2E.PenaltyLabel.${type}` : `PF2E.BonusLabel.${type}`);
        }
        if (errors.length > 0) {
            ui.notifications.error(errors.join(' '));
        } else {
            this.check.push(new ModifierPF2e(name, value, type));
            this.render();
        }
    }

    onChangeRollMode(event: JQuery.ChangeEvent) {
        this.context.rollMode = ($(event.currentTarget).val() ?? 'roll') as string;
    }

    onChangeFate(event: JQuery.ClickEvent) {
        this.context.fate = event.currentTarget.getAttribute('value');
        if (
            this.context.fate === 'assurance' ||
            (this.context.fate === 'override' && this.context.fateOverride === undefined)
        ) {
            this.context.fateOverride = 10;
        }

        CheckModifiersDialog.checkAssurance(this.check, this.context);
        this.render();
    }

    onChangeFateOverride(event: JQuery.TriggeredEvent) {
        let fateOverride = event.currentTarget.value;
        let refresh = false;

        if (fateOverride % 1 !== 0) {
            fateOverride = Math.floor(fateOverride);
            refresh = true;
        }

        if (fateOverride < 1 || fateOverride > 20) {
            fateOverride = Math.clamped(fateOverride, 1, 20);
            refresh = true;
        }

        this.context.fateOverride = fateOverride;
        if (refresh) {
            this.render();
        }
    }

    protected override _getHeaderButtons(): ApplicationHeaderButton[] {
        const buttons = super._getHeaderButtons();
        const label = LocalizePF2e.translations.PF2E.SETTINGS.Settings;
        const settingsButton: ApplicationHeaderButton = {
            label,
            class: `settings`,
            icon: 'fas fa-cog',
            onclick: () => null,
        };
        return [settingsButton, ...buttons];
    }
}
