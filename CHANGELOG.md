# Changelog

## Version 4.8.0

### New Features
* (nikolaj-a) Add a secret GM notes field on items, accessible from item sheets' description panel

### System Improvements
* (dev7355608) Enable hearing range tests to improve compatibility with the Perfect Vision module
* (Dire Weasel) Allow splash damage in DamageDice rule element
* (In3luki) Unify UI for compendium browser traits filtering, allow filtering to include all or any of the inputted traits
* (nikolaj-a) Add action macros for Administer First Aid and Create Forgery
* (stwlam) Expand critical specialization support to NPC attacks with linked weapons
* (stwlam) Expand modifier adjustments to fully support Unburdened Iron
* (stwlam) Flip default of "lootableNPCs" setting (NPCs are now lootable by default)
* (stwlam) Add support for adjusting weapon traits of NPC attacks
* (stwlam) Allow item slugs to be set from rule element panel on item sheets
* (stwlam) Have status-effects panel operate on all controlled tokens
* (Supe) Change left click effect panel functionality for persistent to roll damage
* (Supe) Improve behavior of item/action summaries on actor sheets
* (Tikael) Allow combination weapons to be of any group

### Bugfixes
* (Drental) Fix token distance measurement in 3D space
* (In3luki) Fix macros for strikes when more than one weapon of the same base type is held
* (stwlam) Restore display of formulas to NPC & Hazard damage buttons
* (stwlam) Fix display and processing of halved persistent damage
* (stwlam) Have sovereign steel weapons count as cold iron for IWR processing
* (stwlam) Make undead PCs be unaffected by bleed damage
* (stwlam) Make theater-of-the-mind toggles a world setting
* (stwlam) Set weapons to be magical if affected by WeaponPotency rule elements
* (stwlam) Fix issue with DamageDice rule element that affected Arcane Cascade's "Weapon Damage" option

### Data Updates
* (Abaddon) Fix elder wyrmwraith temporary hit points, sky dragon breath weapons
* (avagdu) Add Trained rank to Crafting to Munitions Crafter feat
* (avagdu) Add correct Lores to Yamaraj
* (avagdu) Automate Order Explorer Feat
* (avagdu, Dire Weasel, Dogstarrb, Flameslicer, SpartanCPA, Tikael, TMun) Add and QA content from Treasure Vault
* (David Bass) Fix details of several Kingmaker NPCs
* (DawidIzydor) Fixed stealth for Breath of Depair
* (Dire Weasel) Add additional feats section to Wrestler journal. Clean up journal formatting.
* (Dire Weasel) Add regeneration rule element to hydra heads effect. Make hooktongue hydra regeneration immutable.
* (Dire Weasel) Add skill list to Recall Knowledge in GM Screen journal entry
* (Dire Weasel) Add spell effect for Thermal Stasis
* (Dire Weasel) Automate some NPC critical specialization
* (Dire Weasel) Fix Bralani inventory
* (Dire Weasel) Fix Hadrinnex effects
* (Dire Weasel) Fix Tumble Through macro strings
* (Dire Weasel) Fix black whale guard inventory
* (Dire Weasel) Fix damage of Boastful Hunter
* (Dire Weasel) Fix dragon deviant storming breath escape and wraith deviant ghostly grab
* (Dire Weasel) Fix name of Aerial Piledriver feat
* (Dire Weasel) Fix name of Umonlee mental save bonus
* (Dire Weasel) Link NPC attacks to weapons where appropriate
* (Dire Weasel) Migrate inline splash damage and multipart damage to current standard
* (Dire Weasel) Migrate khakkara to khakkhara, wind and fire wheel to feng huo lun
* (Dire Weasel) Update Dewey Daystar's Heal, Magic Fang, and Wand of Healing
* (Dire Weasel) Update Meteor Swarm description to include burst templates and leveled fire damage
* (Drental) Fix bulk of Mithral Waffle Iron
* (Drental) Fix typo in brevic noble background
* (Dwim) Automate Verdant Metamorphosis impact on Actor Traits
* (Dwim) Fix Intimidation skill label for Xulgath Stoneliege
* (InfamousSky) Add icon to mystic carriage, portrait of spite
* (InfamousSky) Fix Hydra stealth label
* (InfamousSky) Fix Overdrive Imentesh Warpwave Strike DC
* (InfamousSky) Make Hydra Regeneration Immutable
* (InfamousSky) Set Hydra Heads effect counter default to 1
* (KSops) Add cold iron blanch equipment effects
* (KSops) Add rule elements for wing deflection reaction
* (KSops) Add silversheen equipment effect
* (Kuroni) Remove two control codes in GM screen
* (LebombJames) Correct folk dowsing level
* (Manni) Fix target of levitate spell in carbuncle to Self only
* (MrVauxs) Add a note for Shared Stratagem
* (MrVauxs) Add missing Inline Template to Horizon Thunder Sphere
* (rectulo) Add prerequisites to Reset the Past
* (rectulo) Fix Alkenstar agent typos in archetypes journal entry
* (rectulo) Fix source of Dessicating Inhalation save DC
* (rectulo) Fix levels of Advanced Thoughtform, Basic Psychic Spellcasting,  Duel Spell Advantage, and Space Time Shift
* (Roxim) Remove deprecated Blade Ally effects and broken links
* (SpartanCPA) Correct Source of Anima Invocation
* (SpartanCPA) Rename Phuthi to a generic statblock name
* (stwlam) Add roll notes informing swashbucklers when they gain panache
* (stwlam) Add focus component to Plane Shift and Song of the Fallen spells
* (stwlam) Add rule elements to Elf Atavism and Chosen of Lamashtu feats
* (stwlam) Add slots for Swashbuckler's Stylish Tricks feats
* (stwlam) Add spell effect for Anticipate Peril
* (stwlam) Fix Kurshkin's level
* (stwlam) Localize label of shark-instinct jaws attack, add image and base type
* (stwlam) Correct details of Soul Chain in equipement compendium and on Forge-Spurned
* (Supe) Prepare vehicle hp, run ae-likes, and enable usage of certain REs in vehicles/hazards
* (Supe) Remove some defunct bulk methods
* (Supe) Show condition summary and render item summary in template
* (TMun) Move hardness from several NPCs from HP details text to `hardness` property
* (Tikael) Add basic pet shop equipment
* (Tikael) Add spell effect for Battlefield Persistence
* (Tikael) Brush up several high level druid feats
* (Tikael) Fix the name of the Greater Fanged rune
* (Tikael) Improve ChoiceSet of Specialty Crafting
* (Tikael) Localize divine vessel strike
* (Zullock) Change incorrect usage in some tattoos


## Version 4.7.4

### Bugfixes
* (stwlam) Fix inclusion of item bonuses from weapon potency runes


## Version 4.7.3

### System Improvements
* (Dire Weasel) Include target roll options in spell damage rolls, allow use of use "{item|id}-damage" selector for rule elements stored on spells
* (nikolaj-a) Add action macros for Conceal an Object, Palm and Object, and Steal
* (stwlam) Don't render enemy visual/auditory auras to players
* (stwlam) Sort strikes on PC sheet alphabetically, force basic unarmed attack to bottom of readied strikes
* (Trent) Add range increment display to strike action summaries

### Bugfixes
* (nikolaj-a) Refine action macro degree of success roll notes
* (Supe) Avoid persisting synthetic NPC traits
* (stwlam) Fix issue causing sheets of new heritage items to become unopenable
* (stwlam) Fix application of "deadAtZero" setting
* (stwlam) Restore inclusion of homebrew base weapon types to weapon sheet
* (Trent) Allow ranged battle-form strikes

### Data Updates
* (Abaddon) Update abomination vaults Galudu
* (Abaddon) Update age of ashes spell exceptions
* (Dire Weasel) Add persistent damage to more NPC attacks
* (Dire Weasel) Change Fire Mephit Breath Weapon to unique id
* (Dire Weasel) Fix several Strike rule element damageTypes
* (Dire Weasel) Fix blowgun damage on NPC inventory items
* (Dire Weasel) Fix damage of Enervation, Fungal Infestation, and Vampiric Maiden spells
* (Dire Weasel) Fix some persistent damage that were skipped by migration due to data errors
* (Dire Weasel) Update Mysterious Breadth feat description and its journal page
* (Dire Weasel) Update holy water splash note
* (Dire Weasel) Automate Searing Light good damage
* (Dwim) Fix localization issues with NPC attack effects in Abomination Vaults
* (InfamousSky) Fix Virtuous Defender shield hardness
* (Manni) Fix typos in Master Magus Spellcasting feat description
* (nikolaj-a) Add roll notes to Scoundrel Racket for successful Feints
* (Roxim) Add a Blade Ally effect with new AdjustStrike rule elements
* (SpartanCPA) De-Pluralize name of Giant Joro Spider
* (stwlam) Remove errant grant from Mithbreath Azarketi heritage
* (stwlam) Fix rule elements on Zombie Dedication and Numb feats, add Deteriorated effect
* (Tikael) Fix strike rule element in Deer Instinct
* (Trent) Make Green Man's battle form thorns ranged, fix label on localized Thorns strikes


## Version 4.7.2

### System Improvements
* (Supe) Allow NPC melee categorized partial without matching base

