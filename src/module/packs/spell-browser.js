/**
 * ItemBrowserPF2e forked from SpellBrowser by Felix below
 * @author Felix M�ller aka syl3r86
 * @version 0.3
 * @source https://github.com/syl3r86/Spell-Browser
 */

import Progress from '../progress.js';

class ItemBrowserPF2e extends Application {
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.classes = options.classes.concat('spell-browser-window');
    // options.template = "systems/pf2e/templates/packs/spell-browser.html";
    // options.template = "systems/pf2e/templates/packs/feat-browser.html";
    options.title = 'Add an Item';
    options.width = 800;
    options.height = 700;
    return options;
  }

  activateListeners(html) {
    this.resetFilters(html);
    html.on('click', '.clear-filters', (ev) => {
      this.resetFilters(html);
      this.filterSpells(html.find('li'));
    });

    // show spell card
    html.on('click', '.item-edit', (ev) => {
      const itemId = $(ev.currentTarget).parents('.spell').attr('data-entry-id');
      const itemCategory = $(ev.currentTarget).parents('.spell').attr('data-item-category');
      const items = this[itemCategory];
      let item = items[itemId];
      const pack = game.packs.find((p) => p.collection === item.compendium);
      item = pack.getEntity(itemId).then((spell) => {
        spell.sheet.render(true);
      });
    });

    //show actor card
    html.on('click', '.actor-edit', (ev) => {
      const actorId = $(ev.currentTarget).parents('.spell').attr('data-entry-id');
      const actorCategory = $(ev.currentTarget).parents('.spell').attr('data-actor-category');
      const actors = this[actorCategory];
      let actor = actors[actorId];
      const pack = game.packs.find((p) => p.collection === actor.compendium);
      actor = pack.getEntity(actorId).then((npc) => {
        npc.sheet.render(true);
      });
    });

    // make draggable
    html.find('.draggable').each((i, li) => {
      li.setAttribute('draggable', true);
      li.addEventListener('dragstart', (event) => {
        const packName = li.getAttribute('data-entry-compendium');
        const pack = game.packs.find((p) => p.collection === packName);
        if (!pack) {
          event.preventDefault();
          return false;
        }
        event.dataTransfer.setData('text/plain', JSON.stringify({
          type: pack.entity,
          pack: pack.collection,
          id: li.getAttribute('data-entry-id'),
        }));
      }, false);
    });

    // toggle visibility of filter containers
    html.on('click', '.filtercontainer h3', (ev) => {
      $(ev.target.nextElementSibling).toggle(100, (e) => {
        // $(html).css('min-height', $(html.find('.control-area')).height() + 'px');
      });
    });

    // toggle hints
    html.on('mousedown', 'input[name=textFilter]', (ev) => {
      if (event.which == 3) {
        $(html.find('.hint')).toggle(100, (e) => {
          // $(html).css('min-height', $(html.find('.control-area')).height() + 'px');
        });
      }
    });


    // sort spell list
    html.on('change', 'select[name=sortorder]', (ev) => {
      const spellList = html.find('li');
      const byName = (ev.target.value == 'true');
      const sortedList = this.sortSpells(spellList, byName);
      const ol = $(html.find('ul'));
      ol[0].innerHTML = [];
      for (const element of sortedList) {
        ol[0].append(element);
      }
    });

    // activating or deactivating filters
    html.on('change paste', 'input[name=textFilter]', (ev) => {
      this.sorters.text = ev.target.value;
      this.filterSpells(html.find('li'));
    });
    html.on('change', '#timefilter select', (ev) => {
      this.sorters.castingtime = ev.target.value;
      this.filterSpells(html.find('li'));
    });

    // filters for level, class and school
    html.on('click', 'input[type=checkbox]', (ev) => {
      const filterType = ev.target.name.split(/-(.+)/)[0];
      const filterTarget = ev.target.name.split(/-(.+)/)[1];
      const filterValue = ev.target.checked;

      if (Object.keys(this.filters).includes(filterType)) {
        this.filters[filterType][filterTarget] = filterValue;
        this.filters[filterType] = this.clearObject(this.filters[filterType]);
      }
      this.filterSpells(html.find('li'));
    });
  }

  sortSpells(list, byName) {
    if (byName) {
      list.sort((a, b) => {
        const aName = $(a).find('.spell-name a')[0].innerHTML;
        const bName = $(b).find('.spell-name a')[0].innerHTML;
        // console.log(`${aName} vs ${bName}`);
        if (aName < bName) return -1;
        if (aName > bName) return 1;
        return 0;
      });
    } else {
      list.sort((a, b) => {
        const aVal = parseInt($(a).find('input[name=level]').val());
        const bVal = parseInt($(b).find('input[name=level]').val());
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
        if (aVal == bVal) {
          const aName = $(a).find('.spell-name a')[0].innerHTML;
          const bName = $(b).find('.spell-name a')[0].innerHTML;
          if (aName < bName) return -1;
          if (aName > bName) return 1;
          return 0;
        }
      });
    }
    return list;
  }

  async filterSpells(li) {
    let counter = 0;
    li.hide();
    for (const spell of li) {
      if (this.getFilterResult(spell)) {
        $(spell).show();
        if (++counter % 20 === 0) {
          // Yield to the browser to render what it has
          await new Promise(r => setTimeout(r, 0));
        }
      }
    }
  }

  getFilterResult(element) {
    if (this.sorters.text != '') {
      const strings = this.sorters.text.split(',');
      for (const string of strings) {
        if (string.indexOf(':') == -1) {
          if ($(element).find('.spell-name a')[0].innerHTML.toLowerCase().indexOf(string.toLowerCase().trim()) == -1) {
            return false;
          }
        } else {
          const targetValue = string.split(':')[1].trim();
          const targetStat = string.split(':')[0].trim();
          if ($(element).find(`input[name=${targetStat}]`).val().toLowerCase()
            .indexOf(targetValue) == -1) {
            return false;
          }
        }
      }
    }
    if (this.sorters.castingtime != 'null') {
      const castingtime = $(element).find('input[name=time]').val().toLowerCase();
      if (castingtime != this.sorters.castingtime) {
        return false;
      }
    }

    for (const filter of Object.keys(this.filters)) {
      if (Object.keys(this.filters[filter]).length > 0) {
        const filteredElements = $(element).find(`input[name=${filter}]`).val();
        let hide = true;
        if (filteredElements != undefined) {
          for (const e of filteredElements.split(',')) {
            if (this.filters[filter][e.trim()] == true) {
              hide = false;
              break;
            }
          }
        }
        if (hide) return false;
      }
    }

    return true;
  }

  clearObject(obj) {
    const newObj = {};
    for (const key in obj) {
      if (obj[key] == true) {
        newObj[key] = true;
      }
    }
    return newObj;
  }

  resetFilters(html) {
    this.sorters = {
      text: '',
      castingtime: 'null',
    };

    this.filters = {
      level: {},
      classes: {},
      skills: {},
      ancestry: {},
      school: {},
      traditions: {},
      armorType: {},
      group: {},
      traits: {},
      itemTypes: {},
      weaponType: {},
      proficiencies: {},
      skills: {},
      actorSize: {},
      alignment: {},
      source: {},
      featType: {},
    };

    html.find('input[name=textFilter]').val('');
    html.find('input[name=timefilter]').val('null');
    html.find('input[type=checkbox]').prop('checked', false);
  }

  /* -------------------------------------------- */

  /**
     * Get the action image to use for a particular action type.
     * @private
     */
  _getActionImg(action) {
    const img = {
      0: 'icons/svg/mystery-man.svg',
      1: 'systems/pf2e/icons/actions/OneAction.png',
      2: 'systems/pf2e/icons/actions/TwoActions.png',
      3: 'systems/pf2e/icons/actions/ThreeActions.png',
      free: 'systems/pf2e/icons/actions/FreeAction.png',
      reaction: 'systems/pf2e/icons/actions/Reaction.png',
      passive: 'systems/pf2e/icons/actions/Passive.png',
    };
    return img[action];
  }

  get _loadedPacks() {
    return Object.entries(this.settings).flatMap(([collection, {load}]) => {
      return load ? [collection] : [];
    });
  }

  openSettings() {
    // Generate HTML for settings menu
    // Spell Browser
    let content = '<h2> Spell Browser</h2>';
    content += '<p> Which compendium should be loaded? Uncheck each compendium that contains no spells.</p>';
    for (const key in this.settings) {
      content += `<div><input type=checkbox data-browser-type="spell" name="${key}" ${spellBrowser.settings[key].load ? 'checked=true' : ''}><label>${spellBrowser.settings[key].name}</label></div>`;
    }

    // Feat Browser
    content += '<h2> Feat Browser</h2>';
    content += '<p> Which compendium should be loaded? Uncheck each compendium that contains no feats.</p>';
    for (const key in this.settings) {
      content += `<div><input type=checkbox data-browser-type="feat" name="${key}" ${featBrowser.settings[key].load ? 'checked=true' : ''}><label>${featBrowser.settings[key].name}</label></div>`;
    }

    // Inventory Browser
    content += '<h2> Inventory Browser</h2>';
    content += '<p> Which compendium should be loaded? Uncheck each compendium that contains no inventory items.</p>';
    for (const key in this.settings) {
      content += `<div><input type=checkbox data-browser-type="inventory" name="${key}" ${inventoryBrowser.settings[key].load ? 'checked=true' : ''}><label>${inventoryBrowser.settings[key].name}</label></div>`;
    }

    // Action Browser
    content += '<h2>Action Browser</h2>';
    content += '<p> Which compendium should be loaded? Uncheck each compendium that contains no actions.</p>';
    for (const key in this.settings) {
      content += `<div><input type=checkbox data-browser-type="action" name="${key}" ${actionBrowser.settings[key].load ? 'checked=true' : ''}><label>${actionBrowser.settings[key].name}</label></div>`;
    }

    const d = new Dialog({
      title: 'Compendium Browser settings',
      content: `${content}<br>`,
      buttons: {
        save: {
          icon: '<i class="fas fa-check"></i>',
          label: 'Save',
          callback: (html) => {

          },
        },
      },
      default: 'save',
      close: (html) => {
        const inputs = html.find('input');
        for (const input of inputs) {
          const browserType = $(input).attr('data-browser-type');
          if (browserType === 'spell') spellBrowser.settings[input.name].load = input.checked;
          else if (browserType === 'feat') featBrowser.settings[input.name].load = input.checked;
          else if (browserType === 'inventory') inventoryBrowser.settings[input.name].load = input.checked;
          else if (browserType == 'action') actionBrowser.settings[input.name].load = input.checked;
        }
        console.log('PF2e System | Compendium Browser | Saving new Settings');
        // write Spell Browser settings
        game.settings.set('SpellBrowser', 'settings', JSON.stringify(spellBrowser.settings));
        // write Feat Browser settings
        game.settings.set('FeatBrowser', 'settings', JSON.stringify(featBrowser.settings));
        // write Feat Browser settings
        game.settings.set('InventoryBrowser', 'settings', JSON.stringify(inventoryBrowser.settings));
        game.settings.set('ActionBrowser', 'settings', JSON.stringify(actionBrowser.settings));

        this.settingsChanged = true;
        /*                 this.loadSpells().then(obj => {
                    this.spells = obj
                }); */
      },
    }, { width: '300px' });
    d.render(true);
  }
}

