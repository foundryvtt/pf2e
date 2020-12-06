/* global FormApplication */

import PF2EActor from "../actor/actor";
import { RawCharacterData } from "../actor/actorDataDefinitions";

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
      this.build = this.data.build
    }
  }

  async _onDrop(event: DragEvent) {
    event.preventDefault();
    
    console.log(event.dataTransfer.getData('text/plain'));
    console.log(event);

    const dropTarget = $(event.target);
    const dragData = event.dataTransfer.getData('text/plain');
    const dragItem = JSON.parse(dragData);
    const containerId = dropTarget.data('containerId') ?? dropTarget.parents('[data-container-id]').data('containerId');

    if (dragItem.type !== 'Item') return;

    let item;
    if (dragItem.pack) {
        item = await game.packs.get(dragItem.pack).getEntity(dragItem.id);
    } else {
        item = game.items.get(dragItem.id);
    }

    console.log(containerId)
    console.log(item)
  }

  _canDragDrop(selector) {
    return this.actor.owner;
}

  static get defaultOptions() {
    const options = super.defaultOptions;
    options.id = 'character-builder';
    options.classes = [];
    options.title = 'Character Builder';
    options.template = 'systems/pf2e/templates/actors/character-builder.html';
    options.width = 500;
    options.height = 700;
    options.dragDrop = [{dropSelector: '.inventory-header'}]; // What css selector is droppable
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