/**
 * SpellBrowserPF2e forked from SpellBrowser by Felix below
 * @author Felix M�ller aka syl3r86
 * @version 0.3
 * @source https://github.com/syl3r86/Spell-Browser
 */

class SpellBrowserPF2e extends Application {

    constructor(app) {
        super(app);
        
        // load settings
        Hooks.on('ready', e => {
            // creating game setting container
            game.settings.register("SpellBrowser", "settings", {
                name: "Spell Browser Settings",
                hint: "Settings to exclude packs from loading",
                default: "",
                type: String,
                scope: 'world',
                onChange: settings => {
                    this.settings = JSON.parse(settings);
                }
            });

            // load settings from container
            let settings = game.settings.get('SpellBrowser', 'settings');
            if (settings == '') { // if settings are empty create the settings data
                console.log("Spell Browser | Creating settings");
                settings = {};
                for (let compendium of game.packs) {
                    if (compendium['metadata']['entity'] == "Item") {
                        settings[compendium.collection] = {
                            load: true,
                            name: `${compendium['metadata']['label']} (${compendium.collection})`
                        };
                    }
                }
                game.settings.set('SpellBrowser', 'settings', JSON.stringify(settings));
            } else { // if settings do exist, reload and apply them to make sure they conform with current compendium
                console.log("Spell Browser | Loading settings"); 
                let loadedSettings = JSON.parse(settings);
                settings = {};
                for (let compendium of game.packs) {
                    if (compendium['metadata']['entity'] == "Item") {
                        settings[compendium.collection] = {
                            // add entry for each item compendium, that is turned on if no settings for it exist already
                            load: loadedSettings[compendium.collection] == undefined ? true : loadedSettings[compendium.collection].load,
                            name: compendium['metadata']['label']
                        };
                    }
                }
            }
            this.settings = settings;
            this.settingsChanged = false;
            this.loadSpells().then(obj => {
                this.spells = obj
            });
        });
        this.hookCompendiumList();

        this.filters = {
            text: '',
            ritual: 'null',
            concentration: 'null',
            castingtime: 'null',
            level: {},
            class: {},
            school: {},
            traditions: {}
        }
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.classes = options.classes.concat('spell-browser-window');
        options.template = "public/systems/pf2e/templates/packs/spell-browser.html";
        options.title = "Add a Spell";
        options.width = 700;
        options.height = 700;
        return options;
    }