class SpellBrowserPF2e extends ItemBrowserPF2e {
  constructor(app) {
    super(app);

    // load settings
    Hooks.on('ready', (e) => {
      // creating game setting container
      game.settings.register('SpellBrowser', 'settings', {
        name: 'Spell Browser Settings',
        hint: 'Settings to exclude packs from loading',
        default: '',
        type: String,
        scope: 'world',
        onChange: (settings) => {
          this.settings = JSON.parse(settings);
        },
      });

      // load settings from container
      let settings = game.settings.get('SpellBrowser', 'settings');
      if (settings == '') { // if settings are empty create the settings data
        console.log('PF2e System | Spell Browser | Creating settings');
        settings = {};
        for (const compendium of game.packs) {
          if (compendium.metadata.entity == 'Item') {
            settings[compendium.collection] = {
              load: true,
              name: `${compendium.metadata.label} (${compendium.collection})`,
            };
          }
        }
        game.settings.set('SpellBrowser', 'settings', JSON.stringify(settings));
      } else { // if settings do exist, reload and apply them to make sure they conform with current compendium
        console.log('PF2e System | Spell Browser | Loading settings');
        const loadedSettings = JSON.parse(settings);
        settings = {};
        for (const compendium of game.packs) {
          if (compendium.metadata.entity == 'Item') {
            settings[compendium.collection] = {
              // add entry for each item compendium, that is turned on if no settings for it exist already
              load: loadedSettings[compendium.collection] == undefined ? true : loadedSettings[compendium.collection].load,
              name: compendium.metadata.label,
            };
          }
        }
      }
      this.settings = settings;
      this.settingsChanged = false;
      /* this.loadSpells().then((obj) => {
        this.spells = obj;
      }); */
    });
    this.hookCompendiumList();
  }

