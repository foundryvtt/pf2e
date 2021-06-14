import { ModifierPF2e, StatisticModifier } from '../modifiers';
import { ActorPF2e } from '@actor/base';
import { RollNotePF2e } from '../notes';
import { getDegreeOfSuccess, DegreeOfSuccessText, PF2CheckDC } from './check-degree-of-success';
import { LocalizePF2e } from './localize';
import { RollDataPF2e } from './rolls';

export interface CheckModifiersContext {
    /** Any options which should be used in the roll. */
    options?: string[];
    /** Any notes which should be shown for the roll. */
    notes?: RollNotePF2e[];
    /** If true, this is a secret roll which should only be seen by the GM. */
    secret?: boolean;
    /** The roll mode (i.e., 'roll', 'blindroll', etc) to use when rendering this roll. */
    rollMode?: string;
    /** Should this roll be rolled with 'fortune' (2 dice, keep higher) or 'misfortune' (2 dice, keep lower)? */
    fate?: string;
    /** The actor which initiated this roll. */
    actor?: ActorPF2e;
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
    }

    /** Roll the given check, rendering the roll to the chat menu. */
    static async roll(
        check: StatisticModifier,
        context?: CheckModifiersContext,
        callback?: (roll: Rolled<Roll>) => void,
    ) {
        const options: string[] = [];
        const ctx = (context as any) ?? {};
        let dice = '1d20';
        if (ctx.fate === 'misfortune') {
            dice = '2d20kl';
            options.push('PF2E.TraitMisfortune');
        } else if (ctx.fate === 'fortune') {
            dice = '2d20kh';
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
        if (ctx.item) {
            ctx.item = ctx.item.id;
        }

        ctx.rollMode =
            ctx.rollMode ?? (ctx.secret ? 'blindroll' : undefined) ?? game.settings.get('core', 'rollMode') ?? 'roll';

        const modifierBreakdown = check.modifiers
            .filter((m) => m.enabled)
            .map((m) => {
                const label = game.i18n.localize(m.label ?? m.name);
                return `<span class="tag tag_alt">${label} ${m.modifier < 0 ? '' : '+'}${m.modifier}</span>`;
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
        if (ctx.dc !== undefined) {
            const showDC = game.settings.get('pf2e', 'metagame.showDC').toString();
            flavor += `<div data-visibility="${ctx.dc.visibility ?? showDC}">`;
            const degreeOfSuccess = getDegreeOfSuccess(roll, ctx.dc);
            const degreeOfSuccessText = DegreeOfSuccessText[degreeOfSuccess.value];
            ctx.outcome = degreeOfSuccessText;
            ctx.unadjustedOutcome = '';

            // Add degree of success to roll for the callback function
            roll.data.degreeOfSuccess = degreeOfSuccess.value;

            const dcLabel = game.i18n.format(ctx.dc.label ?? 'PF2E.DCLabel', { dc: ctx.dc.value });
            flavor += `<div><b>${dcLabel}</b></div>`;

            let adjustmentLabel = '';
            if (degreeOfSuccess.degreeAdjustment !== undefined) {
                adjustmentLabel = degreeOfSuccess.degreeAdjustment
                    ? game.i18n.localize('PF2E.OneDegreeBetter')
                    : game.i18n.localize('PF2E.OneDegreeWorse');
                adjustmentLabel = ` (${adjustmentLabel})`;

                ctx.unadjustedOutcome = DegreeOfSuccessText[degreeOfSuccess.unadjusted];
            }

            const resultLabel = game.i18n.localize('PF2E.ResultLabel');
            const degreeLabel = game.i18n.localize(`PF2E.${ctx.dc.scope ?? 'CheckOutcome'}.${degreeOfSuccessText}`);
            flavor += `<div class="degree-of-success"><b>${resultLabel}:<span class="${degreeOfSuccessText}"> ${degreeLabel}</span></b>${adjustmentLabel}</div>`;
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

        await roll.toMessage(
            {
                speaker: ChatMessage.getSpeaker(speaker),
                flavor,
                flags: {
                    core: {
                        canPopout: true,
                    },
                    pf2e: {
                        canReroll: !['fortune', 'misfortune'].includes(ctx.fate),
                        context: ctx,
                        unsafe: flavor,
                        totalModifier: check.totalModifier,
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
        const none = fortune === misfortune;
        return {
            appId: this.id,
            check: this.check,
            rollModes: CONFIG.Dice.rollModes,
            rollMode: this.context.rollMode,
            showRollDialogs: game.user.getFlag('pf2e', 'settings.showRollDialogs'),
            fortune,
            none,
            misfortune,
        };
    }

    override activateListeners(html: JQuery) {
        html.find('.roll').on('click', (_event) => {
            this.context.fate = html.find('input[type=radio][name=fate]:checked').val() as string;
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
