import ActorSheetPF2eCharacter from '../character.js';

/**
 * Extend the base ActorSheet
 * @extends {ActorSheetPF2eCharacter}
 */

export default class CRBStyleCharacterActorSheetPF2E extends ActorSheetPF2eCharacter {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['crb-style', 'sheet', 'actor', 'pc'],
      width: 700,
      height: 800,
      tabs: [{ navSelector: ".sheet-navigation", contentSelector: ".sheet-content", initial: "character" }]
    });
  }

  get template() {
    return 'systems/pf2e/templates/actors/crb-style/actor-sheet.html';
  }

  /**
   * Add some extra data when rendering the sheet to reduce the amount of logic required within the template.
   */
  getData() {
    const sheetData = super.getData();

    sheetData.uid = this.id;

    // preparing the name of the rank, as this is displayed on the sheet
    sheetData.data.attributes.perception.rankName = game.i18n.format("PF2E.ProficiencyLevel"+sheetData.data.attributes.perception.rank);
    for (const [s, save] of Object.entries(sheetData.data.saves)) {
      save.rankName = game.i18n.format("PF2E.ProficiencyLevel"+save.rank);
    }
    sheetData.data.attributes.classDC.rankName = game.i18n.format("PF2E.ProficiencyLevel"+sheetData.data.attributes.classDC.rank);
    
    // limiting the amount of characters for the save labels
    for (const [s, save] of Object.entries(sheetData.data.saves)) {
      save.short = game.i18n.format(`PF2E.Saves${save.label}Short`); 
    }

    // Return data to the sheet
    return sheetData;
  }

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html) {
    super.activateListeners(html);

    html.find('.crb-trait-selector').click((ev) => this._onCrbTraitSelector(ev));

    html.find('.strikes-list [data-action-index]').on('click', '.action-name', (event) => {
      $(event.currentTarget).parents('.expandable').toggleClass('expanded');
    });

    // the click listener registered on all buttons breaks the event delegation here...
    // html.find('.strikes-list [data-action-index]').on('click', '.damage-strike', (event) => {
    html.find('.strikes-list .damage-strike').click((event) => {
      event.preventDefault();
      event.stopPropagation();
      const actionIndex = $(event.currentTarget).parents('[data-action-index]').attr('data-action-index');
      this.actor.data.data.actions[Number(actionIndex)]?.damage(event);
    });

    // the click listener registered on all buttons breaks the event delegation here...
    // html.find('.strikes-list [data-action-index]').on('click', '.critical-strike', (event) => {
    html.find('.strikes-list .critical-strike').click((event) => {
      event.preventDefault();
      event.stopPropagation();
      const actionIndex = $(event.currentTarget).parents('[data-action-index]').attr('data-action-index');
      this.actor.data.data.actions[Number(actionIndex)]?.critical(event);
    });

    html.find('.add-modifier').on('click', '.fas.fa-plus-circle', (event) => this.onIncrementModifierValue(event));
    html.find('.add-modifier').on('click', '.fas.fa-minus-circle', (event) => this.onDecrementModifierValue(event));
    html.find('.add-modifier').on('click', '.add-modifier-submit', (event) => this.onAddCustomModifier(event));
    html.find('.modifier-list').on('click', '.remove-modifier', (event) => this.onRemoveCustomModifier(event));

    html.find('.hover').tooltipster({
        animation: 'fade',
        delay: 200,
        trigger: 'click',
        arrow: false,
        contentAsHTML: true,
        debug: true,
        interactive: true,
        side: ['right', 'bottom'],
        theme: 'crb-hover',
        minWidth: 120,
    });
  }

  onIncrementModifierValue(event) {
    const parent = $(event.currentTarget).parents('.add-modifier');
    parent.find('.add-modifier-value input[type=number]')[0].stepUp();
  }

  onDecrementModifierValue(event) {
    const parent = $(event.currentTarget).parents('.add-modifier');
    parent.find('.add-modifier-value input[type=number]')[0].stepDown();
  }

  onAddCustomModifier(event) {
    const parent = $(event.currentTarget).parents('.add-modifier');
    const stat = $(event.currentTarget).attr('data-stat');
    const modifier = Number(parent.find('.add-modifier-value input[type=number]').val());
    const name = parent.find('.add-modifier-name').val();
    const type = parent.find('.add-modifier-type').val();
    const errors = [];
    if (!stat || !stat.trim()) {
      errors.push('Statistic is required.');
    }
    if (!modifier || Number.isNaN(modifier)) {
        errors.push('Modifier value must be a number.');
    }
    if (!name || !name.trim()) {
        errors.push('Name is required.');
    }
    if (!type || !type.trim().length) {
        errors.push('Type is required.');
    }
    if (!type && type === 'untyped' && modifier < 0) {
        errors.push('Only untyped penalties are allowed.');
    }
    if (errors.length > 0) {
        ui.notifications.error(errors.join(' '));
    } else {
        this.actor.addCustomModifier(stat, name, modifier, type);
    }
  }

  onRemoveCustomModifier(event) {
    const stat = $(event.currentTarget).attr('data-stat');
    const name = $(event.currentTarget).attr('data-name');
    const errors = [];
    if (!stat || !stat.trim()) {
      errors.push('Statistic is required.');
    }
    if (!name || !name.trim()) {
      errors.push('Name is required.');
    }
    if (errors.length > 0) {
      ui.notifications.error(errors.join(' '));
    } else {
      this.actor.removeCustomModifier(stat, name);
    }
  }
}