### Bugfixes
* (stwlam) Fix issue causing cloned actors to lose their items
* (stwlam) Wrap long summings of damage instance totals in chat

### Data Updates
* (Abaddon) Fix energy mutagen effect descriptions
* (Abaddon) Update NPC spells for Bestiary 1
* (Dire Weasel) Add missing feats from Impossible Lands
* (Dire Weasel) Add persistent damage to some NPC attacks
* (Dire Weasel) Fix Captivating Intensity journal entry
* (KSops) Fix inline roll warning message
* (KSops) Normalize skill action traits
* (rectulo) Fix terminate bloodline ritual details
* (stwlam) Add icons for class archetype features
* (Trent) Localize NPC critical specialization notes


## Version 4.7.1

## Bugfixes
* (stwlam) Fix issue causing some target-situational modifiers to fail to surface


## Version 4.7.0

### System Improvements
* (Dire Weasel) Display icon next to passive abilities with the aura trait
* (Dire Weasel) Add includesSelf option to Aura rule elements
* (Flame) Prevent focus spells from being added to non-focus spellcasting entries
* (LebombJames) Display item levels in item directory
* (LebombJames) Add effects tab to vehicle sheet
* (nikolaj) Add Decipher Writing, Disable Device, Perform, and Subsist action macros
* (stwlam) Add means of retrieving effects' originating actors
* (stwlam) Add support for AdjustStrike adding/removing weapon property runes
* (stwlam) Add support for categorizing NPC damage as persistent, precision, or splash
* (stwlam) Add support for condition/effect alterations from GrantItem REs
* (stwlam) Improve automation of grievous rune for picks and darts
* (stwlam) Brighten darker scene default colors for basic usability
* (stwlam) Handle immunity to auditory, emotional, fear, mental, and visual effects
* (stwlam) Enable simple enemy- and all-affecting auras, add support for predicating each effect in Aura REs
* (stwlam) Add support for shorthand Strike RE data to create standard fist attack
* (Supe) Add full DamageDice RE support to spells
* (Supe) Add manual persistent damage roll to editor dialog
* (Supe) Add autocomplete key options based on schema in rule element editor
* (Supe) Add support for labeled effect counters and formula badges
* (Supe) Integrate vehicles into attack-roll target automation
* (Supe) Implement broken reduction for vehicle AC and fortitude saves
* (Supe) Implement rolling persistent damage recovery from effect panel
* (Supe) Open persistent damage dialog when left clicking Effects Panel icon

### Bugfixes
* (Dana) Fix "item:damage-dice:N" roll options being set according to the number of faces rather than dice
* (In3luki) Improve performance of very large auras in scenes with large numbers of walls
* (In3luki, stwlam) Fix issue causing user-configured roll modes to be ignored for rolls made from sheets
* (JDCalvert) Fix AdjustStrike trait upgrading for annotated traits (deadly, fatal, etc.)
* (Kendall Rundquist) Fix placement of save button in compendium browser settings on resizing
* (LebombJames) Allow for decimal scales in TokenImage
* (stwlam) Fix ABP not being ignored when requested by actors
* (stwlam) Fix display of custom critical damage types on weapon sheet
* (stwlam) Fix parsing of damage formulas with `MathTerm`s
* (stwlam) Fix rule elements on Mystic Strikes class feature
* (stwlam) Obscure damage recipient names when "tokenSetsNameVisibility" is enabled
* (stwlam) Restore functionality of critical damage dice doubling setting
* (Supe) Fix newly created kits erroring on sheet open
* (Supe) Fix spell variant levels not being able to heighten downwards
* (Supe) Keep tabs from shifting in item sheet when changing to rules tab

### Data Updates
* (AFigureOfBlue) Fix typo in blurb of Tulvak's stat block
* (AFigureOfBlue) Have Diverse Weapon Expert upgrade advanced weapon proficiency to trained
* (Abaddon) Fix black dragon draconic frenzy, bronze dragon breath weapons
* (Abaddon) Rebuild iconics, one-shot pregens
* (Abaddon) Refresh Abomination Vaults and Age of Ashes NPC spells
* (Abaddon) Update several spell descriptions for NPCs
* (Avagdu) Add missing Actions from BotD
* (Avagdu) Update Parry trait description
* (Avery) Improve Alchemist Research Field Homebrew Support
* (Dire Weasel) Add Aura rule elements to many NPCs
* (Dire Weasel) Add Fly spell effect, Furious Possession effect
* (Dire Weasel) Add Resistance rule elements to tattoos
* (Dire Weasel) Add effect for Despair, Stink Sap, Utter Despair
* (Dire Weasel) Add emanation to Horrific Visage
* (Dire Weasel) Add persistent damage to many NPC attacks
* (Dire Weasel) Add rule elements for Amorphous Aspect
* (Dire Weasel) Add second open ability boost to Harrow-Led and raised by Belief backgrounds
* (Dire Weasel) Add token light to Candle, Mechanical Torch, Lantern of Empty Light, Queasy Lantern, and Chromatic Armor effect
* (Dire Weasel) Automate Hound of Tindalos vulnerability
* (Dire Weasel) Clean up description of Graylok artillerist Throw Bomb
* (Dire Weasel) Fix Brilliant Crafter giving expert in Inventor class DC at level 15
* (Dire Weasel) Fix Iridescent Elephant's Glowing Bones details
* (Dire Weasel) Fix Reinforced Surcoat usage
* (Dire Weasel) Fix spelling of Tristian's name
* (Dire Weasel) Fix localization of Needling Stairs, Incorporeal TotM toggle
* (Dire Weasel) Improve automation of Double Slice
* (Dire Weasel) Replace Abendego Jailer mancatcher with a longspear variant
* (Dire Weasel) Update "Spell Ambush" rules in night hag variants
* (Drental) add deathNote to Verdant Burst
* (Dwim) Fix localization issues with many NPC attack effects
* (InfamousSky) Fix Clockwork Rifler
* (InfamousSky) January data review
* (jdip) Add missing traits from items
* (jdip) Fix Rune item usages
* (Kuroni) Remove a unicode in Deities-Urgathoa's description
* (KSops) Add resistance rule element to Fire Resistance feat
* (KSops) Allow cantrip deck creation from spell
* (LebombJames) Fix spell type of Shadow Jump
* (rectulo) Fix Grendel Tooth grind ability
* (rectulo) Fix Prerequisites in Bounty Hunter archetype journal
* (rectulo) Fix heightening text of Rejuvenating flames
* (rectulo) Fix prerequisites of Keep Pace (bounty hunter), Opportunistic Grapple, Posse, Tools of the Trade
* (rectulo) Fix typos in Bioluminescence Bomb
* (redeux) Rebuild iconic actor feats and features, refresh, alchemical bombs owned by iconics and pregen
* (RobertBeilich) Add RollOption and automation for Agile Shield Grip
* (Roxim) Add missing spell effect for Touch of Corruption
* (Roxim) Adjust Marilith Ability Effects
* (Roxim) Fix inline roll syntax for Electromuscular Stimulator
* (Roxim) Remove toggle on Marilith
* (Roxim) Review EC book 6 NPCs
* (Roxim) Update The Slithering NPCs
* (stwlam) Add rule elements to Advantageous Assault
* (stwlam) Add immunities to deafened/blinded conditions
* (stwlam) Fix rule elements on Chirurgeon's field discovery
* (TMun) Add NPCs from PFS 4-08
* (Tikael) Add Silence spell effect
* (Tikael) Add a "mounted" effect
* (Tikael) Add automation to the Orc Warmask feat, Vital Shot action
* (Tikael) Grant conditions from Oracle curses
* (Tikael) Add inline damage rolls to Divine Smite and automate Paladin's smite
* (Tikael) Add missing automation to Goloma Courage
* (Tikael) Add missing text in Order Explorer feat
* (Tikael) Add range increment to Headless Rustler's strike
* (Tikael) Automate Cathartic Mage Dedication, Deviant Abilities, Entity's Resurgence
* (Tikael) Fix Drained condition when applied to level 0 and -1 creatures
* (Tikael) Fix details of several ranged strikes
* (Tikael) Fix equipment on Blaanlool
* (Tikael) Fix predicates on Giant Instinct resistance
* (Tikael) Fix several BaseSpeed REs
* (Tikael) Fix typo in Warhammer descriptions
* (Tikael) Improve automation of One Inch Punch
* (Tikael) Move the elementalist spell list to the archetype journal
* (Tikael) Simplify inline bleed damage rolls
* (Tikael) Improve automation of Trap Finder
* (Tikael) Localize and fix traits for save note of Stunning Fist
* (Trent) Replace deprecated Foundry API usage in pair of macros
* (xdy) Add more critical hit deck effects


## Version 4.6.8

### Bugfixes
* (stwlam) Fix issue causing button listeners to fail on some damage chat messages
* (stwlam) Fix application of resistances/weaknesses following crit immunity
* (stwlam) Fix adding base weapon types from homebrew elements
* (Supe) Prevent flat checks acquiring bonuses and penalties

### Data Updates
* (Dire Weasel) Add Aura rule elements to additional NPCs
* (TiloBuechsenschuss) Fix Tzitzimitl spellcasting DC for innate spells


## Version 4.6.7