  static get defaultOptions() {
    const options = super.defaultOptions;
    options.classes = options.classes.concat('spell-browser-window');
    options.template = 'systems/pf2e/templates/packs/spell-browser.html';
    // options.template = "systems/pf2e/templates/packs/feat-browser.html";
    options.title = 'Add a Spell';
    options.width = 800;
    options.height = 700;
    return options;
  }

  hookCompendiumList() {
    Hooks.on('renderCompendiumDirectory', (app, html, data) => {
      // Spell Browser Buttons
	    const grouping = $('<div class="browser-group" style="width:100%"></div>');
      const importButton = $(`<button class="spell-browser-btn" style="max-width: ${game.user.isGM ? '84' : '96'}%;"><i class="fas fa-fire"></i> Spell Browser</button>`);
      const settingsButton = $('<button class="spell-browser-settings-btn" style="max-width: 10%;"><i class="fas fa-cog" title="Right click to reset settings."></i></button>');

      if (game.user.isGM) {
        html.find('.directory-footer').append(grouping);
        html.find('.browser-group').append(importButton);
        html.find('.browser-group').append(settingsButton);
      } else {
        // adding to directory-list since the footer doesn't exist if the user is not gm
        html.find('.directory-list').append(importButton);
      }

      // Handle button clicks
      importButton.click((ev) => {
        ev.preventDefault();
        this.render(true);
      });

      if (game.user.isGM) { // only add settings click event if the button exists
        settingsButton.mousedown((ev) => {
          const rightClick = ev.which === 3;
          if (rightClick) {
            this.resetSettings();
          } else {
            this.openSettings();
          }
        });
      }
    });
  }

  async getData() {
    if (this.spells == undefined || this.settingsChanged == true) {
      // spells will be stored locally to not require full loading each time the browser is opened
      this.spells = await this.loadSpells();
      this.settingsChanged = false;
    }

    const data = {};
    data.spells = this.spells;
    data.classes = this.classes;
    data.times = this.times;
    data.schools = this.schools;
    data.traditions = CONFIG.PF2E.spellTraditions;

    return data;
  }

