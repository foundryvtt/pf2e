/**
 * @author Farhan Siddiqi
 * @version 0.0.1
 */

// import { monsterAbilities } from './monsterAbilities.js';

 class UpdatedNPCActorPF2ESheet extends ActorSheetPF2eNPC {

 	get template() {
 		const path = "systems/pf2e/templates/actors/";
 		
    if(this.actor.getFlag('pf2e','editNPC.value'))
      return path + "npc-sheet.html";
    else
      return path + 'npc-sheet-no-edit.html';

 	}  

 	static get defaultOptions() {
 		const options = super.defaultOptions;
 		mergeObject(options, {
      		classes: options.classes.concat(["pf2e", "actor", "npc-sheet", "updatedNPCSheet"]),
			width: 650,
    		height: 680,
      		showUnpreparedSpells: true
    	});
	  return options;
  	}

	/* -------------------------------------------- */

	/**
	* Add some extra data when rendering the sheet to reduce the amount of logic required within the template.
	*/
	getData() {
	    const sheetData = super.getData();
	    sheetData.flags = sheetData.actor.flags;
      if(sheetData.flags.pf2e_updatednpcsheet === undefined)
        sheetData.flags.pf2e_updatednpcsheet = {};
      if(sheetData.flags.pf2e_updatednpcsheet.editNPC === undefined)
        sheetData.flags.pf2e_updatednpcsheet.editNPC = {value: false};
      if(sheetData.flags.pf2e_updatednpcsheet.allSaveDetail === undefined)
        sheetData.flags.pf2e_updatednpcsheet.allSaveDetail = {value: ""};

      //size
      sheetData.actorSize = sheetData.actorSizes[sheetData.data.traits.size.value];
      sheetData.actorTraits = (sheetData.data.traits.traits || {}).value;
      sheetData.actorAlignment = sheetData.data.details.alignment.value;
      //languages
      sheetData.hasLanguages = false;
      if(sheetData.data.traits.languages.value && Array.isArray(sheetData.data.traits.languages.value) && sheetData.actor.data.traits.languages.value.length > 0){
        sheetData.hasLanguages = true;
      }

      //Skills
      sheetData.hasSkills = sheetData.actor.lores.length>0;

      //AC Details
      sheetData.hasACDetails = sheetData.data.attributes.ac.details && sheetData.data.attributes.ac.details !== "";
      //HP Details
      sheetData.hasHPDetails = sheetData.data.attributes.hp.details && sheetData.data.attributes.hp.details !== "";
      
      // ********** This section needs work *************
      //Fort Details
      sheetData.hasFortDetails = sheetData.data.saves.fortitude.saveDetail && sheetData.data.saves.fortitude.saveDetail !== "";
      //Reflex Details
      sheetData.hasRefDetails = sheetData.data.saves.reflex.saveDetail && sheetData.data.saves.reflex.saveDetail !== "";
      //Will Details
      sheetData.hasWillDetails = sheetData.data.saves.will.saveDetail && sheetData.data.saves.will.saveDetail !== "";
      //All Save Details
      sheetData.hasAllSaveDetails = (sheetData.data.attributes.allSaves || {}).value && (sheetData.data.attributes.allSaves || {}).value !== "";

      //Immunities check
      sheetData.hasImmunities = sheetData.data.traits.di.value.length ? sheetData.data.traits.di.value : false;
      //Resistances check
      sheetData.hasResistances = sheetData.data.traits.dr.value.length ? sheetData.data.traits.dr.value : false;
      //Weaknesses check
      sheetData.hasWeaknesses = sheetData.data.traits.dv.value.length ? sheetData.data.traits.dv.value : false;

      //Speed Details check
      if (sheetData.data.attributes.speed && sheetData.data.attributes.speed.otherSpeeds) sheetData.hasSpeedDetails = sheetData.data.attributes.speed.otherSpeeds.length ? sheetData.data.attributes.speed.otherSpeeds : false;      

      //Spellbook
      sheetData.hasSpells = sheetData.actor.spellcastingEntries.length ? sheetData.actor.spellcastingEntries : false;
      //sheetData.spellAttackBonus = sheetData.data.attributes.spelldc.value;

      const equipment = [];
      const reorgActions = {
        interaction: {
          label: "Interaction Actions",
          actions: {
            "action": { label: "Actions", actions: [] },
            "reaction": { label: "Reactions", actions: [] },
            "free": { label: "Free Actions", actions: [] },
            "passive": { label: "Passive Actions", actions: [] },
          }
        },
        defensive: {
          label: "Defensive Actions",
          actions: {
            "action": { label: "Actions", actions: [] },
            "reaction": { label: "Reactions", actions: [] },
            "free": { label: "Free Actions", actions: [] },
            "passive": { label: "Passive Actions", actions: [] },
          }
        },
        offensive: {
          label: "Offensive Actions",
          actions: {
            "action": { label: "Actions", actions: [] },
            "reaction": { label: "Reactions", actions: [] },
            "free": { label: "Free Actions", actions: [] },
            "passive": { label: "Passive Actions", actions: [] },
          }
        }
      };
      sheetData.hasInteractionActions = false;
      sheetData.hasDefensiveActions = false;
      sheetData.hasOffensiveActions = false;
      sheetData.hasEquipment = false;
      for ( let i of sheetData.actor.items ){

        //Equipment
        if(i.type === 'weapon' || i.type === 'armor' || i.type === 'equipment' || i.type === 'consumable'){
          equipment.push(i);
          sheetData.hasEquipment = true;
        }
        //Actions
        else if(i.type === 'action'){
          let actionType = i.data.actionType.value || "action";
          if(i.flags && i.flags.pf2e_updatednpcsheet && i.flags.pf2e_updatednpcsheet.npcActionType && i.flags.pf2e_updatednpcsheet.npcActionType.value){
            switch(i.flags.pf2e_updatednpcsheet.npcActionType.value){
              case 'interaction':
                reorgActions.interaction.actions[actionType].actions.push(i);
                sheetData.hasInteractionActions = true;
              break;
              case 'defensive':
                reorgActions.defensive.actions[actionType].actions.push(i);
                sheetData.hasDefensiveActions = true;
              break;
              //Should be offensive but throw anything else in there too
              default:
                reorgActions.offensive.actions[actionType].actions.push(i);
                sheetData.hasOffensiveActions = true;
            }
          }
          else{
            reorgActions.offensive.actions[actionType].actions.push(i);
            sheetData.hasOffensiveActions = true;
          }
        }
        //Give Melee/Ranged an img
        else if(i.type === 'melee' || i.type === 'ranged'){
          let actionImg = 1;
          i.img = this._getActionImg(actionImg);
        }
      }
      sheetData.actor.reorgActions = reorgActions;
      sheetData.actor.equipment = equipment;

	    // Return data for rendering
		return sheetData;
	}


  /**
   * Roll NPC Damage using DamageRoll
   * Rely upon the DicePF2e.damageRoll logic for the core implementation
   */
  rollNPCDamageRoll(damageRoll, item) {

    // Get data
    let itemData = item.data.data,
        rollData = duplicate(item.actor.data.data),
        weaponDamage = damageRoll.die,
        //abl = itemData.ability.value || "str",
        // abl = "str",
        parts = [weaponDamage],
        dtype = CONFIG.damageTypes[damageRoll.damageType];

    // Append damage type to title
    let title = `${item.name} - Damage`;
    if ( dtype ) title += ` (${dtype})`;

    // Call the roll helper utility
    rollData.item = itemData;
    DicePF2e.damageRoll({
      event: event,
      parts: parts,
      actor: item.actor,
      data: rollData,
      title: title,
      speaker: ChatMessage.getSpeaker({actor: item.actor}),
      dialogOptions: {
        width: 400,
        top: event.clientY - 80,
        left: window.innerWidth - 710
      }
    });
  }

  /**
   * Toggle expansion of an attackEffect ability if it exists.
   *
   */
   expandAttackEffect(attackEffectName, event, triggerItem){
    let actionList = $(event.currentTarget).parents('form').find('.item.action-item');
    let toggledAnything = false;
    let mAbilities = CONFIG.monsterAbilities()
    console.log("mAbilities: ", mAbilities);
    actionList.each(function (index){
      //'this' = element found
      if($(this).attr('data-item-name').trim().toLowerCase() === attackEffectName.trim().toLowerCase()){
        $(this).find('h4').click();
        toggledAnything = true;
      }
    });
    if(!toggledAnything){
      let newAbilityInfo = mAbilities[attackEffectName];
      if(newAbilityInfo){
        let newAction = {
          'name':attackEffectName,
          'type':'action', 
          'data': {
            'actionType': {'value': newAbilityInfo.actionType},
            'source': {'value': ''},
            'description': {'value': newAbilityInfo.description},
            'traits': {value: []},
            'actions': {value: newAbilityInfo.actionCost}
          },
          'flags': {pf2e_updatednpcsheet: {'npcActionType': 'offensive'} }
        };

        let traitRegEx = /(?:Traits.aspx.+?">)(?:<\w+>)*(.+?)(?:<\/\w+>)*(?:<\/a>)/g;
        let matchTraits = [...newAbilityInfo.description.matchAll(traitRegEx)];

        for(let i=0;i<matchTraits.length;i++){
          if(matchTraits[i] && matchTraits[i].length >= 2 && matchTraits[i][1]){
            if(!newAction.data.traits.value.includes(matchTraits[i][1]))
              newAction.data.traits.value.push(matchTraits[i][1]);
          }
        }

        triggerItem.actor.createOwnedItem(newAction, {displaySheet: false});
      }
    }
   }

	/* -------------------------------------------- */
	/*  Event Listeners and Handlers
	/* -------------------------------------------- */

	/**
	* Activate event listeners using the prepared sheet HTML
	* @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
	*/
	activateListeners(html) {
		super.activateListeners(html);
		if ( !this.options.editable ) return;

		/* Roll NPC HP */
		/*     html.find('.npc-roll-hp').click(ev => {
		let ad = this.actor.data.data;
		let hp = new Roll(ad.attributes.hp.formula).roll().total;
		AudioHelper.play({src: CONFIG.sounds.dice});
		this.actor.update({"data.attributes.hp.value": hp, "data.attributes.hp.max": hp});
		}); */

		// NPC SKill Rolling
		// html.find('.item .npc-skill-name').click(event => {
		// 	event.preventDefault();
		// 	let itemId = Number($(event.currentTarget).parents(".item").attr("data-item-id")),
		//   		item = this.actor.getOwnedItem(itemId);
		// 	this.actor.rollLoreSkill(event, item);
		// });  

		// html.find('.skill-input').focusout(async event => {
		// 	let itemId = Number(event.target.attributes["data-item-id"].value);
		// 	const itemToEdit = this.actor.items.find(i => i.id === itemId);
		// 	itemToEdit.data.mod.value = Number(event.target.value);

		// 	// Need to update all skills every time because if the user tabbed through and updated many, only the last one would be saved
		// 	let skills = this.actor.items.filter(i => i.type == "lore")
		// 	for(let skill of skills)
		// 	{
		// 		await this.actor.updateOwnedItem(skill, true);      
		// 	}
		// });

		html.find('.npc-detail-text textarea').focusout(async event => {
			event.target.style.height = "5px";
			event.target.style.height = (event.target.scrollHeight)+"px";
		});

		html.find('.npc-detail-text textarea').each(function(index) {

			this.style.height = "5px";
			this.style.height = (this.scrollHeight)+"px";
		});

    html.find('.isNPCEditable').change((ev) => {
      console.log("currently",this.actor.getFlag('pf2e','editNPC'),"going to",ev.target.checked);
      this.actor.setFlag('pf2e','editNPC',{value: ev.target.checked});
    });

		// NPC Attack summaries
		// Unbind the base.js click event handler
		// html.find('.item .melee-name h4').off( "click" );
	 //    html.find('.item .melee-name h4').click(event => {
	 //    	event.preventDefault();
	 //      	this._onUpNPCAttackSummary(event);
	 //    });

    // NPC Weapon Rolling

    // html.find('button.npc-damageroll').off( "click" );
    html.find('button.npc-damageroll').click(ev => {
      ev.preventDefault();
      ev.stopPropagation();

      let itemId = $(ev.currentTarget).parents(".item").attr("data-item-id"),
          drId = Number($(ev.currentTarget).attr("data-dmgRoll")),
          //item = this.actor.items.find(i => { return i.id === itemId });
          item = this.actor.getOwnedItem(itemId),
          damageRoll = item.data.flags.pf2e_updatednpcsheet.damageRolls[drId];

      // which function gets called depends on the type of button stored in the dataset attribute action
      switch (ev.target.dataset.action) {
          case 'npcDamageRoll': this.rollNPCDamageRoll(damageRoll, item); break;
      }            
    });

    html.find('button.npc-attackEffect').click(ev => {
      ev.preventDefault();
      ev.stopPropagation();

      let itemId = $(ev.currentTarget).parents(".item").attr("data-item-id"),
          aId = Number($(ev.currentTarget).attr("data-attackEffect")),
          //item = this.actor.items.find(i => { return i.id === itemId });
          item = this.actor.getOwnedItem(itemId),
          attackEffect = item.data.data.attackEffects[aId];
      console.log("clicked an attackEffect:", attackEffect, ev);

      // which function gets called depends on the type of button stored in the dataset attribute action
      switch (ev.target.dataset.action) {
          case 'npcAttackEffect': this.expandAttackEffect(attackEffect, ev, item); break;
      }            
    });
	}
}

Handlebars.registerHelper('if_all', function() {
    var args = [].slice.apply(arguments);
    var opts = args.pop();

    var fn = opts.fn;
    for(var i = 0; i < args.length; ++i) {
        if(args[i])
            continue;
        fn = opts.inverse;
        break;
    }
    return fn(this);
});

Handlebars.registerHelper('strip_tags', function(value, options) {
  function strip_tags (input, allowed) { // eslint-disable-line camelcase

    var _phpCastString = function (value) {
      var type = typeof value
      switch (type) {
        case 'boolean':
          return value ? '1' : ''
        case 'string':
          return value
        case 'number':
          if (isNaN(value)) {
            return 'NAN'
          }

          if (!isFinite(value)) {
            return (value < 0 ? '-' : '') + 'INF'
          }

          return value + ''
        case 'undefined':
          return ''
        case 'object':
          if (Array.isArray(value)) {
            return 'Array'
          }

          if (value !== null) {
            return 'Object'
          }

          return ''
        case 'function':
          // fall through
        default:
          throw new Error('Unsupported value type')
      }
    };

    // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
    allowed = (((allowed || '') + '').toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join('')

    var tags = /<\/?([a-z0-9]*)\b[^>]*>?/gi
    var commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi

    var after = _phpCastString(input)
    // removes tha '<' char at the end of the string to replicate PHP's behaviour
    after = (after.substring(after.length - 1) === '<') ? after.substring(0, after.length - 1) : after

    // recursively remove tags to ensure that the returned string doesn't contain forbidden tags after previous passes (e.g. '<<bait/>switch/>')
    while (true) {
      var before = after
      after = before.replace(commentsAndPhpTags, '').replace(tags, function ($0, $1) {
        return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : ''
      })

      // return once no more tags are removed
      if (before === after) {
        return after
      }
    }
  };
  
  return strip_tags(String(value));
});

// Register NPC Sheet
Actors.registerSheet("pf2e", UpdatedNPCActorPF2ESheet, {
  types: ["npc"],
  makeDefault: true
});

