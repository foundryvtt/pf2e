/* global CombatTracker */

import { PF2ECombat } from '../combat/combat';

export class PF2eCombatTracker extends CombatTracker {
    combat!: PF2ECombat | null;

    private $combatantNodes?: JQuery<HTMLElement>;
    private $dragNode?: JQuery<HTMLElement>;
    private $aboveDrop?: JQuery<HTMLElement>;
    private $belowDrop?: JQuery<HTMLElement>;
    private $firstNode?: JQuery<HTMLElement>;
    private $lastNode?: JQuery<HTMLElement>;

    /** @override */
    activateListeners($element: JQuery<HTMLElement>): void {
        super.activateListeners($element);
        $element.find('.combat-control').on('click', (event) => this._onCombatControl(event));
    }

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            baseApplication: 'CombatTracker',
            template: 'systems/pf2e/templates/system/combat-tracker.html',
            dragDrop: [
                {
                    dragSelector: 'li.combatant',
                    dropSelector: '#combat-tracker',
                },
            ],
        });
    }

    /** @override
     *  @description Disable drag highlighting upon dragging outside ol#combat-tracker
     */
    _onDragStart(event: ElementDragEvent): void {
        this.$dragNode = $(event.currentTarget).closest('li.combatant').attr({ id: 'dragged-from' });
        this.$combatantNodes = this.$dragNode.parents('#combat-tracker').children('li.combatant');
        this.$firstNode = this.$combatantNodes.first();
        this.$lastNode = this.$combatantNodes.last();

        // Single-fire callback to show a placeholder where the combatant node was dragged from
        $('html').one('drag', (_event) => {
            this.$combatantNodes.closest('#dragged-from').removeAttr('id').removeClass('hover').addClass('drag-from');
        });

        // Highlighting for when hovering above or below the combatant-node list
        const $header = $('header#combat-round');
        $header.on('dragenter.pf2e', (_event): void => {
            this.$aboveDrop = undefined;
            this.$belowDrop = this.$firstNode;
            if (this.$dragNode.is(this.$firstNode)) {
                this.highlight(this.$firstNode);
            } else {
                this.highlight($header, this.$firstNode);
            }
        });
        $header.on('dragleave.pf2e', (_event): void => {
            $header.removeClass('above-drop');
        });

        $header.one('drop.pf2e', (event: JQuery.DropEvent) => {
            this._onDrop(event.originalEvent);
        });

        const $footer = $('<li id="combatant-footer"></foot>');
        $footer.appendTo('#combat-tracker');
        $footer.on('dragenter.pf2e', (_event) => {
            this.$aboveDrop = this.$lastNode;
            this.$belowDrop = undefined;
            if (this.$dragNode.is(this.$lastNode)) {
                this.highlight(this.$lastNode);
            } else {
                this.highlight(this.$lastNode, $footer);
            }
        });
        $footer.on('dragleave.pf2e', (_event): void => {
            $footer.removeClass('below-drop');
        });

        // Turn off drag highlighting when dragging outside the combat tracker
        $('canvas#board').on('dragenter.pf2e', (_event): void => {
            this.resetHighlights();
        });

        // Catch drops, including outside the Foundry/browser window
        $(window).one('dragend.pf2e', (_event) => {
            this.doneHighlighting();
        });
    }

    /** @override
     *  @description Highlight the tracker position at which the combatant node will be placed if dropped
     */
    _onDragOver(event: ElementDragEvent): void {
        const $nodeOver: JQuery<HTMLElement> = $(event.target).closest('li.combatant');
        if ($nodeOver.length === 0) {
            return;
        }

        // Self-highlight when hovering over the original node
        if (this.$dragNode.is($nodeOver)) {
            this.highlight($nodeOver);
            return;
        }

        // Otherwise, highlight between the two nodes where the dragged node will move to if dropped
        const cursorOverUpperHalf = event.pageY - $nodeOver.offset().top < $nodeOver.height() / 2;
        [this.$aboveDrop, this.$belowDrop] = cursorOverUpperHalf
            ? [$nodeOver.prev().add('#combat-round').last(), $nodeOver]
            : [$nodeOver, $nodeOver.next().add('#combatant-footer').first()];

        if (this.$aboveDrop.is(this.$dragNode)) {
            this.highlight(this.$aboveDrop);
        } else if (this.$belowDrop.is(this.$dragNode)) {
            this.highlight(this.$belowDrop);
        } else {
            this.highlight(this.$aboveDrop, this.$belowDrop);
        }
    }

    /** @override
     *  @description Drop the combatant node in its new tracker position
     */
    _onDrop(_event: DragEvent): Promise<void> {
        if (this.$dragNode.hasClass('self-drop')) {
            this.resetHighlights();
            return;
        }

        const combatants = this.combat.turns;
        const dropCombatant = combatants.find((combatant) => combatant._id === this.$dragNode.data('combatant-id'));
        const combatantAbove = combatants.find(
            (combatant) => combatant._id === (this.$aboveDrop && this.$aboveDrop.data('combatant-id')),
        );
        const combatantBelow = combatants.find(
            (combatant) => combatant._id === (this.$belowDrop && this.$belowDrop.data('combatant-id')),
        );

        // Insert drop combatant into new array position
        const fromIndex = combatants.indexOf(dropCombatant);
        const toIndex =
            combatantAbove === undefined
                ? 0
                : combatantBelow === undefined
                ? combatants.length - 1
                : combatants.indexOf(combatantBelow) - combatants.indexOf(combatantAbove);

        combatants.splice(fromIndex, 1);
        combatants.splice(toIndex, 0, dropCombatant);

        const updates = combatants.map((combatant) => ({
            _id: combatant._id,
            'flags.pf2e.trackerPosition': combatants.length - combatants.indexOf(combatant),
        }));
        this.combat.updateCombatant(updates);
    }

    /** @description Remove all drag highlights */
    private resetHighlights({ except: $thisOne }: { except: JQuery<HTMLElement> } = { except: null }): void {
        this.$aboveDrop = undefined;
        this.$belowDrop = undefined;
        this.$combatantNodes.not($thisOne).removeClass(['self-drop', 'above-drop', 'below-drop']);
        $('header#combat-round').removeClass('above-drop');
        $('li#combatant-footer').removeClass('below-drop');
    }

    /** @description Remove highlights and clear remaining properties */
    private doneHighlighting(): void {
        this.resetHighlights();
        this.$combatantNodes.removeClass(['drag-from', 'hover']);

        $(window).off('dragend.pf2e');
        $('canvas#board').off('dragenter.pf2e');
        $('header#combat-round').off('dragenter.pf2e').off('dragleave.pf2e').removeClass('above-drop');
        $('li#combatant-footer').remove();

        this.$combatantNodes = undefined;
        this.$dragNode = undefined;
    }

    /** @description Highlight a single combat-tracker node or between two nodes */
    private highlight($above: JQuery<HTMLElement>, $below?: JQuery<HTMLElement>): void {
        if ($below === undefined) {
            this.resetHighlights({ except: $above });
            this.$combatantNodes.not($above).removeClass(['self-drop', 'above-drop', 'below-drop']);
            $above.addClass('self-drop');
        } else {
            this.$combatantNodes.not($above.add($below)).removeClass(['self-drop', 'above-drop', 'below-drop']);
            $above.removeClass('below-drop').addClass('above-drop');
            $below.removeClass('above-drop').addClass('below-drop');
            const $footer = $('#combatant-footer');
            if (!$below.is($footer)) {
                $footer.removeClass('below-drop');
            }
        }
    }
}