  async loadSpells() {
    console.log('PF2e System | Spell Browser | Started loading spells');

    const foundSpells = '';
    const unfoundSpells = '';

    const spells = {};
    let classesArr = [];
    const traditionsArr = [];
    let schoolsArr = [];
    const timeArr = [];

    for await (const {pack, content} of packLoader.loadPacks('Item', this._loadedPacks)) {
      console.log(`PF2e System | Spell Browser | ${pack.metadata.label} - ${content.length} entries found`);
      for (let spell of content) {
        spell = spell.data;
        if (spell.type == 'spell') {
          // record the pack the spell was read from
          spell.compendium = pack.collection;

          // format spell level for display
          if (spell.data.level.value === 0) spell.data.level.formated = 'C';
          else if (spell.data.level.value === 11) spell.data.level.formated = 'F';
          else spell.data.level.formated = spell.data.level.value;

          // determining classes that can use the spell
          const classList = Object.keys(CONFIG.PF2E.classTraits);
          const classIntersection = classList.filter((x) => spell.data.traits.value.includes(x));

          if (classIntersection.length !== 0) {
            if (classesArr.includes(classIntersection) === false) {
              classesArr.push(classIntersection);
            }
            spell.data.classes = { value: classIntersection };
          }

          // recording casting times
          if (spell.data.time.value !== undefined) {
            let time = spell.data.time.value.toLowerCase();
            if (time.indexOf('reaction') != -1) time = 'reaction';
            if (time != '' && timeArr.includes(time) === false) {
              timeArr.push(time);
            }
          }

          // format spell level for display
          if (spell.data.time.value === 'reaction') spell.data.time.img = this._getActionImg('reaction');
          else if (spell.data.time.value === 'free') spell.data.time.img = this._getActionImg('free');
          else if (parseInt(spell.data.time.value)) spell.data.time.img = this._getActionImg(parseInt(spell.data.time.value));

          // add spell to spells array
          spells[(spell._id)] = spell;

          // recording schools
          if (spell.data.school.value !== undefined) {
            if (schoolsArr.includes(spell.data.school.value) === false) {
              schoolsArr.push(spell.data.school.value);
            }
          }
          spells[(spell._id)] = spell;
        }
      }
    }
    if (unfoundSpells !== '') {
      console.log('PF2e System | Spell Browser | List of Spells that don\'t have a class assosiated to them:');
      console.log(unfoundSpells);
    }

    //  sorting and assigning better class names
    const classesObj = {};
    classesArr = classesArr.sort();
    for (const classStr of classesArr) {
      // let fixedClassName = classStr.replace('revisited', ' revisited').toLowerCase().replace(/(^|\s)([a-z])/g, function (m, p1, p2) { return p1 + p2.toUpperCase(); });
      classesObj[classStr] = CONFIG.PF2E.classTraits[classStr];
    }

    // sorting and assigning proper school names
    const schoolsObj = {};
    schoolsArr = schoolsArr.sort();
    for (const school of schoolsArr) {
      schoolsObj[school] = CONFIG.PF2E.spellSchools[school];
    }

    this.classes = classesObj;
    this.times = timeArr.sort();
    this.schools = schoolsObj;
    console.log('PF2e System | Spell Browser | Finished loading spells');
    return spells;
  }
}


