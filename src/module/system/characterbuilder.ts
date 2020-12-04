/* global FormApplication */

import PF2EActor from "../actor/actor";
import { RawCharacterData } from "../actor/actorDataDefinitions";
import { ItemData } from "../item/dataDefinitions";

/**
 * Character build page
 * @type {FormApplication}
 * @category Other
 */
export class CharacterBuilder extends FormApplication {
  build: Build;
  categories: BuildCategories;
  actor: PF2EActor;
  data: RawCharacterData;
  constructor(actor: PF2EActor, options: FormApplicationOptions) {
    super(actor, options);
    this.actor = actor;
    if (actor.data.type === "character") { 
      const {data} = actor.data
      this.data = data
      if (this.data.build) {
        this.build = this.data.build
      } else {
        this.build = {
          choices: {
            ancestry: { label: "Ancestry", choices: [] },
            background: { label: "Background", choices: [] },
            class: { label: "Class", choices: [] }
          },
          isValid: false
        }
      }
    }
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
     // Return data for View
	  return {
	    build: this.build
    };
  }
}


export interface Build {
  choices: BuildCategories,
  isValid: boolean
}

export interface BuildCategories {
  ancestry: BuildChoice;
  background: BuildChoice;
  class: BuildChoice;
}

export interface BuildChoice {
  label: string;
  choices: string[] // list of Item Ids
}