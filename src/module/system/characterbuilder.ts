/* global FormApplication */

import { BuildChoices } from "../../../types/foundry-pc-types/types/characterbuild";
import PF2EActor from "../actor/actor";

/**
 * Character build page
 * @type {FormApplication}
 * @category Other
 */
export class CharacterBuilder extends FormApplication {
  buildChoices: BuildChoices = {
    ancestry: { label: "Ancestry", choices: [] },
    background: { label: "Background", choices: [] },
    class: { label: "Class", choices: [] },
  };
  categories: string[];
  actor: PF2EActor;
  constructor(actor: PF2EActor, options: FormApplicationOptions) {
    super(actor, options);
    this.actor = actor;
  }

    static get defaultOptions() {
      const options = super.defaultOptions;
      options.id = 'character-builder';
      options.classes = [];
      options.title = 'Character Builder';
      options.template = 'systems/pf2e/templates/actors/character-builder.html';
      options.width = 500;
      options.height = 700;
      return options;
  }

  getData() {
     // Return data
	  return {
	    buildChoices: this.buildChoices // [{ label: "test 1"}, { label: "test 2"}]
    };
  }

  activateListeners(html) {
    html.find('.build-choice-create').click((ev) => this._onBuildChoiceCreate(ev));

  }

  _onBuildChoiceCreate(event) {
    event.preventDefault();
    var newChoice = { name: 'New Build Choice', type: 'buildChoice', img: '/icons/svg/d20-black.svg' }
    this.actor.createEmbeddedEntity('OwnedItem', newChoice)
  }
}