class FeatBrowserPF2e extends ItemBrowserPF2e {
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.classes = options.classes.concat('spell-browser-window');
    // options.template = "systems/pf2e/templates/packs/spell-browser.html";
    options.template = 'systems/pf2e/templates/packs/feat-browser.html';
    options.title = 'Add a Feat';
    options.width = 800;
    options.height = 700;
    return options;
  }

  constructor(app) {
    super(app);

    // load settings
    Hooks.on('ready', (e) => {
      // creating game setting container
      game.settings.register('FeatBrowser', 'settings', {
        name: 'Feat Browser Settings',
        hint: 'Settings to exclude packs from loading',
        default: '',
        type: String,
        scope: 'world',
        onChange: (settings) => {
          this.settings = JSON.parse(settings);
        },
      });

      // load settings from container
      let settings = game.settings.get('FeatBrowser', 'settings');
      if (settings == '') { // if settings are empty create the settings data
        console.log('Feat Browser | Creating settings');
        settings = {};
        for (const compendium of game.packs) {
          if (compendium.metadata.entity == 'Item') {
            settings[compendium.collection] = {
              load: true,
              name: `${compendium.metadata.label} (${compendium.collection})`,
            };
          }
        }
        game.settings.set('FeatBrowser', 'settings', JSON.stringify(settings));
      } else { // if settings do exist, reload and apply them to make sure they conform with current compendium
        console.log('Feat Browser | Loading settings');
        const loadedSettings = JSON.parse(settings);
        settings = {};
        for (const compendium of game.packs) {
          if (compendium.metadata.entity == 'Item') {
            settings[compendium.collection] = {
              // add entry for each item compendium, that is turned on if no settings for it exist already
              load: loadedSettings[compendium.collection] == undefined ? true : loadedSettings[compendium.collection].load,
              name: compendium.metadata.label,
            };
          }
        }
      }
      this.settings = settings;
      this.settingsChanged = false;
      /* this.loadFeats().then((obj) => {
        this.feats = obj;
      }); */
    });
    this.hookCompendiumList();
  }

  hookCompendiumList() {
    Hooks.on('renderCompendiumDirectory', (app, html, data) => {
      // Feat Browser Buttons
      const featImportButton = $(`<button class="feat-browser-btn" style="max-width: ${game.user.isGM ? '84' : '96'}%;"><i class="fas fa-fire"></i> Feat Browser</button>`);
      // const featSettingsButton = $('<button class="feat-browser-settings-btn" style="max-width: 10%;"><i class="fas fa-cog" title="Right click to reset settings."></i></button>');

      if (game.user.isGM) {
        html.find('.browser-group').append(featImportButton);
        // html.find('.directory-footer').append(featSettingsButton);
      } else {
        // adding to directory-list since the footer doesn't exist if the user is not gm
        html.find('.directory-list').append(featImportButton);
      }

      // Handle button clicks
      featImportButton.click((ev) => {
        ev.preventDefault();
        this.render(true);
      });
    });
  }

  async getData() {
    if (this.feats == undefined || this.settingsChanged == true) {
      // feats will be stored locally to not require full loading each time the browser is opened
      this.feats = await this.loadFeats();
      this.settingsChanged = false;
      console.log('Loaded feats');
      this.close();
    }

    const data = {};

    data.feats = this.feats;
    // data.featClasses = this.featClasses;
    data.featClasses = CONFIG.PF2E.classTraits;
    data.featSkills = this.featSkills;
    data.featAncestry = this.featAncestry;
    data.featTimes = this.featTimes;
    return data;
  }

  async loadFeats() {
    console.log('PF2e System | Feat Browser | Started loading feats');

    const feats = {};
    let classesArr = [];
    const skillsArr = [];
    let ancestryArr = [];
    const timeArr = [];

    for await(const {pack, content} of packLoader.loadPacks('Item', this._loadedPacks)) {
      console.log(`PF2e System | Feat Browser | ${pack.metadata.label} - ${content.length} entries found`);
      for (let feat of content) {
        feat = feat.data;
        if (feat.type == 'feat') {
          // record the pack the feat was read from
          feat.compendium = pack.collection;

          // determining attributes from traits
          if (feat.data.traits.value) {
            // determine class feats
            const classList = Object.keys(CONFIG.PF2E.classTraits);
            const classIntersection = classList.filter((x) => feat.data.traits.value.includes(x));

            if (classIntersection.length !== 0) {
              if (classesArr.includes(classIntersection) === false) {
                classesArr.push(classIntersection);
              }
              feat.data.classes = { value: classIntersection };
            }

            if (feat.data.featType.value === 'ancestry') {
              const ancestryList = Object.keys(CONFIG.PF2E.ancestryTraits);
              const ancestryIntersection = ancestryList.filter((x) => feat.data.traits.value.includes(x));

              if (ancestryIntersection.length !== 0) {
                if (ancestryArr.includes(ancestryIntersection) === false) {
                  ancestryArr.push(ancestryIntersection);
                }
                feat.data.ancestry = { value: ancestryIntersection };
              }
            }
          }

          // determine skill feats
          if (feat.data.featType.value === 'skill') {
            const skillList = Object.keys(CONFIG.PF2E.skillList);
            let prerequisitesArr = feat.data.prerequisites.value.split(' ');

            prerequisitesArr = prerequisitesArr.map((y) => y.toLowerCase());

            const skillIntersection = skillList.filter((x) => prerequisitesArr.includes(x));

            if (skillIntersection.length !== 0) {
              if (skillsArr.includes(skillIntersection) === false) {
                skillsArr.push(skillIntersection);
              }
              feat.data.skills = { value: skillIntersection };
            }
          }

          // format spell level for display
          feat.data.level.formated = parseInt(feat.data.level.value);

          // format spell level for display
          let time = '';
          if (feat.data.actionType.value === 'reaction') {
            feat.data.actionType.img = this._getActionImg('reaction');
            time = 'reaction';
          } else if (feat.data.actionType.value === 'free') {
            feat.data.actionType.img = this._getActionImg('free');
            time = 'free';
          } else if (feat.data.actionType.value === 'passive') {
            feat.data.actionType.img = this._getActionImg('passive');
            time = 'passive';
          } else if (parseInt(feat.data.actions.value)) {
            feat.data.actionType.img = this._getActionImg(parseInt(feat.data.actions.value));
            time = feat.data.actions.value.toLowerCase();
          }
          if (time != '' && timeArr.includes(time) === false) {
            timeArr.push(time);
          }


          // add spell to spells array
          feats[(feat._id)] = feat;
        }
      }
    }

    //  sorting and assigning better class names
    const classesObj = {};
    classesArr = classesArr.sort();
    for (const classStr of classesArr) {
      classesObj[classStr] = CONFIG.PF2E.classTraits[classStr];
    }

    //  sorting and assigning better ancestry names
    const ancestryObj = {};
    ancestryArr = ancestryArr.sort();
    for (const ancestryStr of ancestryArr) {
      ancestryObj[ancestryStr] = CONFIG.PF2E.ancestryTraits[ancestryStr];
    }

    this.featClasses = classesObj;
    this.featSkills = CONFIG.PF2E.skillList;
    this.featAncestry = ancestryObj;
    this.featTimes = timeArr.sort();
    // this.schools = schoolsObj;
    console.log('PF2e System | Feat Browser | Finished loading feats');
    return feats;
  }
}