### Bugfixes
* (stwlam) Fix click listeners of persistent damage application buttons
* (stwlam) Fix visibility of persistent-damage recovery button
* (stwlam) Have damage-formula parser accept dice expressions with no leading number

### Data Updates
* (Dire Weasel) Add Aura rule elements to additional NPCs
* (Dire Weasel) Add hyphen to long-term rest action name
* (Dire Weasel) Added Curse of Stone to Stone Sister's attacks
* (Dire Weasel) Update augnagar to new bleed format
* (stwlam) Add negative healing to Basic Undead Benefits and Revenant background
* (stwlam) Fix rule element on Expanded Splash
* (stwlam) Have Aquatic Combat effect grant Flat-Footed condition
* (stwlam) Remove (Kingmaker) Amiri's extra Intimidating Glare feat
* (TMun) Correct will save modifier of Tarrasque
* (Tikael) Add missing source details to critical hit deck effect
* (Tikael) Fix feat type of Fey Influence
* (xdy) Add flat-footed Critical Deck effect


## Version 4.6.6

### System Improvements
* (Dire Weasel) Add splash damage to weapons with Scatter trait
* (stwlam) Add IWR support for unarmed attacks
* (stwlam) Add resistance-ignoring to applicable weapon runes
* (stwlam) Add support for setting reach from CreatureSize rule elements
* (stwlam) Allow strike attack-roll methods to skip ammo consumption
* (Supe) Add persistent recovery button and auto-recover on success

### Bugfixes
* (Jamz) Add more specificity to the CSS selectors for Critical Hit/Fumble Journals
* (Roxim) Remove Serrating Critical Success Note
* (stwlam) Fix application of persistent damage when IWR setting is disabled
* (stwlam) Fix automatic inclusion of mental immunity for mindless creatures
* (stwlam) Fix localization of hazard traits outside edit mode
* (stwlam) Fix name adjustments of nested feats with choice sets

### Data Updates
* (Abaddon) Localize actions tab on hazard sheet
* (Dire Weasel) Add "Conrasu" trait to Conrasu Lore
* (Dire Weasel) Add AdjustDegreeOfSuccess rule element to Effect: Bravo's Brew (Greater)
* (Dire Weasel) Add several inert Aura rule elements to NPCs for visual reference
* (Dire Weasel) Add Effect: Dragon's Rage Wings
* (Dire Weasel) Add TokenLight rule elements for "Glow" abilities
* (Dire Weasel) Add effects for Perfect Droplet - Armor
* (Dire Weasel) Add metal resistance to Rust Ooze
* (Dire Weasel) Restore missing note for flaming rune critical
* (Dire Weasel) Add representative image to Apricot of Bestial Might strike
* (Dire Weasel) Add resistance rule elements to several abilities
* (Dire Weasel) Add splash trait to Alignment Ampoule
* (Dire Weasel) Added resistance rule elements to Perfect Resistance
* (Dire Weasel) Fix Jakaki's Mindfog Aura to be passive. Add Aura RE to Mindfog Aura.
* (Dire Weasel) Fix D'ziriak language tag
* (Dire Weasel) Fix description of maximum damage for Bottled Sunlight (Moderate)
* (Dire Weasel) Fix formatting of several aura descriptions
* (Dire Weasel) Update Brighite Herexen to new Harm spell
* (InfamousSky) Fix zombie rival necromancer hit points
* (squirrelkiller) Correct gun sword's weapon category
* (Roxim) Add Missing Immunity on Derghodaemon
* (SpartanCPA) Add Imeckus Stroon
* (SpartanCPA) Remove redundant Elk and Megaloceros from Kingmaker Compendium
* (rectulo) Fix a typo in Divine evolution
* (stwlam) Add rule element to Calculated Splash feat
* (stwlam) Add class DC training to applicable multiclass dedications
* (stwlam) Add resistance rule elements to Armor Expertise class feature
* (stwlam) Add weapon base type to claws from two heritages
* (stwlam) Fix flag mismatch in Effect: Elemental Assault rule elements
* (stwlam) Fix Slag May claw's cold-iron material
* (Surge) Fix Grazing Deer hazard disable checks typo
* (Tikael) Add inline damage rolls to Bottled Sunlight
* (Tikael) Add missing human heritages from the Beginner Box
* (Tikael) Add rule elements to Bomb Launcher
* (Tikael) Fix actions of Thunder Helm
* (Tikael) Fix granted feat of Musical Prodigy
* (Tikael) Fix item grants of Molten Wit feat


## Version 4.6.5

### New Features
* (Supe) Add support for CRB 4th printing Voluntary Flaws

### Bugfixes
* (In3luki) Re-evaluate degree of success adjustments on reroll
* (stwlam) Fix processing of positive damage against living targets
* (stwlam) Fix manual adjustments of damage rolls with multiple instances
* (stwlam) Fix craft and repair macros
* (stwlam) Fix rolling damage from consumables

### Data Updates
* (Cora) Restore the variant Devourer and Bog Mummy from AV
* (Dire Weasel) Add Breeg's Traps
* (Dire Weasel) Add effect for Goo Grenade
* (Dire Weasel) Add persistent damage to alchemical bombs
* (Dire Weasel) Fix Bottled Sunlight to be martial weapons and have a range of 20 feet
* (Dire Weasel) Fix Brevic Noble Garess to grant crafting rather than arcana
* (Dire Weasel) Fix Fang Sharpener upgrading Razortooth jaws damage dice, and add critical bleed
* (Dire Weasel) Fix formatting of several spell links
* (Dire Weasel) Fix link in Spell Effect: Prismatic Armor
* (MrVauxs) Add missing range localization keys
* (rectulo) Fix level of Soulspark candle
* (stwlam) Add resistance rule element to Reinforce Eidolon effect
* (stwlam) Update Burn It! to add status bonuses to persistent damage
* (stwlam) Link Beastkin's Change Shape effect from action item, update icon


## Version 4.6.4

### New Features
* (Supe) Add support for alternate ancestry boosts

### System Improvements
* (stwlam) Add processing of area damage weaknesses/resistance, axe vulnerability, and arrow vulnerability
* (stwlam) Add ability to include persistent damage directly in weapon data
* (stwlam) Create persistent damage conditions when applying damage

### Bugfixes
* (stwlam) Hide damage-instance breakdown from private damage rolls
* (stwlam) Fix context menu applying triple damage when double damage is selected
* (stwlam) Only increase weapon dice number from striking/ABP if originally 1 (excludes higher-level bombs)
* (stwlam) Ensure damage rolls always total to at least 1
* (stwlam) Loosen overly-strict damage-roll recognition
* (Supe) Fix bracket row deletion in flat modifier form always deleting the first row
* (Supe) Fix overflow in effect panel from longer badges

### Data Updates
* (Abaddon) Update damage-roll formulas in bomb notes to reflect new standard
* (Abaddon) Fix shark diver's Electrify ability
* (Abaddon) Fix various sources
* (Cheps) Fix Anadi Elder, Anadi Sage, and Daemonic Infector spellcasting entries
* (Cora) Add new key item icons
* (Cora) Update and remove spoilers of items on some of the unique AV NPCs
* (Dire Weasel) Add Gouging Claw damage variants
* (Dire Weasel) Add persistent damage to Acid Flask
* (Dire Weasel) Add stench auras to xulgaths
* (Dire Weasel) Correct some sources in AP 185 and 186
* (Dire Weasel) Correct spelling of "Rejuvenation" in some NPC stat blocks
* (Dire Weasel) Fix Galudu's inventory
* (Dire Weasel) Fix Grab on Minchgorm
* (Dire Weasel) Fix Lomok's Oath of the Burning Mammoths
* (Dire Weasel) Fix battle form spell effects to use "cold-iron" rather than "coldiron"
* (Dire Weasel) Fix capitalization of actions
* (Dire Weasel) Fix case of Telekinetic Projectile variant names
* (Dire Weasel) Fix book sources of several items
* (Dire Weasel) Fix name of Hamstringing Strike and add effect
* (Dire Weasel) Fix prompt for Giant Instinct Barbarian
* (Dire Weasel) Fix inventories and strike details of several Strength of Thousands NPC
* (Dire Weasel) Touch up equipment on PFS actors
* (Dwim) Fix Clawsong versatile spell effect
* (Dwim) Fix deadly variant of Clawsong spell effect
* (LebombJames) Add variants for Shadow Blast save types
* (Lunar Requiem) Correct spelling of Woolly Rhinoceros
* (MrVauxs) Add missing range traits to selectable values
* (Roxim) Add missing GrantItem to Psychic Dedication
* (Roxim) Revise CRB Errata 4 Changes
* (SpartanCPA) Add an effect for Nyktera's Righteous Fury
* (stwlam) Add ghost touch rule element to Blade Ally effect
* (stwlam) Refine rule elements on Twitchy feat
* (stwlam) Add persistent damage to Alchemist's Fire
* (TMun) Remove duplicate weapons master entry from Shraen Graveknight NPC
* (xdy) Add Spell Effect: Prismatic Armor


## Version 4.6.3

### Bugfixes
* (stwlam) Fix functionality of healing buttons on damage messages

### Data Updates
* (TMun) Make content changes reflecting Pathfinder Core Rulebook Errata (4th Printing)

## Version 4.6.2