    hookCompendiumList() {
        Hooks.on('renderCompendiumDirectory', (app, html, data) => {

            const importButton = $(`<button class="spell-browser-btn" style="max-width: ${game.user.isGM ? "84":"96"}%;"><i class="fas fa-fire"></i> Spell Browser</button>`);
            const settingsButton = $('<button class="spell-browser-settings-btn" style="max-width: 10%;"><i class="fas fa-cog" title="Right click to reset settings."></i></button>');
            // slight diffrence in used buttons and layout depending on gm status

            html.find('.roll20-npc-import-list-btn').remove();
            html.find('.roll20-npc-import-list-settings-btn').remove();
            if (game.user.isGM) {
                html.find('.directory-footer').append(importButton);
                html.find('.directory-footer').append(settingsButton);
            } else {
                // adding to directory-list since the footer doesn't exist if the user is not gm
                html.find('.directory-list').append(importButton);
            }

            // Handle button clicks
            importButton.click(ev => {
                ev.preventDefault();
                this.render(true);
            });

            if (game.user.isGM) { // only add settings click event if the button exists
                settingsButton.mousedown(ev => {
                    let rightClick = ev.which === 3;
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

        let data = {};
        data.spells = this.spells;
        data.classes = this.classes;
        data.times = this.times;
        data.schools = this.schools;
        data.traditions = this.traditions;
        return data;
    }

    async loadSpells() {
        console.log('Spell Browser | Started loading spells');
        
        let foundSpells = '';
        let unfoundSpells = '';

        let spells = {};
        let classesArr = [];
        let traditionsArr = [];
        let schoolsArr = [];
        let timeArr = [];

        for (let pack of game.packs) {
            if (pack['metadata']['entity'] == "Item" && this.settings[pack.collection].load) {
                await pack.getContent().then(content => {
                    for (let spell of content) {
                        spell = spell.data;
                        if (spell.type == 'spell') {

                            // derive spell components
/*                             let components = spell.data.components.value;
                            if (components != undefined) {
                                components = components.toLowerCase();
                                if (components.indexOf('v') != -1) {
                                    spell.data.components.v = true;
                                }
                                if (components.indexOf('s') != -1) {
                                    spell.data.components.s = true;
                                }
                                if (components.indexOf('m') != -1) {
                                    spell.data.components.m = true;
                                }
                            } */

                            // record the pack the spell was read from
                            spell.compendium = pack.collection;

                            // format spell level for display
                            if (spell.data.level.value === 0) spell.data.level.formated = "C";
                            else if (spell.data.level.value === 11) spell.data.level.formated = "F";
                            else spell.data.level.formated = spell.data.level.value;

                            // determining classes that can use the spell
                            let classList = Object.keys(CONFIG.classTraits),
                                classIntersection = classList.filter(x => spell.data.traits.value.includes(x));

                            if (classIntersection.length !== 0) {
                                if (classesArr.includes(classIntersection) === false) {
                                    classesArr.push(classIntersection);
                                }
                                spell.data.classes = { value: classIntersection };
                            }

                            // recording casting times
                            if (spell.data.time.value !== undefined) {
                                let time = spell.data.time.value.toLowerCase();
                                if (time.indexOf("reaction") != -1) time = "reaction";
                                if (time != '' && timeArr.includes(time) === false) {
                                    timeArr.push(time);
                                }
                            }

                            // format spell level for display
                            if (spell.data.time.value === "reaction") spell.data.time.img = this._getActionImg("reaction");
                            else if (spell.data.time.value === "free") spell.data.time.img = this._getActionImg("free");
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
                });
            }
        }
        if (unfoundSpells !== '') {
            console.log(`Spell Browser | List of Spells that don't have a class assosiated to them:`);
            console.log(unfoundSpells);
        }

        //  sorting and assigning better class names
        let classesObj = {}
        classesArr = classesArr.sort();
        for (let classStr of classesArr) {
            //let fixedClassName = classStr.replace('revisited', ' revisited').toLowerCase().replace(/(^|\s)([a-z])/g, function (m, p1, p2) { return p1 + p2.toUpperCase(); });
            classesObj[classStr] = CONFIG.classTraits[classStr];
        }

        // sorting and assigning proper school names
        let schoolsObj = {}
        schoolsArr = schoolsArr.sort();
        for (let school of schoolsArr) {
            schoolsObj[school] = CONFIG.spellSchools[school];
        }

        this.traditions = CONFIG.spellTraditions;
        this.classes = classesObj;
        this.times = timeArr.sort();
        this.schools = schoolsObj;
        console.log('Spell Browser | Finished loading spells');
        return spells;
    }

    openSettings() {
        let content = '<p> Which compendium should be loaded? Uncheck any compendie that dont contain any spells</p>';
        for (let key in this.settings) {
            content += `<div><input type=checkbox name="${key}" ${this.settings[key].load?'checked=true':''}><label>${this.settings[key].name}</label></div>`;
        }
        
        let d = new Dialog({
            title: "Spell Browser settings",
            content: content+'<br>',
            buttons: {
                save: {
                    icon: '<i class="fas fa-check"></i>',
                    label: "Save",
                    callback: html => {
                        
                    }
                },
            },
            default:'save',
            close: html => {
                let inputs = html.find('input');
                for (let input of inputs) {
                    this.settings[input.name].load = input.checked;
                }
                console.log("Spell Browser | Saving new Settings");
                game.settings.set('SpellBrowser', 'settings', JSON.stringify(this.settings));
                this.settingsChanged = true;
                this.loadSpells().then(obj => {
                    this.spells = obj
                });
            }
        }, { width: "300px" });
        d.render(true);
    }

    resetSettings() {
        let d = new Dialog({
            title: "Spell Browser settings",
            content: "Reset settings to default?",
            buttons: {
                yes: {
                    icon: '<i class="fas fa-check"></i>',
                    label: "Continue",
                    callback: html => {
                        console.log("Spell Browser | Creating settings");
                        let settings = {};
                        for (let compendium of game.packs) {
                            if (compendium['metadata']['entity'] == "Item") {
                                settings[compendium.collection] = {
                                    load: true,
                                    name: `${compendium['metadata']['label']} (${compendium.collection})`
                                };
                            }
                        }
                        game.settings.set('SpellBrowser', 'settings', JSON.stringify(settings));
                        this.settings = settings;
                    }
                },
                no: {
                    icon: '<i class="fas fa-ban"></i>',
                    label: "Continue"
                }
            }
        });
        d.render(true);
    }

    activateListeners(html) {
        //$(html).css('min-height', $(html.find('.control-area')).height() + 'px');

        // show spell card
        html.find('.item-edit').click(ev => {
            let itemId = $(ev.currentTarget).parents(".spell").attr("data-entry-id");
            let item = this.spells[itemId];
            let pack = game.packs.find(p => p.collection === item.compendium);
            item = pack.getEntity(itemId).then(spell => {
                spell.sheet.render(true);
            });
        });

        // make draggable
        html.find('.draggable').each((i, li) => {
            li.setAttribute("draggable", true);
            li.addEventListener('dragstart', event => {
                let packName = li.getAttribute("data-entry-compendium");
                let pack = game.packs.find(p => p.collection === packName);
                if (!pack) {
                    event.preventDefault();
                    return false;
                }
                event.dataTransfer.setData("text/plain", JSON.stringify({
                    type: pack.entity,
                    pack: pack.collection,
                    id: li.getAttribute("data-entry-id")
                }));
            }, false);
        });

        // toggle visibility of filter containers
        html.find('.filtercontainer h3').click(ev => {
            $(ev.target.nextElementSibling).toggle(100, e => {
                //$(html).css('min-height', $(html.find('.control-area')).height() + 'px');
            });
        });

        // toggle hints
        html.find('input[name=textFilter]').mousedown(ev => {
            if (event.which == 3) {
                $(html.find('.hint')).toggle(100, e => {
                    //$(html).css('min-height', $(html.find('.control-area')).height() + 'px');
                });
            }
        });
        

        // sort spell list
        html.find('select[name=sortorder]').on('change', ev => {
            let spellList = html.find('li');
            let byName = (ev.target.value == 'true');
            let sortedList = this.sortSpells(spellList, byName);
            let ol = $(html.find('ul'));
            ol[0].innerHTML = [];
            for (let element of sortedList) {
                ol[0].append(element);
            }
        });

        // activating or deactivating filters
        html.find('input[name=textFilter]').on('change paste', ev => {
            this.filters.text = ev.target.value;
            this.filterSpells(html.find('li'));
        });
        html.find('#ritualfilter select').on('change', ev => {
            this.filters.ritual = ev.target.value;
            this.filterSpells(html.find('li'));
        });
        html.find('#concentrationfilter select').on('change', ev => {
            this.filters.concentration = ev.target.value;
            this.filterSpells(html.find('li'));
        });
        html.find('#timefilter select').on('change', ev => {
            this.filters.castingtime = ev.target.value;
            this.filterSpells(html.find('li'));
        });

        // filters for level, class and school
        html.find('input[type=checkbox]').click(ev => {
            let filterType = ev.target.name.split('-')[0];
            let filterTarget = ev.target.name.split('-')[1];
            let filterValue = ev.target.checked;
            switch (filterType) {
                case 'level':
                    this.filters.level[filterTarget] = filterValue;
                    this.filters.level = this.clearObject(this.filters.level);
                    break;
                case 'class':
                    this.filters.class[filterTarget] = filterValue;
                    this.filters.class = this.clearObject(this.filters.class);
                    break;
                case 'school':
                    this.filters.school[filterTarget] = filterValue;
                    this.filters.school = this.clearObject(this.filters.school);
                    break;
                case 'traditions':
                    this.filters.traditions[filterTarget] = filterValue;
                    this.filters.traditions = this.clearObject(this.filters.traditions);
                    break;
            }
            this.filterSpells(html.find('li'));
        });
    }

    sortSpells(list, byName) {
        if(byName) {
            list.sort((a, b) => {
                let aName = $(a).find('.spell-name a')[0].innerHTML;
                let bName = $(b).find('.spell-name a')[0].innerHTML;
                //console.log(`${aName} vs ${bName}`);
                if (aName < bName) return -1;
                if (aName > bName) return 1;
                return 0;
            });
        } else {
            list.sort((a, b) => {
                let aVal = $(a).find('input[name=level]').val();
                let bVal = $(b).find('input[name=level]').val();
                if (aVal < bVal) return -1;
                if (aVal > bVal) return 1;
                if (aVal == bVal) {
                    let aName = $(a).find('.spell-name a')[0].innerHTML;
                    let bName = $(b).find('.spell-name a')[0].innerHTML;
                    if (aName < bName) return -1;
                    if (aName > bName) return 1;
                    return 0;
                }
            });
        }
        return list;
    }

    filterSpells(li) {
        for (let spell of li) {
            if (this.getFilterResult(spell) == false) {
                $(spell).hide();
            } else {
                $(spell).show();
            }
        }
    }

    getFilterResult(element) {
        if (this.filters.text != '') {
            let strings = this.filters.text.split(',');
            for (let string of strings) {
                if (string.indexOf(':') == -1) {
                    if ($(element).find('.spell-name a')[0].innerHTML.toLowerCase().indexOf(string.toLowerCase().trim()) == -1) {
                        return false;
                    }
                } else {
                    let targetValue = string.split(':')[1].trim();
                    let targetStat = string.split(':')[0].trim();
                    if ($(element).find(`input[name=${targetStat}]`).val().toLowerCase().indexOf(targetValue) == -1) {
                        return false;
                    }
                }
            }
        }
        if(this.filters.ritual != 'null') {
            let isRitual = $(element).find('input[name=ritual]').val();
            if (isRitual != this.filters.ritual) {
                return false;
            }
        }
        if(this.filters.concentration != 'null') {
            let isConcentration = $(element).find('input[name=concentration]').val();
            if (isConcentration != this.filters.concentration) {
                return false;
            }
        }
        if(this.filters.castingtime != 'null') {
            let castingtime = $(element).find('input[name=time]').val().toLowerCase();
            if (castingtime != this.filters.castingtime) {
                return false;
            }
        }
        if (Object.keys(this.filters.level).length > 0) {
            let level = $(element).find('input[name=level]').val();
            if (!level) level = 0;
            if (this.filters.level[level] != true) {
                return false;
            }
        }
        if (Object.keys(this.filters.class).length > 0) {
            let classes = $(element).find('input[name=classes]').val();
            let hide = true;
            if (classes != undefined) {
                for (let classStr of classes.split(',')) {
                    if (this.filters.class[classStr.trim()] == true) {
                        hide = false;
                        break;
                    }
                }
            }            
            if (hide) return false;
        }
        if (Object.keys(this.filters.traditions).length > 0) {
            let traditions = $(element).find('input[name=traditions]').val();
            let hide = true;
            if (traditions != undefined) {
                for (let traditionStr of traditions.split(',')) {
                    if (this.filters.traditions[traditionStr.trim()] == true) {
                        hide = false;
                        break;
                    }
                }
            }            
            if (hide) return false;
        }
        if (Object.keys(this.filters.school).length > 0) {
            let school = $(element).find('input[name=school]').val();
            if (this.filters.school[school] != true) {
                return false;
            }
        }
        return true;
    }

    clearObject(obj) {
        let newObj = {};
        for (let key in obj) {
            if (obj[key] == true) {
                newObj[key] = true;
            }
        }
        return newObj;
    }

    /* -------------------------------------------- */

    /**
     * Get the action image to use for a particular action type.
     * @private
     */
    _getActionImg(action) {
        const img = {
        0: "icons/svg/mystery-man.svg",
        1: "systems/pf2e/icons/actions/OneAction.png",
        2: "systems/pf2e/icons/actions/TwoActions.png",
        3: "systems/pf2e/icons/actions/ThreeActions.png",
        "free": "systems/pf2e/icons/actions/FreeAction.png",
        "reaction": "systems/pf2e/icons/actions/Reaction.png",
        "passive": "systems/pf2e/icons/actions/Passive.png",
        };
        return img[action];
    }
}
let spellBrowser = new SpellBrowserPF2e();