class InventoryBrowserPF2e extends ItemBrowserPF2e {
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.classes = options.classes.concat('spell-browser-window');
    // options.template = "systems/pf2e/templates/packs/spell-browser.html";
    options.template = 'systems/pf2e/templates/packs/inventory-browser.html';
    options.title = 'Add Equipment';
    options.width = 900;
    options.height = 700;
    return options;
  }

  constructor(app) {
    super(app);

    // load settings
    Hooks.on('ready', (e) => {
      // creating game setting container
      game.settings.register('InventoryBrowser', 'settings', {
        name: 'Inventory Browser Settings',
        hint: 'Settings to exclude packs from loading',
        default: '',
        type: String,
        scope: 'world',
        onChange: (settings) => {
          this.settings = JSON.parse(settings);
        },
      });

      // load settings from container
      let settings = game.settings.get('InventoryBrowser', 'settings');
      if (settings == '') { // if settings are empty create the settings data
        console.log('PF2e System | Inventory Browser | Creating settings');
        settings = {};
        for (const compendium of game.packs) {
          if (compendium.metadata.entity == 'Item') {
            settings[compendium.collection] = {
              load: true,
              name: `${compendium.metadata.label} (${compendium.collection})`,
            };
          }
        }
        game.settings.set('InventoryBrowser', 'settings', JSON.stringify(settings));
      } else { // if settings do exist, reload and apply them to make sure they conform with current compendium
        console.log('PF2e System | Inventory Browser | Loading settings');
        const loadedSettings = JSON.parse(settings);
        settings = {};
        for (const compendium of game.packs) {
          if (compendium.metadata.entity == 'Item') {
            settings[compendium.collection] = {
              // add entry for each item compendium, that is turned on if no settings for it exist already
              load: loadedSettings[compendium.collection] == undefined ? true : loadedSettings[compendium.collection].load,
              name: compendium.metadata.label,
            };
          }
        }
      }
      this.settings = settings;
      this.settingsChanged = false;
      /* this.loadInventoryItems().then((obj) => {
        this.inventoryItems = obj;
      }); */
    });
    this.hookCompendiumList();
  }

  hookCompendiumList() {
    Hooks.on('renderCompendiumDirectory', (app, html, data) => {
      // Inventory Browser Buttons
      const inventoryImportButton = $(`<button class="inventory-browser-btn" style="max-width: ${game.user.isGM ? '84' : '96'}%;"><i class="fas fa-fire"></i> Equipment Browser</button>`);
      // const featSettingsButton = $('<button class="feat-browser-settings-btn" style="max-width: 10%;"><i class="fas fa-cog" title="Right click to reset settings."></i></button>');

      if (game.user.isGM) {
        html.find('.browser-group').append(inventoryImportButton);
        // html.find('.directory-footer').append(featSettingsButton);
      } else {
        // adding to directory-list since the footer doesn't exist if the user is not gm
        html.find('.directory-list').append(inventoryImportButton);
      }

      // Handle button clicks
      inventoryImportButton.click((ev) => {
        ev.preventDefault();
        this.render(true);
      });
    });
  }

  async getData() {
    if (this.inventoryItems == undefined || this.settingsChanged == true) {
      // feats will be stored locally to not require full loading each time the browser is opened
      this.inventoryItems = await this.loadInventoryItems();
      this.settingsChanged = false;
    }

    const data = {};
    const itemTypes = {
      weapon: 'Weapons',
      armor: 'Armor',
      equipment: 'Equipment',
      consumable: 'Consumables',
      treasure: 'Treasure',
      backpack: 'Containers',
    };

    data.inventoryItems = this.inventoryItems;
    // data.featClasses = this.featClasses;
    // data.featSkills = this.featSkills;
    // data.featAncestry = this.featAncestry;
    // data.featTimes = this.featTimes;
    data.armorTypes = CONFIG.PF2E.armorTypes;
    data.armorGroups = CONFIG.PF2E.armorGroups;
    data.weaponTraits = CONFIG.PF2E.weaponTraits;
    data.itemTypes = itemTypes;
    data.weaponTypes = CONFIG.PF2E.weaponTypes;
    data.weaponGroups = CONFIG.PF2E.weaponGroups;
    return data;
  }

  async loadInventoryItems() {
    console.log('PF2e System | Inventory Browser | Started loading feats');

    const inventoryItems = {};
    const classesArr = [];
    const skillsArr = [];
    const ancestryArr = [];
    const timeArr = [];

    const itemTypes = [
      'weapon',
      'armor',
      'equipment',
      'consumable',
      'treasure',
      'backpack',
    ];

    for await (const {pack, content} of packLoader.loadPacks('Item', this._loadedPacks)) {
      console.log(`PF2e System | Inventory Browser | ${pack.metadata.label} - ${content.length} entries found`);
      for (let item of content) {
        item = item.data;
        if (itemTypes.includes(item.type)) {
          // record the pack the feat was read from
          item.compendium = pack.collection;

          // add item.type into the correct format for filtering
          item.data.itemTypes = { value: item.type };

          // add spell to spells array
          inventoryItems[(item._id)] = item;
        }
      }
    }
    console.log('PF2e System | Inventory Browser | Finished loading inventory items');
    return inventoryItems;
  }
}