### System Improvements
* (stwlam) Add IWR support for conditions, critical hits, spell schools, elemental traits, ghost-touch runes, and (non-)magical attacks
* (Supe) Add support for homebrew damage types existing as immunities/weaknesses/resistances

### Bugfixes
* (Dire Weasel) Restore support for bracketed values in TokenImage rule element
* (stwlam) Apply immunities/weaknesses/resistances after manual multipliers and addends
* (stwlam) Prevent ABP from applying Devastating Attacks to battle form attacks
* (stwlam) Fix handling of damage formulas with math function
* (stwlam) Ensure all undead NPCs have negative healing
* (stwlam) Fix issue preventing desired roll mode from being used when set from chat log
* (stwlam) Restore application of stacking rulings to spell-damage bonuses and penalties

### Data Updates
* (Abaddon) Remove unneeded html styling from Sixth Pillar Archetype entry
* (Blue) Fixes ancestors oracle curse effect
* (Dire Weasel) Add aura to gibbering mouther
* (Dire Weasel) Fix Veshumirix Breath Weapon recharge
* (Dire Weasel) Fix alignment ampoules to be martial weapons.
* (rectulo) Fix actions of Heal companion spell
* (rectulo) Fix actions of Wild morph spell
* (SpartanCPA) Define Organsight damage as precision damage
* (SpartanCPA) Fix some pf2-icon styling in several items
* (SpartanCPA) Fix splash-damage formula in acid splash's description
* (Tikael) Add preselection to Deep Orc item grant


## Version 4.6.1

### System Improvements
* (Supe) Include spell materials (when present) in message headers

### Bugfixes
* (In3luki) Fix AELike rule elements' handling of arrays
* (In3luki) Fix issue causing validation to incorrectly fail for Weakness and Resistance rule elements
* (In3luki) Update Hazard sheet sidebar template to new IWR format
* (stwlam) Exclude rule-element-added IWR from IWR editor form submission
* (stwlam) Fix errant exclusion of negative modifiers in damage rolls
* (stwlam) Restore presence of triple-damage buttons when setting is enabled
* (Supe) Fix dragging persistent inline rolls from actor item summaries
* (Supe) Fix first-level daze with negative modifier
* (Supe) Fix sheet crashes caused by invalid spell formulas
* (Supe) Fix structural issues in some spell data

### Data Updates
* (Abaddon) Fix adamantine golem resistance exception
* (Abaddon) Update baomal's shell rake damage
* (Tikael) Change a few feats from using DamageDice REs to AdjustStrike ones
* (Tikael) Fix automation of Time and Ash oracle curses

## Version 4.6.0

## New Features
* (stwlam) Reimplement creation, parsing, and rendering of damage roll formulas
* (stwlam) Add basic processing of immunities, weaknesses, and resistances
* (Supe) Add system support for persistent damage
* (Supe) Add support for homebrew damage types

## System Improvements
* (In3luki) Replace empty action icon in Compendium Browser spell tab with a new icon for longer actions
* (stwlam) Add support for AE-like subtractions/array-element removals
* (Supe) Added support for spell damage traits, modifier breakdown, and damage instances
* (Supe) Implement RE form for fast healing and regeneration
* (Supe) Include damage modifiers and dice in roll inspector

### Bugfixes
* (Dana) Fix tokens with animated art disappearing on reload/scene switch
* (Dire Weasel) Fix torch item not adding its "improvised tag"
* (stwlam) Avoid double application of modifiers to speeds derived from land speed
* (stwlam) Fix errant natural 1 or 20 highlighting when TMun rolls 2d20
* (stwlam) Fix issue causing actor sheets to become unviewable when canvas is disabled

