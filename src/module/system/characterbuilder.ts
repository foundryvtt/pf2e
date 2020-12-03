/* global FormApplication */

/**
 * Character build page
 * @type {FormApplication}
 * @category Other
 */
export class CharacterBuilder extends FormApplication {
    static get defaultOptions() {
      const options = super.defaultOptions;
      options.id = 'character-builder';
      options.classes = [];
      options.title = 'Build Character';
      options.template = 'systems/pf2e/templates/actors/character-builder.html';
      options.width = "auto";
      return options;
  }

  getData() {
     // Return data
	  return {
	    test: "THIS IS A TEST"
    };
  }
}