class BestiaryBrowserPF2e extends ItemBrowserPF2e {
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.classes = options.classes.concat('spell-browser-window');
    options.template = 'systems/pf2e/templates/packs/bestiary-browser.html';
    options.title = 'Find an NPC in the bestiary';
    options.width = 800;
    options.height = 700;
    return options;
  }

  constructor(app) {
    super(app);

    // load settings
    Hooks.on('ready', (e) => {
      // creating game setting container
      game.settings.register('BestiaryBrowser', 'settings', {
        name: 'Bestiary Browser Settings',
        hint: 'Settings to exclude packs from loading',
        default: '',
        type: String,
        scope: 'world',
        onChange: (settings) => {
          this.settings = JSON.parse(settings);
        },
      });

      // load settings from container
      let settings = game.settings.get('BestiaryBrowser', 'settings');
      if (settings == '') { // if settings are empty create the settings data
        console.log('PF2e System | Bestiary Browser | Creating settings');
        settings = {};
        for (const compendium of game.packs) {
          if (compendium.metadata.entity == 'Actor') {
            settings[compendium.collection] = {
              load: true,
              name: `${compendium.metadata.label} (${compendium.collection})`,
            };
          }
        }
        game.settings.set('BestiaryBrowser', 'settings', JSON.stringify(settings));
      } else { // if settings do exist, reload and apply them to make sure they conform with current compendium
        console.log('PF2e System | Bestiary Browser | Loading settings');
        const loadedSettings = JSON.parse(settings);
        settings = {};
        for (const compendium of game.packs) {
          if (compendium.metadata.entity == 'Actor') {
            settings[compendium.collection] = {
              // add entry for each item compendium, that is turned on if no settings for it exist already
              load: loadedSettings[compendium.collection] == undefined ? true : loadedSettings[compendium.collection].load,
              name: compendium.metadata.label,
            };
          }
        }
      }
      this.settings = settings;
      this.settingsChanged = false;
      /* this.loadBestiaryActors().then((obj) => {
        this.bestiaryActors = obj;
      }); */
    });
    this.hookCompendiumList();
  }

  hookCompendiumList() {
    Hooks.on('renderCompendiumDirectory', (app, html, data) => {
      // Bestiary Browser Buttons
      const bestiaryImportButton = $(`<button class="bestiary-browser-btn" style="max-width: ${game.user.isGM ? '84' : '96'}%;"><i class="fas fa-fire"></i> Bestiary Browser</button>`);

      if (game.user.isGM) {
        html.find('.browser-group').append(bestiaryImportButton);
      } /* else {
        // adding to directory-list since the footer doesn't exist if the user is not gm
        html.find('.directory-list').append(bestiaryImportButton);
      } */

      // Handle button clicks
      bestiaryImportButton.click((ev) => {
        ev.preventDefault();
        this.render(true);
      });
    });

    Hooks.on('renderActorDirectory', (app, html, data) => {
      // Bestiary Browser Buttons
      const bestiaryImportButton = $(`<button class="bestiary-browser-btn"><i class="fas fa-fire"></i> Bestiary Browser</button>`);

      if (game.user.isGM) {
        //html.find('.browser-group').append(bestiaryImportButton);
        html.find('.directory-footer').append(bestiaryImportButton);
      } //else {
        // adding to directory-list since the footer doesn't exist if the user is not gm
        //html.find('.directory-footer').append(bestiaryImportButton);
      //}

      // Handle button clicks
      bestiaryImportButton.click((ev) => {
        ev.preventDefault();
        this.render(true);
      });
    });
  }

  async getData() {
    if (this.bestiaryActors == undefined || this.settingsChanged == true) {
      // actors will be stored locally to not require full loading each time the browser is opened
      this.bestiaryActors = await this.loadBestiaryActors();
      this.settingsChanged = false;
    }

    const data = {};

    data.bestiaryActors = this.bestiaryActors;
    data.actorSize = CONFIG.PF2E.actorSizes;
    data.alignment = CONFIG.PF2E.alignment;
    data.traits = CONFIG.PF2E.monsterTraits;
    data.languages = CONFIG.PF2E.languages;
    data.source = this.source;

    return data;
  }

  async loadBestiaryActors() {
    console.log('PF2e System | Bestiary Browser | Started loading actors');

    const bestiaryActors = {};
    const traitsArr = [];
    const sourceArr = [];

    for await(const {pack, content} of packLoader.loadPacks('Actor', this._loadedPacks)) {
      console.log(`PF2e System | Bestiary Browser | ${pack.metadata.label} - ${content.length} entries found`);
      for (let actor of content) {
        actor = actor.data;
        if (actor.type === "npc") {
          // record the pack the feat was read from
          actor.compendium = pack.collection;
          actor["filters"] = {};

          actor.filters["level"] = actor.data.details.level.value;
          actor.filters["traits"] = actor.data.traits.traits.value;
          actor.filters["alignment"] = actor.data.details.alignment.value;
          actor.filters["actorSize"] = actor.data.traits.size.value;

          // get the source of the bestiary entry ignoring page number and add it as an additional attribute on the bestiary entry
          if (actor.data.details.source && actor.data.details.source.value) {
            let actorSource = actor.data.details.source.value;
            if (actorSource.includes('pg.')) {
              actor.filters["source"] = actorSource.split('pg.')[0].trim();
            } else if (actorSource.includes('page.')) {
              actor.filters["source"] = actorSource.split('page.')[0].trim();
            } else {
              actor.filters["source"] = actorSource
            }
          }


          // add the source to the filter list.
          if (actor.filters.source) {
            if (!sourceArr.includes(actor.filters.source)) sourceArr.push(actor.filters.source);
          }

          if (actor.data.traits.traits.value.length) {
            actor.data.traits.traits.value.forEach(trait => {
              if (!traitsArr.includes(trait)) traitsArr.push(trait);
            })
          }

          // add actor to bestiaryActors object
          bestiaryActors[actor._id] = actor
        }
      }
      console.log(`PF2e System | Bestiary Browser | ${pack.metadata.label} - Loaded`);
    }

    this.traits = traitsArr.sort();
    this.source = sourceArr.sort();

    console.log('PF2e System | Bestiary Browser | Finished loading Bestiary actors');
    return bestiaryActors;
  }
}