### Data Updates
* (Cerapter) Localise MarkToken RE's cancel notification
* (Dire Weasel) Add choice localized strings
* (Dire Weasel) Fix source of Shadow Leydroth
* (Dire Weasel) Localize Muse choice labels
* (Dire Weasel) Remove extraneous spell tradition from traits
* (Dire Weasel) Update NPC Searing Light descriptions to include inline good roll
* (InfamousSky) Add icons to all Dark Archive, Book of the Dead and Grand Bazaar equipment
* (Jamz) Update Critical Hit & Fumble Decks with links and new look
* (xdy) Add variants to Imaginary Weapon and Malicious Shadow.
* (xdy) Add variants to the spells Astral Rain, Brain Drain, Divine Decree and Divine Lance.
* (xdy) Adds variants to the spells Abyssal Wrath, Divine Wrath and Draconic Barrage
* (xdy) Fixes spelling of the Blade of the Black Sovereign
* (xdy) Makes all three damage rolls in Enchanting Arrow clickable.
* (Manni) Fix inline save on Fire Box
* (Manni) Fix several basic inline saves
* (Op" Philip Flarsheim) Add Automation to Energy Barrier and Soaring Armor
* (rectulo) Fix a typo in Entrancing Eyes duration
* (rectulo) Fix prerequisites of Spellmaster's tenacity
* (Roxim) Brushup EC Book 5 NPCs
* (SpartanCPA) Correct Localized Persistent and Splash Formulas
* (SpartanCPA) Standardize Titles for Regeneration
* (stwlam) Add REs to Fang Sharpener feat
* (stwlam) Update Scalpel's Point to deal bleed damage
* (Supe) Add silver/coldiron to certain spells
* (TMun) Add new or missing license sources for end 2022/start 2023
* (TMun) Correct the spell list for Dream of Doom in PFS 4-07
* (TMun) Fix inventory of Ingnovim's assistant
* (Telekenunes) Automate Raging Resistance, consolidate duplicate feats, and add miscellaneous missing automation
* (Tikael) Add label to Hunter Automaton toggle
* (Tikael) Add some missing localizations of ranges
* (Tikael) Add some needed localization keys
* (Tikael) Automate Automaton enhancements
* (Tikael) Finish automation possible Raging Resistances
* (Tikael) Fix formatting in several rune localizations
* (Tikael) Fix using own modifier for battle form skills

## Version 4.5.1

### Bugfixes
* (stwlam) Ensure presence of school and tradition traits on spell variants
* (stwlam) Restore predication testing of degree-of-success adjustments

### Data Updates
* (Athenos) Add Rule Elements to Bull's Eye Lantern
* (Avery) Condense flat modifiers for bestiary effects
* (Avery) Improve localization of GM screen journals
* (Dire Weasel) Add resistance rule elements to glass and sand sentries
* (Dire Weasel) Fix localized name and icon of Crown of the Saumen Kar horns attack
* (dogstarrb) Update deities to match Impossible Lands entries
* (rectulo) Fix feat type of Lesson of Bargains
* (rectulo) Fix traits of Lesson of Favors feat
* (Tikael) Fix automation of Automaton Chassis
* (Tikael) Fix sources of items from Blood Lords book 6
* (TMun) Add actors from PFS 4-07 and Bounty 21


## Version 4.5.0

### System Improvements
* (Dire Weasel) Allow injected selectors in BaseSpeed rule element
* (LebombJames) Allow injected selectors in RollTwice rule element
* (stwlam) Add support for setting a scale in TokenImage rule element
* (stwlam) Automatically adjust degree of success when appropriate given presence of Incapacitation trait
* (stwlam) Reduce CPU load of hearing detection
* (Supe) Touch up styling of loot actor sheet
* (Supe) Add roll inspector support for casted spells
* (Supe) Add support for proficiency modifier adjustments
* (Tikael) Replace hard-coded fetchling color darkvision with an actor flag

### Bugfixes
* (Salmon) Fix level not showing on first actor(s) in folders
* (stwlam) Re-render effects panel when world time changes
* (Supe) Fix placement of background-granted skill feats on PC sheet
* (Supe) Fix spell level in roll options
* (Supe) Fix variant spells for consumable items
* (Supe) Open separate sheet for spell variants

### Data Updates
* (Abaddon) Finish reviewing creatures from bestiary 3
* (Abaddon) Add Hadrinnex effects
* (Abaddon) Fix cobbleswarm, sturzstromer, and tzitzimitl senses
* (Abaddon) Fix love siktempora's inspire courage, triumph siktempora regeneration
* (Abaddon) Fix hardness value of Tupilaq
* (avagdu) Fix localization key of Vishkanya trait
* (cepvep) Fix predicate on Vetalarana Emergent
* (Dire Weasel) Improve localization access to many rule element labels
* (Dire Weasel) Condense several rule elements using recently-added syntax
* (Dire Weasel) Add Effect: Shield Immunity
* (Dire Weasel) Add Perfect Resistance, Perfect Ki Expert, Perfect Ki Exemplar, Perfect Ki Grandmaster archetype feats
* (Dire Weasel) Add Sparkling Targe Defending checkbox label
* (Dire Weasel) Add Unbreaking Wave Barrier, Unbreaking Wave Containment, Unbreaking Wave Vapor focus spells
* (Dire Weasel) Add Unfolding Wind Blitz, Unfolding Wind Buffet, Unfolding Wind Crash focus spells
* (Dire Weasel) Add Untwisting Iron Augmentation, Untwisting Iron Pillar, Untwisting Iron Roots focus spells
* (Dire Weasel) Add effects for Flaming Star, Grim Sandglass, and Trinity Geode
* (Dire Weasel) Add emanation to Noxious Vapors
* (Dire Weasel) Add link from Treat Wounds to immunity
* (Dire Weasel) Add healing rolls to Oil of Unlife
* (Dire Weasel) Adjust formatting of Perfect Droplet
* (Dire Weasel) Brush up Alchemist Aspirant's inventory
* (Dire Weasel) Change hazard routines from action symbols to words
* (Dire Weasel) Change the Hydra Heads effect to use a counter instead of ChoiceSet
* (Dire Weasel) Change vermlek Unsettling Movement to passive
* (Dire Weasel) Correct localized name of simple hazard checkbox in compendium browser
* (Dire Weasel) Fix Drusilla's good luck effect to last 1 day
* (Dire Weasel) Fix Mulventok's fear immunity
* (Dire Weasel) Fix arrow weakness for Barking Stag
* (Dire Weasel) Fix aura effect on Foras
* (Dire Weasel) Fix damage type on Smite Good feat
* (Dire Weasel) Fix incorrect languages and traits on several creatures
* (Dire Weasel) Fix link to Effect: Applereed Mutagen (Moderate)
* (Dire Weasel) Fix range on Swarming Wasp Stings
* (Dire Weasel) Fix resistance effects for Ring of Torag and Tallowheart Mass
* (Dire Weasel) Fix spelling of Bizarre in pair of feats
* (Dire Weasel) Fix type of level from string to number
* (Dire Weasel) Standardize formatting of Five-Feather Wreath
* (Dire Weasel) Update Jalmeri Heavenseeker to Impossible Lands versions
* (Dorako) Tweak style of inline check prompts with repost buttons
* (Geliogabalus) Fix ancestry requirement of Elfbane Hobgoblin heritage
* (InfamousSky) Add icons to Grand Bazaar items
* (Kuroni) Change Kitsune Change Shape's name for added clarity
* (Kuroni) Remove several errant linebreaks from item descriptions
* (LebombJames) Add speed penalty to Ashes curse
* (rectulo) Add frequency in Planar sidestep
* (rectulo) Fix inline roll in Siabrae
* (rectulo) Fix level of champion archetype's healing touch feat in archetypes journal
* (rectulo) Fix prerequisites in Fey transcendence
* (rectulo) Fix prerequisites of Glamour (Fey influence)
* (rectulo) Fix level of Amber Sphere aeon stone
* (rectulo) Fix typo in Flower Magic name
* (rectulo) Update Fey influence with Impossible Lands printing
* (redeux) Add/Update Heal Animal to Lini iconic PCs
* (Roxim) Continue brushup of Extinction Curse NPCs
* (stwlam) Fix predicate on Night Hag, Wight Cultist ability rule elements
* (stwlam) Fix description of Raging Athlete feat
* (stwlam) Add trained proficiency in alchemical bombs to Alchemist Dedication feat
* (stwlam) Add trained proficiency in rogue class DC to Rogue Dedication feat
* (stwlam) Add special prone-condition option to Cover effect
* (TMun) Add NPCs from PFS 4-06 and correct name of overtaxed vrisk from PFS 4-05
* (TMun) Add lesson of bargains major lesson for pact witch
* (TMun) Update Dreshkan needle spray save from Hardcover errata
* (Tikael) Add Gatewalkers Player's Guide Backgrounds
* (Tikael) Fix name of Solar Rejuvenation
* (Tikael) Fix sources of several NPCs
* (Tikael) Fix traits of Nightstick
* (TiloBuechsenschuss) Fix innate spells of Bugul Noz
* (Tim Ayers) Refine the attack note of Battle Cry

## Version 4.4.2

### Bugfixes
* (stwlam) Fix expired effect deletion when out of combat

### Data Updates
* (Abaddon) Continue reviewing creatures from Bestiary 3
* (Dire Weasel) Add Unblinking Flame Aura, Unblinking Flame Emblem, Unblinking Flame Ignition focus spells
* (Drental) Fix Hidden Thorn's weapon group
* (Roxim) Add Renewed Vigor effect
* (Roxim) Add missing trait to Tricky Pick
* (Roxim) Continue reviewing Extinction Curse book 4 NPCs
* (stwlam) Have Assassin Dedication feat grant Mark for Death action
* (Tikael) Grant Powerful Fist feature with Monk Dedication


## Version 4.4.1

### System Improvements
* (LebombJames) Add Action cost glyphs to feat and class feature sheet headers

### Bugfixes
* (stwlam) Fix functionality of effect expiration settings
* (stwlam) Prevent double name adjustments from ChoiceSets when transfering physical items
* (Tikael) Fix selector lookup for AdjustStrike REs

### Data Updates
* (Abaddon) Continue reviewing creatures from Bestiary 3
* (Dire Weasel) Add Perfect Weaponry archetype feat
* (Dire Weasel) Fix FlatModifier selector for Brevic Outcast
* (Dire Weasel) Fix Cognitive Mutagen effect descriptions
* (LebombJames) Create new base weapon type for injection spear
* (LebombJames) Set Skill Training AE-like to upgrade
* (rectulo) Fix typo in Soul Chain in description, formatting in Azarim and Grasp of Droskar descriptions
* (Roxim) Brushup EC Book 4 NPCs
* (Tikael) Add PFS level bump effect for NPCs
* (Tikael) Add effect to track Spined Shield spines
* (Tikael) Automate Fearsome Brute
* (Tikael) Fix selector on Fast Recovery
* (Tikael) Update AV spells to hardcover versions


## Version 4.4.0

### System Improvements
* (KSops) Allow roll substitutions for initiative rolls
* (Idle) Allow the use of ALT key to add an unidentified effect to an actor
* (stwlam) Adjust default reach of NPC attacks to use lower end of CRB Table 9-1 (overridable by reach traits)
* (stwlam) Change all "weapon:\*" predication statements to "item:\*" ones
* (stwlam) Clarify type of transaction in MoveLootPopup prompt
* (stwlam) Render auras when GMs are logged in alone
* (Supe) Convert metagame visibility settings to booleans
* (Supe) Use `rollMode` instead of `secret` for roll functions
* (Tikael) Allow effect badge counters to be set on drag

### Bugfixes
* (Friz) Show incapacitation note for all checks with the trait
* (Idle) Hide floaty text for unidentified effects
* (In3luki) Fix issue causing damage buttons to disappear following reroll of attack rolls
* (In3luki) Fix actor sidebar showing the actor level to users that lack permission
* (In3luki) Fix shield HP updates not being reflected in token resource bars
* (LebombJames) Visibly distinguish secret inline checks
* (stwlam) Implement "shoddy" tag for physical items
* (stwlam) Clean up encounter roll options, refresh each turn
* (stwlam) Exclude troops from being flankable
* (stwlam) Immediately re-initialize vision when PC senses are directly updated
* (stwlam) Redraw token auras if scene is activated while being viewed
* (Supe) Restore spell traits in spell summaries

### Data Updates
* (Abaddon) Continue reviewing creatures from Bestiary 3
* (Avagdu, Dogstarrb, Tikael) Add content from Lost Omens: Impossible Lands
* (Dire Weasel) Add Runic Resistance effect to Spellscar Sky Marauder
* (Dire Weasel) Add link from Battle Medicine to immunity
* (Dire Weasel) Add trigger text to No Escape description
* (Dire Weasel) Correct spelling of Toxic Furnace
* (Dire Weasel) Fix Bark Orders Effect rule element
* (Dire Weasel) Move heightened description for Zealous Conviction from effect to spell
* (dogstarrb) Add heightening to Spirit Blast
* (dogstarrb) Add missing multiclass archetypes to journal, missing journal links in dedication feats
* (dogstarrb) Correct tradition proficiency for Master Psychic Spellcasting
* (kageru) Fix CHA modifier of tallow guardian
* (xdy) Fix copy and paste error in Hellknight Dedication
* (JDCalvert) Add Reflection of Life recovery multiplier increase
* (KSops) Add automation to chronoskimmer, roll substitutions to initiative
* (KSops) Fix Inner Radiance Torrent Heightening
* (KSops) Fix rule elements on Quick Alchemy feat
* (LebombJames) Automated some Oracle Curses
* (Pinktiger74) Clean up GM screen journal
* (Roxim) Brushup EC Book 3 NPCs
* (Roxim) Brushup EC Book 4 NPCs part 1
* (Roxim) Fix Torch description
* (SkepticRobot) Fix Strength of Thousands backgrounds
* (SkepticRobot) Fix Spellscar Marauder's talon strike
* (SpartanCPA) Compendium replace items and spells from EC Books
* (SpartanCPA) Delete Bone Croupier from EC compendium
* (stwlam) Fix Hand of the Apprentice being excluded from Universalist's free feat
* (stwlam) Remove duplicate Recall Knowledge action items
* (Tikael) Automate Aolaz Roll ability
* (Tikael) Convert roll options to kebab case
* (Tikael) Fix localization in some ChoiceSet REs
* (Tikael) Fix pluralized NPC names in compendium
* (Tikael) Fix rule elements on Necklace of Knives
* (Tikael) Remove diseases entered as equipment


## Version 4.3.4

### System Improvements
* (Cerapter) Allow effects to be hidden from players

### Bugfixes
* (In3luki) Localize skill names in Compendium Browser filter
* (stwlam) Fix crafting check rolls reporting incorrect degree of success
* (stwlam) Restore DC adjustments to inline checks from elite/weak NPCs
* (Supe) Fix damage rolls from heightened spells
* (Supe) Fix issue causing some hazard sheets to not be openable

### Data Updates
* (Abaddon) Fix unique swords from Book of the Dead
* (Abaddon) Review Blood Hag, Winter Hag, and Moon Hag, House Spirits, Huldra, Hyakume, Incutilis, Jorogumo, Kami, Kangaroo, Kappa, Kirin, Kishi, Kitsune Trickster, Kokogiak, Kongamato, and Kovintus Geomancer
* (Abaddon) Add android infiltrator automation
* (dogstarrb) Add missing Archetypes from DA, QftFF, NotGD, OoA, and BotD to Archetype Journal
* (dogstarrb) Adds links from dedication feats to archetype journal
* (MrVauxs) Correct typo in "Magic Warrior Dedication"
* (Tikael) Automate Wellspring Magic feature


## Version 4.3.3

### System Improvements
* (Forgent) Improve rotation behavior of measured template previews on hex grids
* (KSops) Add "herbal" as a consumable tag, integrate with Herbalist archetype

### Bugfixes
* (stwlam) Fix item grants being duplicated given `reevaluateOnUpdate`
* (stwlam) Default no-crowbar penalty to disabled
* (Supe) Fix spell heightening for non-casted spell messages
* (Supe) Correctly heighten spells retrieved from chat messages

### Data Updates
* (Manni) Fix targets  of Swarming Wasp Stings spell
* (rectulo) Fix the format of Phantasmal protagonist
* (Dire Weasel) Fix Staff Nexus source
* (TMun) Correct errors following statistical outlier review
* (TMun) Correct reference and text for spiked pit damage
* (Tikael) Remove old individual archetype journals
* (xdy) Add variants for bludgeoning, piercing and slashing damage to Telekinetic Projectile


## Version 4.3.2

### Bugfixes
* (stwlam) Fix upgrading existing weaknesses and resistances
* (stwlam) Fix issue causing Theather of the Mind toggles to appear when setting is disabled

### Data Updates
* (Far2Casual) Fix inline check of Acidic Poison Cloud Trap
* (Dire Weasel) Fix Peryton Heart Ripper ability
* (stwlam) Add TotM toggle for Flying Blade
* (Tikael) Fix REs and prerequisites on Hellknight Armiger Dedication
* (Tikael) Fully automate Hellknight Signifier Dedication
* (TMun) Correct action cost of Thylacine's Hunting Cry
* (TMun) Correct duration of Time Beacon
* (TMun) Correct CON modifier for Aecora Silverfire


## Version 4.3.1

### System Improvements
* (xdy) Add pf2e flags with sourceId, uuid and type to consumable-usage chat messages

### Bugfixes
* (Supe) Increase reliability of rule source lookup in grant item
* (Supe) No longer return damage dice from rule element if damage type resolving fails
* (Supe) Fix issue causing weapon item to not be retrievable from strike damage messages
* (In3luki) Fix measured template rotation triggering the browser zoom in Firefox and Edge
* (xdy) Adjust context.outcome based on result of reroll

### Data Updates
* (Abaddon) Localize Risky Surgery toggle and Dragon Claws spell effect
* (dogstarrb) Fix some details in NPCs Agents of Edgewatch 1
* (stwlam) Remove disabling of damage-doubling on crit for dragon claws effect
* (SkepticRobot) Add star grenades
* (SkepticRobot) Automate Skilled Familiar ability
* (Tikael) Add damage to Sea Surge spell
* (Tikael) Fix formulas in Phlogistonic Regulator
* (Tikael) Set Psyche trait description


## Version 4.3.0

### System Improvements
* (LebombJames) Remove double borders from some image frames
* (stwlam) Move flat-footed toggle to relevant features, add "Theater of the Mind Toggles" setting to show/hide
* (Supe) Add roll-inspector support for strike damage rolls
* (Supe) Add roll mode param to cast() function
* (Supe) Put top-level roll options at top in roll inspector

### Bugfixes
* (In3luki) Fix default width of line measured templates created from some workflows
* (KSops) Fix close button for rules editing
* (stwlam) Restore death-note icon for actions on NPC sheets

### Data Updates
* (Abaddon) Add journal page for Mummy archetype
* (Abaddon) Fix 8th level permanent items rollable table
* (Abaddon) Localize Treat Wounds macro
* (Fin) Removed outdated duplicate README.md file, Update CONTRIBUTING.md to direct contributors to the pf2e foundry discord server
* (LebombJames) Correct Greater Nosoi Charm, and touch up REs
* (LebombJames) Correct Rebounding Barrier Requirement to Trigger
* (rectulo) Add basic Reflex save in acid storm
* (rectulo) Fix key for Android trait description
* (SpartanCPA, Tikael, TMun) Add content from Kingmaker adventure path
* (stwlam) Add effect for Calculate Threats action
* (stwlam) Add inventor's innovation class features, initial armor modifications
* (stwlam) Default pregen PCs to be in party alliance
* (TMun) Add Psychic multiclass dedication feat as an option for Eldritch Trickster Rogue
* (TMun) Add variant effect to PFS earplugs and correct links between effects and items
* (TMun) Fix issue causing Eternal Wings to receive double bonuses and penalties
* (TMun) Correct aura from 5 to 10 feet for Elemental Avalanche
* (TMun) Standardize predicates for Virtuosic Performer rule elements
* (TMun) Update sly striker rule elements to function in V10
* (TMun) Add NPCs from PFS 4-05
* (Tikael) Add localization keys for some equipment effects
* (Tikael) Automate Life Oracle curse effects
* (Tikael) Fix and standardize precision damage REs
* (Tikael) Fix quantity of sacks
* (VestOfHolding) Add NPCs and player options from Crown of the Kobold King


## Version 4.2.6

### Bugfixes
* (Drental) Accommodate macros ending with single-line comments
* (stwlam) Fix aura colors getting inverted
* (stwlam) Restore setting self:condition roll options
* (stwlam) Refrain from highlighting measured templates invisible to players
* (stwlam) Fix issue causing some auras to fall behind in rendering
* (Supe) Fix double weak/elite adjustments on statistic rolls
* (Supe) Fix issue preventing modifier adjustments from applying via spellcasting attack and DC selectors

### Data Updates
* (dogstarrb) Add missing automation to Inventor Weapon Mastery
* (MySurvive) Remove some unnecessary labels from REs on equipment
* (redeux1) Updated Iconics/Pregens to use action-based Heal/Harm spell
* (Tikael) Fix rule elements on Elemental Assault effect


## Version 4.2.5

### Bugfixes
* (stwlam) Work around upstream issue introduced in 10.287 preventing execution of some macros
* (stwlam) Fix TokenImage rule element for unlinked tokens
* (stwlam) Fix issue causing multiple ability modifiers to stack for some damage rolls
* (stwlam) Restore re-rendering token HUD after mouse interactions
* (Supe) Fix predication for spell/class/save dc modifiers
* (Supe) Restore ability-based domains for spellcasting
* (Supe) Fix flat modifier editor adding critical: false to newly added rules

### Data Updates
* (JDCalvert) Automate Sentinel Dedication feat
* (stwlam) Add toggle for Ostovite's bone chariotR


## Version 4.2.4

### System Improvements
* (stwlam) Add lighting control tool to toggle GM vision
* (Supe) Add critical field to FlatModifier form

### Bugfixes
* (stwlam) Fix issue causing TokenImage rule element to fail
* (stwlam) Re-render actor directory when world actors' levels are changed
* (Supe) Fix issue causing duplicate feats/features to be created from ancestry/background/class items under certain circumstances
* (Supe) Fix strike macros

### Data Updates
* (LebombJames) Fix Mountain Quake requirement
* (Tikael) Fix usage of Crown of the Companion


## Version 4.2.3

### System Improvements
* (stwlam) Improve performance when moving multiple tokens with vision
* (Supe) Only show FlatModifier damage row for damage selectors in form

### Bugfixes
* (JDCalvert) Fix damage dice validation for damageType and dieSize overrides
* (stwlam) Prevent browser-defined default actions for CTRL-G keypress

### Data Updates
* (LebombJames) Fix Battle Oracle Curse Effect predicates
* (redeux) Fix minor errors in Iconic sheets
* (Tikael) Link Treat Wounds macro in Treat Wounds action
* (TMun) Add Damaj's Gloves


## Version 4.2.2

### New Features
* (stwlam) Add GM Vision (keybinding defaults to CTRL-G) as means of brightening dark scenes

### System Improvements
* (xdy) Show players the total bulk for Loot actors they own
* (xdy) Toggle defeated state for npcs when healed to above 0 hp when defeated

### Bugfixes
* (stwlam) Prevent multiple conditions of the same type from being created from token HUD
* (stwlam) Defer validation of damage dice overrides
* (stwlam) Fix display of level in actor directory for level-zero actors
* (Supe) Restore modifier acquisition for spell attack modifiers and DCs
* (Supe) Fix display of drag gap and mystified name in encounter view popouts
* (Supe) Fix start of turn status message

### Data Updates
* (Manni) Localize label for Pack Attack
* (rectulo) Fix prereq format in psychic duelist dedication
* (stwlam) Set range of Spined Azerketi's unarmed attack
* (stwlam) Have wild shape effect grant battle form effect
* (Surge) Remove incorrect label from Death Ward spell effect
* (Tikael) Add Hispanic Heritage Month Paizo blog items
* (Tikael) Fix inline check in Psi Burst


## Version 4.2.1

### Bugfixes
* (stwlam) Fix dropping conditions on tokens and actor sheets
* (Supe) Restore raw note functionality to `CheckPF2e`

### Data Updates
* (Abaddon) Fix nosferatu ability typo
* (stwlam) Fix predicate of RE on Orc Weapon Carnage
* (stwlam) Default toggle in Unleash Psyche effect to true


## Version 4.2.0

### System Improvements
* (Cerapter) Add support for strike attack roll substitutions
* (Forgent) Add logic to snap templates to 30 degree instead of 45 on hex grids
* (GravenImageRD) Show level in inventory item summaries and for actors in actor directory
* (GravenImageRD) Add rarity colors to player inventory items
* (stwlam) Optimize CPU usage of hearing checks
* (stwlam) Allow sound emission to be overridable for creatures via ActiveEffect-like rule elements
* (stwlam) Convert predicates to arrays (wiki will be updated with more information)
* (stwlam) Allow FlatModifier rule elements to only apply to critical damage
* (stwlam) Make GrantItem `onDelete` actions configurable
* (stwlam) Set hex-grid-suitable cone rotation increments and default angle
* (stwlam) Show scrolling text from aura-granted effects only during encounters
* (Supe) Add ability to restrict item spellcasting to scrolls only
* (Supe) Add support for class dc proficiencies for spellcasting entries
* (Supe) Allow choice-less choice sets that support homebrew items
* (Supe) Always show invest button, and equip the item to the correct slot when investing

### Bugfixes
* (In3luki) Fix rarity tag height in the Compendium Browser
* (Supe) Fix display of item uses in inventory
* (Supe) Fix inline rolls for class dcs
* (Supe) Show resistance exceptions in hazard IWR
* (Supe) Fix drag/drop of feats sometimes preventing sheet summary from opening
* (stwlam) Fix AE-likes modifying crafting entries
* (stwlam) Fix Proficiency without Level variant not reflecting untrained proficiency penalties
* (stwlam) Restore inclusion of `critical` property from DamageDice REs
* (stwlam) Work around upstream issue affecting item creation on synthetic actors
* (stwlam) Prevent duplicate fatal traits from being added to fatal-aim weapons
* (tyrielv) Fix overflow for long tag elements

### Data Updates
* (Abaddon) Add Living Graffiti variants: blood, chalk, and ink
* (Abaddon) Add clockwork creature malfunction abilities
* (Abaddon) Add sea skull swarm variants
* (Abaddon) Fix details of forsaken deities
* (Abaddon) Localize resistance exceptions from rule elements
* (Abaddon) Remove damaging-effect from marut's fists of thunder and lightning
* (Abaddon) Review Bestiary 3 NPCs: living graffiti oil, owb & owb prophet, skull swarms
* (Abaddon) localize resistance exceptions in B3 rule elements
* (avagdu) Audit Crystal Dragons
* (avagdu) Fix description of True Staff of Healing
* (avagdu) Fix weapon descriptions for BB Skeleton Warrior
* (Dana) Improve implementation of fatal dice from Student of the Staff
* (InfamousSky) Add icons to Thaumaturge class features as well as Dark Archive & Blood Lords spells
* (LebombJames) Fix Greater Thundering Rune description
* (LebombJames) Fix enervation damage
* (Manni) Correct action cost of tentacle cannon
* (Manni) Fix description of Animate Dreamer
* (rectulo) Fix the range of sturzstromer tremorsense ability
* (SpartanCPA) Add Rollable button to Gorget of the Primal Roar
* (SpartanCPA) Add feats for the Psychic Duelist Dedication
* (stwlam) Fix size of scythe embedded in cow
* (stwlam) Add rule elements to and update description of cloistered cleric's 4th doctrine
* (stwlam) Move Pilgrim Token's `tieBreakPriority` override to feat
* (Tikael) Add Kingmaker backgrounds
* (Tikael) Add missing Dark Archive and Grand Bazaar equipment
* (Tikael) Add missing item from Strength of Thousands 4
* (Tikael) Brushup spell effect REs A-C
* (Tikael) Fix rule elements on Celestial Armor
* (Tikael) Fix the title of the Fearsome rune note
* (Tikael) Fix token name of Gold Tank Broker
* (TMun) Add NPCs from PFS 4-04


## Version 4.1.3

### Bugfixes
* (stwlam) Fix issue causing migration failures on very old actors


## Version 4.1.2

### Bugfixes
* (stwlam) Fix issue causing old speed data to prevent some PC sheets from opening

### Data Updates
* (Tikael) Fix several NPC save values that were stored as strings


## Version 4.1.1

### Bugfixes
* (stwlam) Fix extraction of predicated damage dice
* (stwlam) Fix localization of non-land speeds
* (Supe) Fix detection of highest level for spell collection

### Data Updates
* (stwlam) Restore iconics' prototype tokens
* (stwlam) Fix language known by Uthuls (bestiary 1)


## Version 4.1.0

### System Improvements
* (In3luki) Update Compendium Browser text search to utilize `MiniSearch`
* (sturteva) Add spiritsense to available creature sense types
* (stwlam) Add limited support for DamageDice REs in spells (reflected in Healing/Harming Hands feats)
* (stwlam) Add support for hearing through walls that don't block sound (thanks to dev8675309 for assistance!)
* (stwlam) Incorporate V10 tremorsense detection mode
* (stwlam) Add undetected condition to token HUD
* (stwlam) Lower enforced PC ability score cap to 1 while in manual-entry mode
* (Supe) Add structured form for editing FlatModifier rule elements

### Bugfixes
* (stwlam) Fix token mirroring when scale is locked
* (stwlam) Fix issue causing secret text in journal entry text pages to become visible to players

### Data Updates
* (InfamousSky) Add Glass Skin feat
* (InfamousSky) Add cauldron of flying
* (itamarcu) Fix Blaze effect
* (SpartanCPA) Add a rollable save to Dragon's Rage Breath
* (SpartanCPA) Audit Age of Ashes book 1
* (SpartanCPA) Audit Doblagub (Extinction Curse)
* (SpartanCPA) Fix name of Legacy of the Hammer background
* (stwlam) Add critical specialization to Ruffian class feature
* (stwlam) Fix description of Fatal Aim trait
* (stwlam) Fix predicate on Precise Strike's damage dice RE
* (Supe) Add Scroll Trickster bonus to trick magic item


## Version 4.0.6

### System Improvements
* (stwlam) Skip module nags for modules with no `esmodules` or `scripts`

### Bugfixes
* (In3luki) Fix Compendium Browser order-by values getting defaulted to name
* (In3luki) Fix display of class features in the class item sheet details tab
* (stwlam) Fix issue causing predicated new movement types to always be applied to a PC
* (stwlam) Fix damage roll notes getting dropped from chat cards
* (stwlam) Fix item-drop handling on kit sheets
* (stwlam) Fix issue preventing JSON imports from V9 actors

### Data Updates
* (LebombJames) Brushup witch features and feats
* (LebombJames) Correct "Feat/Feature" in Feat Sheet Header
* (Shandyan) Automate tiefling feats
* (Shandyan) Correct Crunch feat, Runelord Specialization and remove Form of the Fiend variants
* (SkepticRobot) Add missing Dark Archive backgrounds
* (Tikael) Fix Cover effect


## Version 4.0.5

### Bugfixes
* (In3luki) Fix metagame information being stripped from message flavor before the chat message is created
* (stwlam) Work around upstream issue affecting Foundry users upgrading from V9 to 10.285
* (stwlam) Fix issue causing inline rollable links to wrongly omit repost buttons
* (stwlam) Restore aura rechecking on embedded item changes

### Data Updates
* (LebombJames) Remove outdated critical text from Wounding rune


## Version 4.0.4

### System Improvements
* (stwlam) Hide damage buttons for not-damaging weapons (e.g., Tanglefoot Bag)
* (Supe) Have ChatMessage#item return the strike weapon if available (for module usage)

### Bugfixes
* (In3luki) Fix distribute coin popup
* (stwlam) Prevent context menu from appearing on right click in status effects menu for some OS/browser combinations
* (stwlam) Include journal entries in compendium search
* (stwlam) Fix issue causing post-to-chat button to not appear for @Check expressions in journal entry pages
* (stwlam) Migrate weapon and spell resolvables in rule elements for V10 compatibility
* (stwlam) Fix persistent damage icon path
* (stwlam) Fix multiple issues causing roll notes to display with superfluous line breaks
* (stwlam) Fix obscuring sender names on chat messages when feature is enabled
* (stwlam) Fix functionality of greater darkvision with no standard darkvision

### Data Updates
* (avagdu) Update Advanced Synergy to be takable multiple times
* (Dods) Add rule elements to Skill Mastery (Rogue archetype)
* (Friz) Brushup Doblagub
* (Friz) Fix rule elements on Terrified Retreat, Feverish Enzymes, and Hellknight Dedication feats
* (SpartanCPA) Add book source citations to more feats and effects missing them
* (stwlam) Restore Fledgling Flight feat
* (Tikael) Add missing Dread runes
* (Timingila) Updated Despair aura of Khisisi
* (Xdy) Fix All-Around Vision on several NPCs

## Version 4.0.3

### Bugfixes
* (stwlam) Fix darkness adjuster rendering on scene view
* (stwlam) Update in-Foundry changelog URL to point to V10 release branch

### Data Updates
* (SpartanCPA) Fill in (book) sources on items missing them
* (TMun) Correct perception and missing darkvision on spellskein


## Version 4.0.2

### Bugfixes
* (stwlam) Work around upstream issue causing erratic canvas-rendering behavior


## Version 4.0.1

### System Improvements
* (stwlam) Add support for item drops on familiar tokens
* (stwlam) Add a basic hearing detection mode
* (stwlam) Only show repost buttons on chat messages to message owners
* (stwlam) Consolidate shallow/deep search in compendium sidebar
* (stwlam) Change default order-by for most compendium browser tabs to level

### Bugfixes
* (GravenImageRD) Show the correct item name in parentheses when mystified
* (In3luki) Fix Compendium Browser pack selection not being saved
* (stwlam) Fix removal of basic unarmed attack causing strike-index mismatching
* (stwlam) Fix composite longbows/shortbows sometimes not being recognized as equivalent to standard longbows/shortbows
* (stwlam) Fix strike drops on hotbar
* (stwlam) Fix pair of rendering issues with darkness adjuster when viewed scene is changed
* (stwlam) Fix showing limited NPCs with `actorLink`s in actor directory
* (stwlam) Fix stack overflow sometimes triggered when closing token config
* (stwlam) Fix add/remove attack proficiencies on PC sheet
* (stwlam) Update Earn Income macro to function in V10
* (stwlam) Fix grid highlighting of measured templates
* (Supe) Fix ammo not getting consumed
* (Supe) Fix display of repeating ammo on PC sheet
* (Supe) Fix error sometimes thrown on NPCs with empty descriptions
* (Supe) Fix hazard attack and damage rolls

### Data Updates
* (GravenImageRD) Add missing traits to Peachwood Talisman
* (Kuroni) Fix source of Undead Scourge equipment
* (Shandyan) Automate tengu feats
* (SpartanCPA) Add references to Coerce and buttons to Intimidation Feats
* (stwlam) Add REs to handle Flying Blade feat
* (stwlam) Remove `applyMod` from two-action Harm spell variant
* (Tikael) Fix localization of Sprite strikes
* (Tikael) Add Dark Archive Web Supplement content

## Version 4.0.0 (Beta 3)

### System Improvements
* (LebombJames) Clear search bar in compendium browser when filters are cleared

### Bugfixes
* (stwlam) Restore damage types to spell sheet
* (stwlam) Fix race condition causing kits to inflate with incorrect item quantities
* (stwlam) Fix issue causing advanced alchemy formulas to not be removable
* (stwlam) Fix compendium browser pre-filter for ancestry feats on PC sheet
* (stwlam) Disable vision options in prototype token config if RBV is enabled
* (Supe) Fix removing Elite/Weak adjustments

## Version 4.0.0 (Beta 2)

### Bugfixes
* (stwlam) Fix issue causing auras to not appear until after their source is removed
* (stwlam) Fix issue causing some AE-like rule elements to not apply
* (stwlam, Supe) Fix vision and detection modes not functioning when rules-based vision is disabled
* (Supe) Fix display and deprecation warnings in vehicle biography tab
* (Supe) Fix display of scrollbars in hazard sheet
* (Supe) Fix UI error thrown when editing hazard traits

### Data Updates
* (Dooplan) Fix level of Icewyrm
* (Shandyan) Automate strix feats


## Version 4.0.0 (Beta 1)

### New Features
* (Supe) Add "view art" button to NPC sheet for easier sharing with players
* (Supe) Render temp hp above health bar

### System Improvements
* (In3luki, stwlam, Supe) Support Foundry V10
* (LebombJames) Set compendium search box to input type "search"
* (stwlam) Move management of system user settings to user config
* (stwlam) Change default condition icons to full-color, remove legacy option
* (Supe) Retire legacy hazard sheet
* (Supe) Use tagify for editing NPC, hazard, and item traits
* (Supe) Hide sidebar on rules tab of item sheets
* (Supe) Add selector list support to FlatModifier rules element
* (Supe) Fade out combatant names in encounter if mystified
* (Supe) Improve visibility of spell preparation button for preparared casters
* (Supe) Add weapon-sheet-style material selection to armor
* (Supe) Implement Brutal trait for PCs
* (Supe) Remove "system style" journal sheet
* (Supe, Mats) Update character proficiency tab to new headers
* (Supe) Have compendium sidebar content search also match compendium names
* (Supe) Organize item types in new item dialog into groups

### Bugfixes
* (Cheps) Fix the timefilter select behavior in the spell compendium browser
* (Eddie) Allow ability score boosts at level 0
* (stwlam) Suppress fundamental runes on armor if ABP is enabled
* (stwlam) Calculate aura coverage in three dimensions
* (stwlam) Fix application of dexterity modifier cap when AC is zero

### Data Updates
* (Abaddon) Review Bestiary 3: harmona, hellwasp swarm, herexen, house drake, storm hag
* (Abaddon) Standardize capitalization of hyphenated creatures in Bestiary 3
* (avagdu) Fix localization of REs on Draconic and Wyrmblessed Bloodlines
* (avagdu) Remove Nudge Fate spell effect
* (Brandon Maier) Fix spelling of Infectious Melody, Weapon of Judgment, and Construct Mindscape spells
* (kageru) Fix several roll expressions and remove unused translation key
* (Kuroni) Fix Clockwork Macuahuitl description
* (Kuroni) Remove several errant line breaks and other formatting from item descriptions
* (rectulo) Fix feat type of Space-Time Shift
* (Shandyan) Automate suli, sylph, and undine feats
* (Shandyan) Convert Deep Backgrounds to new journal format, move Deck of Many Things text to roll tables
* (SpartanCPA) Add a link to Detect Magic in the Arcane Sense feat
* (SpartanCPA) Add inline rollable buttons for Perception, Saving Throws, Scare to Death, Disable a Device checks
* (SpartanCPA) Correct roll note for Jiang-Shi Minister of Tumult
* (SpartanCPA) Make Flat Checks rollable across packs
* (SpartanCPA) Make Thievery Checks on Handcuffs and Manacles rollable
* (SpartanCPA) Make rollable buttons across packs for remaining Skills
* (SpartanCPA) Make rollable buttons for Athletics checks
* (SpartanCPA) Make skill buttons rollable for Crafting, Perception, and Arcana
* (SpartanCPA) Move Aid and Aquatic Combat effects to Other Effects
* (SpartanCPA) Set magical tradition of NPC Change Shapes
* (SpartanCPA) Add sources to NPCs from SoT Book 4
* (stwlam) Fix category of two drake rifle variants
* (stwlam, Tikael) Retire two effects compendiums and consolidate their contents
  * "Consumable Effects" removed, contents moved to "Equipment Effects"
  * "Feature Effects" removed, contents moved to "Feat/Feature Effects"
  * "Exploration Effects" renamed to "Other Effects"
* (stwlam) Exclude invalid options (philosophies) from cleric/champion deity choices
* (stwlam) Have Hand of the Apprentice feat enlarge focus pool
* (stwlam) Fix melee/ranged status of chakrams
* (stwlam) Add spell effect for Wash Your Luck
* (stwlam) Fill out REs for dogtooth tengu
* (stwlam) Fix duration of Veil of Dreams spell effect
* (ThunderousLeft) Add no-crowbar-penalty suppression rule elements
* (Tikael) Fix description of Iris of the Sky item
* (Tikael) Convert inline links in localizations to reference UUID
* (Tikael) Clean up Oracle automation
* (Tikael) Remove old spell effects that have been consolidated
* (Tikael) Add Reborn Soul background
* (Tikael) Add Slowed condition to all zombies missing it
* (Tikael) Add automation to the Magical Experiment background.
* (Tikael) Add duration to Air Bubble spell
* (Tikael) Add localization for persistent force damage
* (Tikael) Add missing creature family abilities
* (Tikael) Add missing equipment from Knights of Lastwall
* (Tikael) Add missing passives to Vetalarana Manipulator
* (Tikael) Automate Sniper's Aim feat and Tripods
* (Tikael) Begin consolidating journals, add GM screen.
* (Tikael) Change Caterwaul Sling icon to Sling
* (Tikael) Change usage of religious symbols to held in one hand
* (Tikael) Fix Evangelize prerequisites
* (Tikael) Fix bonuses and penalties that should only apply to land speed
* (Tikael) Fix damage roll of Control Weather Spellskein
* (Tikael) Fix details of Intensify Vulnerability feature
* (Tikael) Fix feat type of Corpse Tender archetype feats
* (Tikael) Fix inline damage on Violent Unleash feat
* (Tikael) Fix inline roll in Ochre Fulcrum Lens
* (Tikael) Fix level of Thomil Bolyrius
* (Tikael) Fix alignment of Spirit Naga
* (Tikael) Fix traits of Confident Finisher and Jafaki's strike
* (TMun) Add Lost Omens: Travel Guide
* (TMun) Add NPCs from Bounty 20