class ActionBrowserPF2e extends ItemBrowserPF2e {
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.classes = options.classes.concat('spell-browser-window');
    options.template = 'systems/pf2e/templates/packs/action-browser.html';
    options.title = 'Add an Action';
    options.width = 800;
    options.height = 700;
    return options;
  }

  constructor(app) {
    super(app);

    // load settings
    Hooks.on('ready', (e) => {
      // creating game setting container
      game.settings.register('ActionBrowser', 'settings', {
        name: 'Action Browser Settings',
        hint: 'Settings to exclude packs from loading',
        default: '',
        type: String,
        scope: 'world',
        onChange: (settings) => {
          this.settings = JSON.parse(settings);
        },
      });

      // load settings from container
      let settings = game.settings.get('ActionBrowser', 'settings');
      if (settings == '') { // if settings are empty create the settings data
        console.log('Action Browser | Creating settings');
        settings = {};
        for (const compendium of game.packs) {
          if (compendium.metadata.entity == 'Item') {
            settings[compendium.collection] = {
              load: true,
              name: `${compendium.metadata.label} (${compendium.collection})`,
            };
          }
        }
        game.settings.set('ActionBrowser', 'settings', JSON.stringify(settings));
      } else { // if settings do exist, reload and apply them to make sure they conform with current compendium
        console.log('Action Browser | Loading settings');
        const loadedSettings = JSON.parse(settings);
        settings = {};
        for (const compendium of game.packs) {
          if (compendium.metadata.entity == 'Item') {
            settings[compendium.collection] = {
              // add entry for each item compendium, that is turned on if no settings for it exist already
              load: loadedSettings[compendium.collection] == undefined ? true : loadedSettings[compendium.collection].load,
              name: compendium.metadata.label,
            };
          }
        }
      }
      this.settings = settings;
      this.settingsChanged = false;
      /* this.loadActions().then((obj) => {
        this.actions = obj;
      }); */
    });
    this.hookCompendiumList();
  }

  hookCompendiumList() {
    Hooks.on('renderCompendiumDirectory', (app, html, data) => {
      // Action Browser Buttons
      const actionImportButton = $(`<button class="feat-browser-btn" style="max-width: ${game.user.isGM ? '84' : '96'}%;"><i class="fas fa-fire"></i> Action Browser</button>`);

      if (game.user.isGM) {
        html.find('.browser-group').append(actionImportButton);
      } else {
        // adding to directory-list since the footer doesn't exist if the user is not gm
        html.find('.directory-list').append(actionImportButton);
      }

      // Handle button clicks
      actionImportButton.click((ev) => {
        ev.preventDefault();
        this.render(true);
      });
    });
  }

  async getData() {
    if (this.actions == undefined || this.settingsChanged == true) {
      // feats will be stored locally to not require full loading each time the browser is opened
      this.actions = await this.loadActions();
      this.settingsChanged = false;
    }

    const data = {};

    const sortedTraits = {};
    Object.keys(CONFIG.PF2E.featTraits).sort().forEach((key) => {
      sortedTraits[key] = CONFIG.PF2E.featTraits[key];
    });

    data.actions = this.actions;
    data.actionTraits = sortedTraits;
    data.skills = CONFIG.PF2E.skillList;
    data.proficiencies = CONFIG.PF2E.proficiencyLevels;
    return data;
  }

  async loadActions() {
    console.log('PF2e System | Action Browser | Started loading feats');

    const actions = {};
    const timeArr = [];

    for await (const {pack, content} of packLoader.loadPacks('Item', this._loadedPacks)) {
      console.log(`PF2e System | Action Browser | ${pack.metadata.label} - Loading`);
      for (let action of content) {
        action = action.data;
        if (action.type == 'action') {
          // update icons for any passive actions
          if (action.data.actionType.value === 'passive') action.img = this._getActionImg('passive');
          // record the pack the feat was read from
          action.compendium = pack.collection;
          actions[(action._id)] = action;
        }
      }
    }

    console.log('PF2e System | Action Browser | Finished loading actions');
    return actions;
  }
}

class PackLoader {
  constructor() {
    this.loadedPacks = {
      Actor: {},
      Item: {},
    }
  }

  async *loadPacks(entityType, packs) {
    if (!this.loadedPacks[entityType]) {
      this.loadedPacks[entityType] = {};
    }

    // TODO: i18n for progress bar
    const progress = new Progress({steps: packs.length});
    for (const packId of packs) {
      let data = this.loadedPacks[entityType][packId];
      if (!data) {
        const pack = game.packs.get(packId);
        progress.advance(`Loading ${pack.metadata.label}`);
        if (pack.metadata.entity === entityType) {
          const content = await pack.getContent();
          data = this.loadedPacks[entityType][packId] = {pack, content};
        } else {
          continue;
        }
      } else {
        const {pack} = data;
        progress.advance(`Loading ${pack.metadata.label}`);
      }

      yield data;
    }
    progress.close('Loading complete');
  }
}


const packLoader = new PackLoader();
export const spellBrowser = new SpellBrowserPF2e();
export const featBrowser = new FeatBrowserPF2e();
export const inventoryBrowser = new InventoryBrowserPF2e();
export const bestiaryBrowser = new BestiaryBrowserPF2e();
export const actionBrowser = new ActionBrowserPF2e();
