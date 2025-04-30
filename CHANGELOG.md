## 6.12.0

### System Improvements

- (Michael) Support delta inputs for health and shield hp in the character sheet
- (Supe) Convert roll inspector to application v2

### Bugfixes

- (Dire Weasel) Fix missing localized string for NPC Shield Max HP
- (Supe) Avoid persisting automated weapon property runes when closing the item sheet
- (Supe) Fix dragging and dropping persistent damage
- (Supe) Fix invisible tokens absorbing drag/drop events on the canvas
- (Supe) Fix penalties that don't double on crit such as cringe when rolling critical damage
- (Supe) Fix trick magic item spell DC when using trained or expert skills
- (Supe) Show description item alterations for effect panel tooltips and expandable self effect actions
- (Supe) Support multiple token marks instead of overriding them
- (Vauxs) Exclude eidolons from ABC Picker

### Data Updates

- (Ambrose) Add automation to Hardshell Surki and Conductive Sphere
- (Ambrose) Add missing price for Aurochs Jerky
- (Ambrose) Add options introduced in the 2025 April Fool's Paizo Blog
- (Ambrose) Condense equipment effects and add icons to equipment missing them
- (Ambrose) Correct minor issues in Paragon Medicine, Wellspring Magic, Unfolding Tree House
- (Ambrose) Update Archetype journal entry formatting, GM Screen content
- (Ambrose) Correct Inflammation Flask's damage type and update effect automation
- (Ambrose) Correct issues in Neshen and Sivanah deity items
- (Ambrose) Extend Unstable note to actions that have the `unstable` trait and add notes RE to Inventor dedication
- (Ambrose) Fix automation of Magnetic Shot
- (Ambrose) Fix issues and improve automation in several NPCS
- (Ambrose) Link various `Bloodstone of Arzani` effects to their corresponding items
- (Ambrose) Move `Triumph of the Tusk` backgrounds to their folder under Adventure Paths
- (Ambrose) Move Beginner Box Pregens backstory text to the `Backstory` section
- (Ambrose) Remove errant traits from Elemental Counter and Grasp of Droskar
- (Ambrose) Remove Cooperative Soul's prerequisite
- (Ambrose) Remove invalidated feats and spells
- (Ambrose) Update Anima Invocation spell effect to remaster rules
- (Daomephsta) Fix a few enricher syntax typos in creatures and hazards
- (Dire Weasel) Add automation for Dragon's Flight,  Magus's Analysis
- (Dire Weasel) Add bonus against fear to Effect: Swig
- (Dire Weasel) Add custom IWR to Phantasmal Minion and Armag Twice-Born
- (Dire Weasel) Add effect for Animalistic Brutality, Blessed Coins, Glimpse Vulnerability, Aurochs Jerky, and Cindergrass Cloak
- (Dire Weasel) Add effect link for Sinful Bite
- (Dire Weasel) Add initiative Note to Cloud of Allergens
- (Dire Weasel) Add predicate to Garrholdion's Belief Fortification
- (Dire Weasel) Brush up Body of Air, Mage Killer, Memory Maelstrom, and Tooth Tug
- (Dire Weasel) Fix usage of Rending Gauntlets
- (Dire Weasel) Fix action cost of Breathe Shrapnel
- (Dire Weasel) Fix action details of Aiudara Wraith, Oceanius and Glory Arcely abilities
- (Dire Weasel) Fix DC and damage of Minognos-Ushad's Wyvern Venom
- (Dire Weasel) Fix missing toggle in Furious Headbutt
- (Dire Weasel) Fix senses of Overgrown Viper Vine
- (Dire Weasel) Improve automation of abilities on Yurgak, Spriggan Warlord, Garrholdion, Tarn Linnorm
- (Dire Weasel) Redirect FotRP Manananggal to LO:TXWG
- (Dire Weasel) Refresh all copies of Divine Wrath and True Target on NPCs
- (Dire Weasel) Tidy description formatting of Nugrah's Swift Summon
- (Dire Weasel) Update legacy Guiding Words effect to use TokenMark
- (Dire Weasel) Update some NPC senses to structured data
- (Dire Weasel) Update Whirlwind area to be a cylinder
- (In3luki) Correct `Effect: Renewed Vigor` choice set prompt
- (Intervencion) Add missing properties to Morning Glow
- (kromko) Fix some creature skill modifiers, clean up Beginner Box creature senses
- (kromko) Fix Spirit Powers effect RE prompt label
- (kromko) Relabel Rallying Charge feats to indicate the archetypes
- (rectulo) Fix format of Activate in a few items without <strong>
- (Rigo) Add effects for Tripartite Omen, Vellumis Excision, and Cenotaph Stance
- (Rigo) Add holy or unholy traits to Relentless Reaction damage accordingly
- (Rigo) Add inline healing, notes and effect to Lepidstadt Surgeon Dedication
- (Rigo) Add missing bow group note for Grievous rune
- (Rigo) Add missing predicate to initiate benefit Grant Item in Thaumaturge implements
- (Rigo) Add notes for half damage on a failure to legendary saves features
- (Rigo) Add sanctification and conditional expert Stealth to Red Mantis Assassin dedication
- (Rigo) Add True Target spell effect
- (Rigo) Automate several Campfire Chronicler features, Sash of Books's Recall Knowledge activation
- (Rigo) Change Barghest Acrobatics skill into Athletics
- (Rigo) Change Beginner Box actor ids to match their Monster Core equivalents
- (Rigo) Change Redcap's halberd base damage to piercing
- (Rigo) Clean up rule elements on unstable function actions
- (Rigo) Correct selectors in an Abomination Vaults item's effect
- (Rigo) Correct size of Arrester Squadron and Watchmage Squadron to gargantuan
- (Rigo) Fix In Lightning, Life effect formula scaling and link effect in the feat
- (Rigo) Implement Speak for the Gravelands with Geomancer archetype automation
- (Rigo) Improve automation of Irongut Goblin, Virtuous Tanuki, and Flash of Grandeur
- (Rigo) Include Hero Point Deck rules in its journal
- (Rigo) Remove Fast Movement and Diverse Armor Expert feats
- (Rigo) Rename and link Swallow Whole effect to include Engulf
- (Rigo) Update Toxicologist's Field Benefit toggle label to be more informative
- (Tikael) Add content from Claws of the tyrant
- (Tikael) Condense Lost Omens Bestiary compendiums
- (Tikael) Fix several issues in Shades of Blood and PFS actors
- (Tikael) Implement spring errata
- (Tikael) Improve automation of Freeze, Ooze, and Elemental Ammunition
- (Tikael) Move Fox Arson to use item bonus instead of potency rune
- (Vauxs) Add True Dragon's Flight speeds
- (Vauxs) Change Dragon Instinct pre-remaster dragons to arcane tradition
- (Vauxs) Remove Enlarge from Major Clay Sphere

### Under the Hood

- (Supe) `@Check` roll's overrideTraits parameter now supports a list of traits
- (Supe) Fix retrieving origin when saving against an actor without a token

## 6.11.1

### Bugfixes

- (stwlam) Fix issue where duplicate conditions may create duplicate description appends

### Data Updates

- (Ambrose) Clean up text for Oracle Mysteries, Animist Apparitions, and certain Magus features
- (Dire Weasel) Add localization for Other usage
- (kromko) Fix Beginner Box Caligni Hunter saving throws
- (Rigo) Restore some deleted Menace under Otari actors and undo their redirects

## 6.11.0

### System Improvements

- (Supe) Add auxiliary action for parry in the strikes list
- (Supe) Show conditions and effects in simple NPC sheet
- (Supe) Show equip status when viewing actor sheets using observer permissions

### Bugfixes

- (Dire Weasel) Fix ChoiceSets not including variant Handwraps of Mighty Blows
- (stwlam) Always set flags for null-selection choice-sets
- (stwlam) Fix handling of `allowNoSelection` in ChoiceSet REs
- (stwlam) Prevent effect panel from blocking canvas inputs when clicking in the empty area
- (stwlam) Prevent duplicate rule applications from overlapping conditions
- (Supe) Fix class archetypes like runelord prompting for suppressed features like arcane thesis
- (Supe) Fix spell consumable item activations when at least one fails validation
- (Supe) Fix spell variants with breakpoint heightens always max heightening when cast without a rank
- (Supe) Get origin data when dragging effects from the actor sheet
- (Supe) Show spell traditions in description again for unowned actors

### Data Updates

- (Abaddon) Fix various missing sources
- (Ambrose) Add `Hunting Spider Venom` to Remaster changes journal and improve grammar on class kit entry
- (Ambrose) Add damage note to the Confused condition
- (Ambrose) Add effect to Wrathful Storm
- (Ambrose) Add Sanguinomancer entry to the Archetype journal
- (Ambrose) Add Stunning Appearance Note automation for Startling Appearance (Vigilante)
- (Ambrose) Condense several equipment effects
- (Ambrose) Fix statistics on several NPCs
- (Ambrose) Update `Ranger Expertise` class feature to account for Vindicator Class Archetype
- (Ambrose) Update Class archetype class features and corresponding journal entries
- (Ambrose) Update Dragon Form Spell heightening text to match Player Core and add scaling to Breath Weapon inlines
- (Ambrose) Update Illusory Shroud spell effect description
- (Ambrose) Update Tempest Gaze automation
- (Dire Weasel) Add effect for Sage's Analysis, Snap Out of It! (Marshal)
- (Dire Weasel) Add effects and other improvements for NPC Core actors
- (Dire Weasel) Add some missing condition links
- (Dire Weasel) Brush up Bonds of Iron NPC ability
- (Dire Weasel) Fix action type and cost of Distracting Performance
- (Dire Weasel) Fix resistances for Dragon Shape feat
- (Dire Weasel) Link self effect to Reflective Ripple Stance
- (Dire Weasel) Remove self-reference from Tumble Through action description
- (In3luki) Fix spell category filter in Compendium Browser
- (Intervencion) Remove Improved Grab from Fungal Flytrap's Focused Assault
- (Korin) Update Vishkanyan language to Vishkanya
- (kromko) Fix Elemental Magic RE localization keys
- (Michael Luger) Fix minor typo in Far-Flung Fetch
- (MrVauxs) Fix Kholo Weapon Familiarity
- (ottyn) Add missing spell statistics to additional NPC Core Actors
- (rectulo) Add TraitDescriptionShade in en.json
- (rectulo) Delete Perpetual potency class feature in Alchemist Class in journals
- (rectulo) Fix a typo in witch lessons
- (rectulo) Fix description of Investigator in journals
- (rectulo) Fix description of revolutionary innovation
- (rectulo) Fix traits of summoning handscroll
- (Rigo) Add Aid degree of success adjustment to Headbands of Translocation
- (Rigo) Add Asmodeus' divine font
- (Rigo) Add effect for Coven Spell's status damage to spells
- (Rigo) Add effect for Hero Point Deck's Press On and fix Class Might's Flat Modifier
- (Rigo) Add effects to track remaining air and Swallow Whole
- (Rigo) Add immobilize on critical success to Tangle Vine effect
- (Rigo) Add increased Oath of the Defender's champion's resistance
- (Rigo) Add Lead Constitution to Gunslinger's granted features
- (Rigo) Add links to Fireball in Firestarter Pellets
- (Rigo) Add missing price to Steadfast Sentinel
- (Rigo) Add missing spell statistics to Demonologist
- (Rigo) Add NPC attitude-tracking effect
- (Rigo) Add PFS 3/25 clarifications for Rival Academies
- (Rigo) Add reminder notes to deafened, grabbed, restrained and sickened conditions
- (Rigo) Add resistance on a success to Anima Invocation's spell effect
- (Rigo) Add Strategic Strike dice number increase to Palatine Strike
- (Rigo) Extend ruffian's critical specialization to all sneak attack-qualifying weapons
- (Rigo) Grant Spellstrike with Spellstriker feat
- (Rigo) Implement Horn of Plenty's daily crafting
- (Rigo) Link Powerful Leap and Quick Jump in Leap the Falls
- (Rigo) Move Tome Implement's Recall Knowledge improvement from Adept to Paragon benefit
- (Rigo) Move trait Adjust Strike rule elements to Item Alteration
- (Rigo) Remove `dice:slug:base` predicates in favor of using slug field
- (Rigo) Remove check and speed penalty, and strength requirement from Reinforced Chassis
- (Rigo) Remove remaining rule element-based implementation of Apex items
- (Rigo) Tag Runelord sin and curriculum spells for Rod of Rule and Sinbladed Spell automation
- (Rigo) Update Bands of Force's Flat Modifier slug
- (Rigo) Update Entreat Spirit effect to choose an int-, wis-, or cha-based skill
- (Rigo) Update Reinforced Chassis AC bonus alteration to be additive with other increases
- (Supe) Automate bonus increase for Flowing Palm Deflection
- (Tikael) Add automation to Sojiruh's Manifest Armor ability
- (Tikael) Add damage to Hypnopompic Terrors spell
- (Tikael) Add unarmed trait to unarmed NPC strikes
- (Tikael) Automate Sanctified Soul and Heaven Rains an Ending
- (Tikael) Change instances of metamagic in descriptions to spellshape
- (Tikael) Clean up Champion deity rule elements
- (Tikael) Clean up Eldritch Trickster implementation
- (Tikael) Fix activation wording on high level Symbol of Conflict
- (Tikael) Fix scaling on Shard Strike bleed damage
- (Tikael) Improve automation of Vapor Form spell effect
- (websterguy) Fix Enlarge and Enlarge Companion effects to apply bonus to all melee damage
- (websterguy) Update Change Formation icon to Two Actions
- (websterguy) Use melee and ranged selectors instead of predicates where possible
- (Weion) Improve automation of Drake Rifle

## 6.10.2

### Bugfixes

- (stwlam) Fix issue causing feats with trait-toggle data to fail to initialize

### Data Updates

- (Abaddon) Fix Fated Duel description
- (Ambrose) Condense Potency Crystal equipment effects
- (Ambrose) Improve automation workflow for Elementalist Class Archetype
- (Dire Weasel) Preselect Assurance choice for some backgrounds

## 6.10.1

### Bugfixes

- (In3luki) Restore preparation of subfeature key attribute options
- (stwlam) Fix issue in feat data model sometimes setting invalid action cost
- (Supe) Add creature identification skills for dream, shade, and time
- (Supe) Fix mystifying compendium items when drag-and-dropping with ALT key held
- (Supe) Restore showing effects that hide token icons from the effects panel

### Data Updates

- (Ambrose) Condense Pickled Demon Tongue and Polished Demon Horn equipment effects
- (Ambrose) Correct Read Aura link in the Greed (Runelord) class feature
- (Ambrose) Correct description text for the Simulacrum's key ring item
- (Ambrose) Correct formatting for Auldengrund Grimcarver's Simulacrum ritual
- (Ambrose) Correct predicates for Flurry Edge MAP Rule Elements
- (Ambrose) Correct Rancorous Priesthood's max focus pool points
- (kanongil) Add rules to handle Armored Stealth penalty adjustment
- (kanongil) Remove Shields of the Spirit effect if shield is no longer raised
- (Rigo) Push Slinger's Precision Martial Proficiency priority to after other proficiency upgrades
- (Rigo) Update broken links in Troop Defenses' localization

## 6.10.0

### Highlights

- (Ambrose, Mecha Maya, Rigo, SpartanCPA, Tikael) Add content from NPC Core and Lost Omens Rival Academies

### System Improvements

- (stwlam) Include original english name in ABC picker searches
- (Supe) Omit showing effects that hide token icons from the effects panel
- (Supe) Support sending kingmaker army war actions to chat
- (Trent) Provide a subtitle with actions when using lores

### Bugfixes

- (Ben Potter) Fix attaching items to anything except the first result
- (In3luki) Fix character sheet freezing when adding effects that grant a nested condition
- (stwlam) Allow use of search inputs by observers on non-editable actor sheets
- (stwlam) Apply damage alterations to elemental-blast damage
- (stwlam) Fix consumption of ammo for double-barrel weapons
- (stwlam) Fix registration of GM Vision keybind for macs
- (Supe) Fix incrementing and decrementing kingmaker army effects
- (Supe) Fix updating kingmaker army description and swap to prosemirror
- (Supe) Hide aura texture when token is GM hidden

### Data Updates

- (Abaddon) Change usage for sniper's bead
- (Abaddon) Fix Expert Beast Gunner Spellcasting prerequisite
- (Abaddon) Fix Ghostshot Wrapping and Silver Tripod usage
- (Abaddon) Fix shadow blast saves and add damage rolls
- (Abaddon) Fix vampire mastermind's dominate ability
- (Ambrose) Add automation to Cloud Dragon's Deflecting Cloud reaction and Terror Bird's Tearing Clutch damage
- (Ambrose) Add effect to Read Aura and Tangling Creepers
- (Ambrose) Add initiative note for Shift Immanence
- (Ambrose) Add inline check for Scare to Death's critical success Fortitude save
- (Ambrose) Add missing fear immunity to Scarecrow actor
- (Ambrose) Apply `Token Mark` to Hunt Prey action and associated feats and effects
- (Ambrose) Apply description alterations to select Ranger feats
- (Ambrose) Automate Awakened Yaoguai Heritage Feat
- (Ambrose) Condense several consumable equipment effects
- (Ambrose) Fix heightening for Rose's Thorn
- (Ambrose) Fix traits in Declare Anathema feat and Ripnugget's Devastating Blast ability
- (Ambrose) Redirect old actors to their NPC Core and Monster Core equivalents
- (Ambrose) Remove (or add) inline checks and damage rolls for spells
- (Ambrose) Remove `dedication` trait from Spell-Woven Shot feat
- (Ambrose) Update rule elements and inline automation on several alchemical bombs
- (Ambrose) Update rules on Ultimatum of Liberation and Entreaty Spirit effects
- (Ben Potter) Fix some spellheart and talisman usages
- (CrackJackFlood) Update Necklace of Knives and Druidic orders
- (CrackJackFlood) Update Sanguine Klar items to include their runes
- (Dire Weasel) Fix some BattleForm ranged attack increments
- (Dire Weasel) Fix some localized strings
- (Dire Weasel) Remove superfluous RE from Burning Mammoth Longshield's copy of Shield Boss
- (dotadd) Add scaling to Curse of Death
- (Kulkodar) Add missing hooded lantern interact automation
- (kromko) Add translation to item currency values and parsing
- (kromko) Fix difficult terrain size in Lesser Pernicious Spore Bomb description
- (kromko) Improve Arcane Slam enhancement formatting
- (kromko) Improve Detective Readiness automation
- (kromko) Update Temporal Distortion description to match LODM
- (RakuJa) Fix DC data on several actors
- (reaperzeus) Add GrantItem RE for Raise a Shield to Shields of the Spirit spell effect
- (rectulo) Fix format of Kneel Before the Rightful Heir
- (rectulo) Fix the description of Apparition's Reflection feat
- (Rigo) Automate Improved Elemental Blast
- (Rigo) Implement Slinger's Precision's combination weapon's melee configuration proficiency
- (Rigo) Include "Black Powder (Dose)" in Munitions Crafter's Crafting Ability
- (Rigo) Push priority of weapon innovation fire damage toggle to after overdrive roll options
- (Rigo) Restrict slinger's precision damage dice to non-repeating firearms
- (Rigo) Update Unstable critical failure damage and DC to remaster
- (SpaceYeti) Add class predicate to Oracle Ashes and Time mysteries
- (SpartanCPA) Fix name of Bramble Champion Construct
- (SpartanCPA) Localize Hunt Prey "First Attack" on NPCs
- (SpartanCPA) Move AP, pregen, and one shot actors into compendium folders
- (stwlam) Remove remaining instances of "Open" trait
- (Suldrun45) Add automation to Dragonblood Paragon for Venomtail Kobolds
- (Supe) Fix formatting of the kingmaker army outflank condition
- (Tikael) Add effect for Umbral Dragon's Drain Vigor
- (Tikael) Add Thrown 50 ft trait
- (Tikael) Automate Wisp Resonance Aura
- (Tikael) Standardize Lost Omens publication data to match licenses
- (TMun) Add NPCs and one effect for Quest 23

### Under the Hood

- (stwlam, Supe) Convert more actors and items to data models
- (stwlam) Add option to make proficiency created by `MartialProficiencyRuleElement` invisible
- (stwlam) Add item roll options for original weapon usage and combination weapon siblings
- (stwlam) Add support for token ring `effects` field in `TokenImage` RE
- (stwlam) Include item roll options in cloned statistic used for inline `against` expressions
- (Supe) Add support for disabling special resource renewal

## 6.9.0

### Highlights

- (Ambrose, Rigo, kromko, Randommisha13) Update Guns & Gears content to remaster

### System Improvements

- (Kulkodar) Add tooltips to the item sheet traits
- (Supe) Remove expired copies of an effect when adding a new one

### Bugfixes

- (Supe) Fix certain description overrides in some items like the spellcasting repertoire class feature
- (Supe) Fix consumables retaining arrow stack behavior when changing from the ammo category
- (Supe) Fix kingdom army stats being incorrect on levelup if there were temporary bonuses or penalties

### Data Updates

- (7H3LaughingMan) Correct critical failure persistant damage for Whispers of the Void
- (Abaddon) Add change shape ability to ifrit
- (Ambrose) Add effect to Bone Flense spell
- (Ambrose) Add Grab action to Raja-Krodha
- (Ambrose) Add missing details to Magus' Arcane Spellcasting class feature
- (Ambrose) Add vitality weakness to Arms of the Drowned
- (Ambrose) Correct action cost for Fire Scamp's Flame Breath action
- (Ambrose) Correct rarity to Grub Gloves
- (Ambrose) Fix Emotionally Unaware penalty so it doesn't apply on initiative rolls
- (Ambrose) Update Aquatic Combat and Crystal Shards to match to match Player Core and errata
- (Ambrose) Update Explosive Arrival automation and add `area-damage` option to localization strings
- (Ambrose) Update predicate for Daydream Trance
- (Dire Weasel) Add automation for Frost Fair Yanyuedao
- (Dire Weasel) Add some links and emphasis for harm and heal spells
- (Dire Weasel) Adding missing 7th rank entries to Atmospheric Staff (Major)
- (Dire Weasel) Fix action cost of Darkened Forest Form and Discomfiting Whispers
- (kromko) Fix a few area-effect checks
- (MrVauxs) Update Crunch to use DamageAlteration
- (rectulo) Fix format of spell in rivethun devotion feat
- (Rigo) Add missing prerequisite to Empiricist's Eye
- (Rigo) Add spell effect for Scintillating Safeguard
- (Rigo) Apply Flowing Spirit Strike's penalty to gleaming blade only
- (Rigo) Implement 2/25 PFS Rulings & Clarifications
- (Rigo) Link effect in Heroic Recovery's spellshape Item Alteration
- (Rigo) Remove Dazzling Brilliance from variant glass golem
- (Rigo) Restrict Regalia's flanking override to paragon Benefit
- (SpartanCPA) Adjust aura for Warsworn
- (SpartanCPA) Move DamageDice die size overrides to DamageAlteration
- (Tikael) Fix Gate's Threshold localization

## 6.8.5

### System Improvements

- (nikolaj-a) Add circumstance modifiers from climb and swim speeds to related actions
- (Supe) Support deltas in special resource input
- (Supe) Improve performance of mergeable sub options

### Bugfixes

- (MrVauxs) Fix Craft not using the right skills rank
- (stwlam) Fix adding settlements in the kingdom sheet
- (stwlam) Localize self effects by using compendium indices to fetch names
- (stwlam) Rewrite creation of IWR labels to allow for any number of `exceptions` or `doubleVs`es
- (Supe) Fix rendering character sheet when subitems of different items share the same id
- (Supe) Fix rolling vehicle fortitude saves
- (Supe) Fix stacks of items being bulk adjusted on vehicle actors

### Data Updates

- (Abaddon) Fix effect link for Perfect Droplet (Major)
- (Ambrose) Add `area damage` and `area-effect` options to Breath Weapons in the bestiary
- (Ambrose) Add icons to multiple Equipment items
- (Ambrose) Add inline checks to Darmudiel's Vengeance hazard
- (Ambrose) Apply `/act` version of Disable a Device on select actions and NPC inline rolls
- (Ambrose) Remove level 7 reach increment for Deer antler and Frog tongue from Animal Instinct class feature
- (Ambrose) Set Shield of the Unified Legion as specific magic shield
- (Ambrose) Set Stench aura radius to 30 feet on Ofalth
- (Ambrose) Update Brimorak, Khurfel, and Oppali npc actors
- (Ambrose) Update mythic entries in the archetype and gm screen journals
- (Brendan Graham) Fix scaling of Stoke the Heart spell effect
- (Dire Weasel) Add `area damage` and `area-effect` options to some inline rolls
- (Dire Weasel) Add effect for Blade of Four Energies
- (Dire Weasel) Fix action type of Clone Risen and Miror Risen feats
- (dotadd) Correct monster warden circumstance bonus
- (In3luki) Fix SVG errors in firefox by setting explicit height and width attributes
- (kromko) Cleanup Blightburn Bomb description
- (kromko) Fix Blade of Four Energies (Greater) potency in the description
- (kromko) Fix some item description formatting
- (kromko) Fix Staff of Nature's Vengeance crafting requirements
- (Nomad) Fix feat description in Scion of Domora archetype journal
- (rectulo) Fix category of defend our union feat
- (rectulo) Fix description of seize identity spell
- (rectulo) Fix source of frost fair yanyuedao

### Under the Hood

- (KaitoKuroba) Add range-increment and range-max to ItemAlteration
- (stwlam) Extract modifier adjustments for weapon/attack potency bonus
- (Supe) Prevent having conflicting sets of origin options for non-saves

## 6.8.4

### Bugfixes

- (Supe) Fix viewing spells with variants from compendium browser

### Data Updates

- (Ambrose) Add persistent damage to Channel Rot
- (Ambrose) Add spell links to some Summoner class feats
- (Dire Weasel) Add effect for Goz Mask (Major)
- (ottdmk) Fix level of Moderate Chromatic Jellyfish Oil
- (Redstone Flux) Fix damage of Spray of Stars
- (Tikael) Remove rule element from Hideous Ululation

### Under the Hood

- (Cerapter) Extend ItemAlteration to support changing base damage dice number

## 6.8.3

### System Improvements

- (Supe) Sort weapon and armor property runes in the item sheet dropdowns

### Bugfixes

- (Supe) Avoid feat being dislodged when drag dropping to the same spot
- (Supe) Fix issue where a spell could have duplicate description notes
- (Supe) Fix weapon striking rune being overriden by temporary versions when closing the item sheet

### Data Updates

- (Ambrose) Add Alchemical tag to Elixir of Gender Transformation
- (Ambrose) Automate the Lightless Litheness Fetchling feat
- (Ambrose) Condense effects for Numbing Tonic and Rainbow Vinegar
- (Ambrose) Tag more Breath Weapons as area damage
- (Ambrose) Update journals with missing witch patrons
- (Ambrose) Update Vaccine item to match Treasure Vault
- (kromko) Fix Magical Scrounger description
- (Najin-Alex) Add bonus type for Grub Gloves
- (reyzor) Add Deathdrinking effects

## 6.8.2

### System Improvements

- (stwlam, Supe) Minor performance improvements in actor data preparation
- (Supe) Add support for changing prepared quantities from the formula picker
- (Supe) Show item image for character sheet actions with use buttons and non-default images

### Bugfixes

- (In3luki) Fix Compendium Browser trait filter losing "not" state of selected traits
- (stwlam) Fix issue causing propulsive weapons to sometimes have dex-based attack statistics
- (Supe) Fix incorrect versatile vial level when recreated via sidebar update
- (Supe) Fix versatile vials being created twice when alchemist is added

### Data Updates

- (7H3LaughingMan) Update Instinctive Strike to remaster
- (Abaddon) Fix predicate on winglet flight
- (Ambrose) Add `Alchemical Food` tag to Iron Wine and icons to select Alchemical foods
- (Ambrose) Add automation for Fighter and Vindicator skills
- (Ambrose) Apply remaster theme to several tables in item descriptions
- (Ambrose) Condense effects for several pieces of equipment
- (Ambrose) Correct errors in Cloak of Waves and Clouds, Quick Recovery, Stupefy, The Oscillating Wave, and Verex-That-Was
- (Ambrose) Correct Daemon Form spell to match Fall 2024 errata
- (Ambrose) Improve automation for the Stupefied condition and Pathfinder Society Boons
- (Ambrose) Improve automation of Witch's Armaments, Nosoi Charm, Obsidian Goggles, Fey Ascension, and Cloak of Elvenkind
- (Ambrose) Remove duplicate Ash mystery
- (Ambrose) Update ancestry, class, and archetype journals with new information and organization
- (Ambrose) Update automation for Prey for Death actors, Temperbrand, and dragons
- (Dire Weasel) Add rename of Glyph of Warding to Rune Trap to remaster journal
- (Dire Weasel) Add effect for Imp Shot and Tempest Touch, improve automation for Spark Dancer and Hellfire Breath
- (Dire Weasel) Add inline skill checks to Trick Magic Item, Evangelize
- (Dire Weasel) Add Palace Echoes Kitsune to Kitsune jounal
- (Dire Weasel) Assign Quinn's background attribute boosts
- (Dire Weasel) Clean up descriptions for Divine Font, Wildspell Dedication
- (Dire Weasel) Fix action type and cost of Regurgitate Mutagen
- (Dire Weasel) Fix rarity for Armored Coat
- (Dire Weasel) Fix inline roll in Kyonin ancestry Feats
- (Dire Weasel) Fix wording of Ignition's melee persistent fire damage link
- (Dire Weasel) Replace lower-resolution system icons with identical core icons
- (Dire Weasel) Update gnoll and grippli trait descriptions for remaster
- (In3luki) Add roll notes to Skunk Bombs
- (Intervencion) Remove "Steal" inline from Greater Shadow's Steal Shadow description
- (KaitoKuroba) Fix update mechanic on RollOptions with merged suboptions
- (kromko) Add Demon Hunter prerequisite to Demon Slayer feat
- (kromko) Fix error in Spirit Warrior archetype journal
- (MrVauxs) Fix typo in Moderate Ablative Armor Plating effect
- (Najin-Alex) Add area damage options to several inline rolls
- (Randommisha13) Fix Versatile Vials having item bonus to attack rolls before level 4
- (rectulo) Fix description in arcane spellcasting (magus) and Razmiri Mask
- (Rigo) Add expert kineticist proficiency to Expert Kinetic Control
- (Rigo) Add Note to Grievous Blow and Brutal Finish, and potency rune bonus to Core Cannon effect
- (Rigo) Add precious material selection to Counterclockwork Focus
- (Rigo) Add weapon selection and proficiency to Echo of the Fallen and Accept Echo
- (Rigo) Condense Fast Movement familiar ability
- (Rigo) Remove HP and BT from Glass Shield's spell effect per Summer 2024 Errata
- (Rigo) Remove unused adept and paragon implement tags
- (Rigo) Update Extra Alchemy's rule element to execute after Advanced Alchemy slot upgrades
- (Rigo) Use config suboptions for Tome's initiate benefit
- (Tikael) Automate the Battleblooded and United Assault feats
- (Tikael) Fix kineticist junctions
- (TMun) Correct rarity of Shadow Manse from Uncommon to Rare
- (xdy) Update descriptions of Sigil and Heal Mount to use the remastered term rank, rather than level

### Under the Hood

- (In3luki) Include failing property path in `RuleElementPF2e#resolveInjectedProperties` warning
- (Supe) Support suboptions from config in roll option rule element

## 6.8.1

### System Improvements

- (reyzor) Add search to other actor inventories
- (Supe) Stack items created via quick alchemy with equivalent held items that have 0 quantity
- (Supe) Hide prepared craft button if expended

### Bugfixes

- (In3luki) Fix compendium browser trait exclusion sometimes erroneously returning zero results
- (stwlam) Check against exceptions when applying precision resistance/weakness
- (Supe) Fix issues with Thaumaturge and Kineticist when increasing levels by a large number
- (Supe) Prevent recursively creating a resource by expending that same resource

### Data Updates

- (Ambrose) Apply `@Embed` to additional entries in the Archetype journal
- (Ambrose) Condense Five-Feather Wreath Armor, Grim Sandglass, and Mantle of the Magma Heart effects
- (Ambrose) Correct K'Zaard the Drover's Back Pedal AC bonus
- (Ambrose) Correct Ka Stone localization path and string
- (Ambrose) Remove spellcasting progression table from Sorcerer Spellcasting class features
- (Ambrose) Update Debilitating Bomb automation
- (Ambrose) Update Mantle of the Unwavering Heart spell effect automation
- (Ambrose) Update select Beastkin Ancestry Feats
- (Dire Weasel) Tag some damage as fall damage
- (kromko) Add Poisoner Dedication to Chemical Contagion prerequisites
- (kromko) Fix Devil Form Vordine effect link, Fix Demon Form Abrikandilu note RE localization key
- (LebombJames) Add Range increment sizes to ranged weapon infusion suboption labels
- (Rigo) Add description addendum to Heroes' Call's Heroism
- (Rigo) Add effects for Prey Mutagen and Mutagenist's Field Benefit
- (Rigo) Add inline healing toggleable upgrade for Chirurgeon's Greater Field Discovery
- (Rigo) Add precious material selection for Bomber's Advanced Vials
- (Rigo) Add spellcasting proficiency upgrade to Graceful Legend
- (Rigo) Condense rule elements and remove unlocalised label on Emotionally Unaware
- (Rigo) Fix description formatting and add icon to Vigilant Eye
- (Rigo) Fix embedded description on Magus class journal
- (Rigo) Fix the range increment in several alchemical bombs
- (Rigo) Remove link to prone condition in Brush Thylacine description
- (Rigo) Update Snare feats and Gadget Specialist feats
- (Rigo) Use Item Alteration instead of Damage Alteration for Bomber Field Vials
- (xdy) Update Signature Spell Expansion to use Player Core 2 text

### Under the Hood

- (LebombJames) Don't await document create/delete in effect macros

## 6.8.0

### Highlights

- (Supe, Rigo) Update Alchemist to remaster rules. You'll need to drag the class in again for the new version.
- (In3luki) Convert CompendiumBrowser to ApplicationV2 and a new rendering framework for better performance
- (Rigo) Add basic support for physical implement items for Thaumaturge. Due to a current limitation, if rebuilt from level 0, advancement should be done in steps: from level 0 to 5, from 5 to 15, and from 15 to 20, as certain selections need to be made to inform future ones.

### System Improvements

- (ceejii) Show skill replacements before medicine in treat wounds dialog
- (In3luki) Load all available compendium packs by default in the Compendium Browser
- (stwlam) Exclude already-possessed heritages in heritage choice sets
- (Supe) Add formula picker to prepared crafting abilities such as advanced alchemy
- (Supe) Add search filter to inventory and adjust invested styling
- (Supe) Bind newly created item macros to the actor that owns that item for linked actors
- (Supe) Show common language first in party sheet
- (Supe) Support updating the quantity of individual items in prepared crafting abilities such as Advanced Alchemy
- (Supe) Update design of known formulas in the crafting tab

### Bugfixes

- (Codas, stwlam) Fix memory leaks present in many sheets
- (Supe) Fix chat token images blocking saves posted to chat
- (Supe) Fix transfer quantities of 4 digits or more overflowing in the transfer item dialog

### Data Updates

- (Ambrose, Rigo, Tikael) Incorporate Fall 2024 Errata
- (7H3LaughingMan) Talon Stance now uses Talon image
- (Abaddon) Add prerequisites to harrower feats
- (Abaddon) Fix waterlogged source
- (Alexander Youngblood) Include applicable bonuses and penalties in battle form unarmed modifier comparison
- (Ambrose) Add automation to Lighter than Air Oracle feat
- (Ambrose) Add Howl of the Wild feats to Beastmaster Dedication Journal entry
- (Ambrose) Add Infectious Melody spell effect variants
- (Ambrose) Add localized notes to Wild Witch's Armaments feat
- (Ambrose) Add note item alteration to Uplifting Winds druid feat
- (Ambrose) Brush up additional Spell Effect descriptions
- (Ambrose) Condense Animal Swiftness, Clay Sphere, Desolation Locket, Dragon's Blood Pudding, Dragon Turtle Scale, Exsanguinating Ammunition, Flaming Star, Ghost Planchette, and Mantle of the Frozen Heart spell effects
- (Ambrose) Correct Spirit Striking localization in Exemplar Class journal entry
- (Ambrose) Correct Talos Gadgeteer's gadget inventory selection
- (Ambrose) Localize Magical Fortitude class feature text and update description text for Arcane Thesis and Mystery class features
- (Ambrose) Redirect Aphorite and Ganzi versatile heritages to Nephilim
- (Ambrose) Remove effects from Eye of the Unseen
- (Ambrose) Update automation for Ancestry flight-granting feats
- (Ambrose) Update Domains journals and add Oracle Mysteries
- (Ambrose) Update Gale Blast heightening to match Player Core 2
- (Ambrose) Update multiple archetype journal entries and add more embeds
- (Ambrose) Update multiple deities and their descriptions
- (Ambrose) Update multiple Spell Effect descriptions
- (Ambrose) Update rule elements on Ka Stone and Expeditious Advance
- (Anase Skyrider) Correct Greatpick and Pilgrim's Token price
- (CaptainWonders) Fix Kashrishi climbing feats
- (Dire Weasel) Add damage to Gust of Wind
- (Dire Weasel) Add inline links to Cat's Eye Elixir
- (Dire Weasel) Convert UUIDs for deity spells
- (Dire Weasel) Fix action cost of Steal Face
- (Dire Weasel) Fix description formatting for Shadow Leap
- (Dire Weasel) Refresh copies of Black Tentacles
- (Dire Weasel) Update automation of SoG Pilgrimage Gifts
- (Dire Weasel) Update automation of Werecreature, Wild Mimic, and Zephyr Guard archetypes
- (Intervencion) Fix typo on Rhysaphin's Greater Flameheart Weapon
- (kromko) Fix Sublime Breath Feigned Strike strike name
- (kromko) Fix Wisp Chain variants descriptions
- (kromko) Make alternate mythic rules tier label localizable
- (kromko) Remove trailing whitespace in many pack entries
- (kromko) Rename Hellknight Signifier to Signifer in feat prerequisites
- (kromko) Replace Blast Resistance Note RE with DoS adjustment, Remove Tide Hardened Note RE
- (Manuel Hegner) Alter versatile vial traits with bomber class feature
- (Manuel Hegner) Fix pillow shield ac bonus
- (Marius) Update Fresh Ingredients feat
- (rectulo) Fix librarian staff greater description
- (reyzor1991) Add Left-Hand Blood Effect
- (Rigo) Add alchemical tool and alchemical food consumable tags
- (Rigo) Add alternate amp and effect for Mind's Light Circlet
- (Rigo) Add area heightening to Thunderburst
- (Rigo) Add automation for multiple thaumaturge implements
- (Rigo) Add condition links to Curse of Turbulent Moments
- (Rigo) Add crane wing attack penalty to Crane Flutter
- (Rigo) Add effect for Extra Alchemy familiar ability
- (Rigo) Add effect for Instructive Strike and automate Implement's Flight
- (Rigo) Add effects for Manifest Will and Multifaceted Will
- (Rigo) Add Ephemeral Effect for Disarm's bonus to further attempts
- (Rigo) Add implement benefits as separate class features
- (Rigo) Add missing roll option to Skybearer's Belt and Twin Star's predicates
- (Rigo) Add spell effect for Swear Oath
- (Rigo) Allow 3rd rank revelation spells to be chosen for Diverse Mystery
- (Rigo) Allow Class Might effect to select any attribute
- (Rigo) Automate Alchemical Sciences Investigator alchemy and tag alchemical tools
- (Rigo) Automate several mythic destiny feats
- (Rigo) Automate several Wandering Chef feats including quick and advanced alchemy
- (Rigo) Grant implement with Thaumaturge Dedication
- (Rigo) Hide disabled Bloody Debilitation dice in Debilitating Strike feature
- (Rigo) Implement natural 19 DoS adjustments on some monsters
- (Rigo) Move Quick-Tempered effects to its Note
- (Rigo) Move versatile vials scaling to physical item rather than the feature
- (Rigo) Remove unlocalised label from Furious Footfalls
- (Rigo) Replace brackets with ternaries from several spell effects
- (Rigo) Use AdjustDegreeOfSuccess rule element on Ageless Patience and localize its Note
- (Rigo) Use origin level instead of actor level on Cringe's effect
- (Tikael) Add content from Spore War Player's Guide
- (Tikael) Add missing PFS 6 Quests folder
- (Tikael) Add wilderness label for Fresh Ingredients
- (Tikael) Fix Divine Vessel spell effects
- (Tikael) Make Biographical Eye inline immutable
- (TMun) Add NPCs from PFS Quest 20, 21, and 22 actors

### Under the Hood

- (Supe) Add description for damage and modifier roll options in the roll inspector
- (Supe) Add support for aura effect resolvables and parent options
- (Supe) Show post roll options in the roll inspector
- (Supe) Show selectors when inspecting damage taken messages
- (Supe) Support ephemeral effects for most checks
- (Supe) Support uuid when using game.pf2e.rollItemMacro()

## 6.7.2

### System Improvements

- (pendragont) Show higher level learned formulas before lower leveled ones
- (Supe) Add support for spell area heightening
- (Supe) Remove selection hover from kingdom builder to avoid confusion with active

### Bugfixes

- (stwlam) Fix players not being to open the kingdom sheet
- (stwlam) Fix safeguard in `DamageRoll` ensuring minimum of 1 damage
- (stwlam) Prevent affliction SVG icon from causing Firefox to catch on fire
- (Supe) Fix batch size for crafting mundane ammo with munitions crafter

### Data Updates

- (Abbadon) Remove slashing surge from vault builder
- (Aidan Smith, stwlam) Fix artifacts from deity icons
- (Ambrose) Add Embeds and Localizations to the Class and Archetype journals
- (Ambrose) Add folders to Deities Compendium
- (Ambrose) Add Mythic Griffon to War of Immortals bestiary
- (Ambrose) Add Scattering Shout mythic feat
- (Ambrose) Clean up and remove flavor text from multiple spell effect descriptions
- (Ambrose) Condense Clockwork Goggle Effects and Psychic Weapon Expertise
- (Ambrose) Convert additional instances of inline damage to `@Damage`
- (Ambrose) Fix localization path for Advanced Alchemy label in Herbalist Dedication
- (Ambrose) Localize Juggernaut and Expert/Master/Legendary Class Features
- (Ambrose) Refresh Mark of the Mantis Pregen actors and PC1/PC2 spellcaster iconics
- (Ambrose) Update additional deity descriptions with details from web supplement
- (Rigo) Update Aivarin and Droomar to be versatile heritages
- (Dire Weasel) Update Rotting Aura description and effects
- (KaitoKuroba) Include Strike REs with battleForm: true to battle forms
- (kromko) Fix Mystery Conduit RE-added spell description
- (kromko) Fix Witch class journal Witch Lessons embed
- (Mose) Fix missing drawback on Effect: Fury Cocktail (Moderate)
- (Rigo) Add effect for Mythic Allies, Sotired Companion, Godspeed, and Unending Subsistence
- (Rigo) Add inline healing to Call From Death's Door and Binds that Tie
- (Rigo) Add interval area heightening on spells
- (Rigo) Add missing area data to Reverse Gravity
- (Rigo) Add spell effect for Blink Charge
- (Rigo) Condense Lay on Hands spell effect
- (Rigo) Fix level of Winged Warrior Dedication in archetypes journal
- (Rigo) Grant Bon Mot with Cutting Rebuke and add inline damage
- (Rigo) Refresh Nahoa's class features
- (Rigo) Update catalyst trait description to remaster and add illusion trait to armor
- (Supe) Remove non-functional crafting ability from alchemist dedication

## 6.7.1

### System Improvements

- (stwlam) Remove need for second confirmation click in ABC picker
- (Supe) Include ritual stats such as cost and primary/secondary checks in description
- (Supe) Expend prepared formulas when daily crafting and add a reset button

### Bugfixes

- (stwlam) Restore visibility of initial kingdom creation process

### Data Updates

- (Abaddon) Fix Calistria source
- (Ambrose) Add deity updates from the Pathfinder Divine Mysteries Web Supplement
- (Ambrose) Add grapple and trip `/act` actions to NPC Monster localization
- (Ambrose) Condense Beastmaster's Sigil Spellheart effects
- (Ambrose) Remove duplicate Findeladlara deity item
- (Ambrose) Update Awaken Entropy spell variants
- (Ambrose) Update class and archetype journal entries
- (Ambrose) Update descriptions for multiple feat effects and monk stances
- (Ambrose) Update Flourishing Fist range on Primal Warden of Zibik
- (Ambrose) Update instances of inline damage to `@Damage`
- (Dire Weasel) Add automation for NPC Felling Blow and Lunge
- (Dire Weasel) Add effect for Devouring Dark Form and some fulus
- (Dire Weasel) Coalesce damage for Burn Alive
- (Dire Weasel) Fix broken embed link in Razmiran Priest journal
- (Dire Weasel) Fix penalty type for Vulnerable to Prone
- (Dire Weasel) Fix some missing compendiumSources for items on Curtain Call actors
- (Dire Weasel) Update description of golem effects and localize golem antimagic
- (kromko) Fix Guillotine Golem antimagic damage value
- (kromko) Fix some spell descriptions
- (Rigo) Add area roll options to Frozen Lava and Eternal Eruption
- (Rigo) Add effect for Mortalis Coin
- (Rigo) Add focus points with Third and Fourth apparition class features
- (Rigo) Add saving throw choices to Perfection's Path
- (Rigo) Add Telepathic Union feat
- (Rigo) Automate and clean up some Seneschal Witch features
- (Rigo) Correct Trudd's divine sanctification
- (Rigo) Limit Deadly Aspect to the Strike granted by Draconic Aspect
- (SpartanCPA, stwlam) Update deity icons
- (Tikael) Sort remaining PFS actors into folders

### Under the Hood

- (Supe) Add compatibility warning for SpellcastingEntryPF2e#getSpellData() (until 7.0.0)
- (Supe) Remove deprecated properties from actor and item getRollData()

## 6.7.0

### Highlights

- (Ambrose, Rigo, Tikael) Add content from Lost Omens Divine Mysteries

### System Improvements

- (Codas) Improve aura rendering performance
- (stwlam) Add configurability of whether a granted feat/feature should be visually nested
- (stwlam) Add Covenant category to deity items, allow devotee benefits for philosophies
- (stwlam) Allow standard CTRL-measurement while drag measurement is enabled
- (stwlam) Show rarity in ABC picker options
- (Supe) Implement remaster styled Advanced Alchemy for alchemy-related archetypes

### Bugfixes

- (Drental) Fix Grievous rune for Crossbows, localize simple and martial crossbow proficiencies
- (Idle) Fix recall knowledge DCs not showing in item identification dialog for non-alchemical, non-magical items
- (Idle) Fix Trick Magic Item popup labels
- (In3luki) Fix `RulerPF2e#_onMouseUp` not working for normal (non-drag) measurements
- (Supe) Create item when using the craft item button on a prepared entry
- (Supe) Fix browsing Divine Intercessions and PFS Boons
- (Supe) Fix item macros for actions without Use buttons and support modifier keys
- (Supe) Fix reroll using a hero point erroneously displaying for a mythic character
- (stwlam) Expand min/max of item alterations of hardness

### Data Updates

- (Ambrose) Add Automation for Qi Blast under Heaven's Thunder effect
- (Ambrose) Add missing thievery check to Repelling Surge hazard
- (Ambrose) Convert additional instances of inline damage to the new format
- (Ambrose) Fix malformed RE in Monk Expertise Class Feature
- (Ambrose) Remove redundant Item Alteration Description RE from Megavolt
- (Ambrose) Update Revitalizing Finisher Temporary HP formula
- (Dire Weasel) Add effects for Assassin's Bracers
- (Dire Weasel) Brush up automation for some Grey Gardeners feats
- (Drental) Fix DC of Divine Revulsion for Redcap Cavalry
- (Drental) Fix greater composer staff item bonus to performance
- (joeparis) Update Major Art Objects and 8th- through 20th-level item rollable tables
- (kromko) Fix /act enricher regex to prevent catastrophic backtracking
- (kromko) Fix Disrupt Opposed Magic requirements formatting
- (kromko) Fix minor RE localization errors
- (kromko) Fix Zombie's Plague-Ridden description
- (Rigo) Add action cost to Wing Buffet
- (Rigo) Add Marked for Death's roll option to its Sneak Attack damage predicate
- (Rigo) Add some missing localization strings for LO:DM
- (Rigo) Adjust Armor Proficiency Choice Set to not be ignored
- (Rigo) Condense Endemic Herb effects and update Herbalist journal
- (Rigo) Correct Spectral Advance spell rank
- (Rigo) Fix armor scaling of Champion and Sentinel dedications
- (Rigo) Fix Obedience's Exalted Reaction predicate
- (Rigo) Grant Pet feat with Animist's Spirit Familiar
- (Rigo) Replace selector with domain in Swashbuckler styles' bravado Roll Option
- (Rigo) Update Avenger and Spelldrinker's description to errata
- (Rigo) Update Bon Mot penalty value to resolve as a number
- (Supe) Fix Nahoa and Samo prototype tokens
- (Tikael) Add content Pathfinder #208: Hoof, Cinder, and Storm
- (Tikael) Add content for PFS scenarios #6-06 and #6-07
- (Tikael) Fix action cost of Spear Dancer
- (Tikael) Fix fast healing on Bandersnatch

## 6.6.2

### System Improvements

- (In3luki) Show color coded degree of success in chat damage messages
- (Supe) Add ability for features to suppress/disable other features
- (Supe) Add implementation of mythic points

### Bugfixes

- (In3luki) Fix retrieval of prior Strike attack roll when rolling damage
- (stwlam) Fix processing of concussive trait in damage application
- (Supe) Fix NPC variant skill labels not accounting for already enabled variants
- (Tikael) Fix missing spaces in `@Embedd` prerequisites
- (websterguy) Fix issue with PFS boons not displaying on character sheet

### Data Updates

- (Abaddon) Add spell variants for flurry of claws and rename old spell effect
- (Abaddon) Fix Xulgath Leader's Weakening Strike
- (Abaddon) Fix publication sources in several War of Immortals items
- (Abaddon) Add healing roll to Lifelink
- (Ambrose) Add dedicated spell effect to Enlarge Companion and brush up Enlarge spell effect
- (Ambrose) Add prerequisites to Animist Dedication feats and update select Archetype journal entries to use `@Embed`
- (Ambrose) Change Eternal Legend Dedication to be a class feat
- (Ambrose) Complete the missing Tian Xia Character Guide Archetypes in the Archetypes Journal
- (Ambrose) Consolidate Brewer's Regret, Cloak of Elvenkind, and Chromatic Jellyfish Oil effects
- (Ambrose) Correct Thunder God's Fan prerequisite to match Player Core 2
- (Ambrose) Update Triumph of the Tusk backgrounds to use Remaster terminology
- (Ambrose) Update Cytillesh Oil damage rolls to match Player Core 2
- (Ambrose) Localize Cursebound condition
- (Dire Weasel) Add automation for Bhanyada's Extraneous Flesh
- (Dire Weasel) Fix resistances and weaknesses for Bhanyada Behemoth
- (Dire Weasel) Add automation for The Bigger They Are
- (Dire Weasel) Add effect for Safe Passage
- (Dire Weasel) Add Wither Away and fix Virulent Strike
- (Dire Weasel) Fix Jin Li's inline damage roll
- (Dire Weasel) Fix persistent damage and range for Earth's Bile
- (Dire Weasel) Add effects for Absorb Shock and Electric Surge
- (jaybrueder) Fix immunities of Animated Armor
- (joeparis) Update 1st- through 7th-level rollable tables
- (kromko) Replace some NPCs Reactive Strike action with the one from the Bestiary Ability Glossary (#17257)
- (rectulo) Change Sakura's Sprig to use Remaster terminology
- (rectulo) Fix a typo in description of Come and Get Me
- (reyzor) Add Game Hunter (Target) effect
- (Rigo) Fix Marshal Dedication skill Choice Set values
- (Rigo) Add base weapon type to Fighting Stick
- (Rigo) Add missing concentrate and manipulate traits to Phoenix Ward
- (Rigo) Add missing implementation of WoI multiclass archetypes
- (Rigo) Correct Fracture Mountains immanence damage adjustment
- (Rigo) Correct level of Avalanche Strike in Marshal archetype journal page
- (Rigo) Fix predicate on Barrow's Edge existing weapon choice set
- (Rigo) Implement Crash Against Me's resistance and add notes on triggering attacks
- (Rigo) Localize Quick Climb and Quick Swim notes and fix calculation of the latter's value
- (Rigo) Predicate Unleash Psyche's bonus on `psi-cantrip` tag
- (Rigo) Refactor Sneak Attack to be tag-based and add missing Avenger features
- (Rigo) Suppress Surprise Attack and Shield Block from Avenger and Warrior of Legend archetypes
- (Rigo) Tag Flowing Spirit Strike damage allowing Energized Spark's alteration
- (Rigo) Update conscious mind Damage Dice overrides to Damage Alteration
- (Rigo) Add spell effect for Runic Weapon
- (stwlam) Set max item crafting level in Talisman Esoterica feat
- (Tikael) Automate Monk Expertise spellcasting upgrade
- (Tikael) Fix action cost of Nymph's Grace focus spell
- (Tikael) Fix ancestry slugs on Kholo and Tripkee heritages
- (Tikael) Fix Assurance grant of Farmhand background
- (TMun) Update Add Licensing Terms (#17261)
- (Trent) Add effects for Albatross Curse

## 6.6.1

### Bugfixes

- (Supe) Fix browsing mythic callings when one isn't set

### Data Updates

- (Ambrose) Convert Rewrite Fate into an action that is granted by Mythic Callings
- (Ambrose) Fix text on Avenger Class Archetype Journal Entry
- (Ambrose) Incorporate errata for War of the Immortals
- (Ambrose) Update additional Equipment Effects descriptions and icons
- (Dire Weasel) Add effects for Arcane Explosion and Diadem of Divine Radiance
- (Dire Weasel) Update some War of Immortal nephilim feats
- (Nythz) Link War of Immortals class archetype dedications to their respective journal pages
- (Rigo) Add effect for Fly on Shadowed Wings and inline healing for Spirit's Sacrifice
- (Rigo) Add martial proficiency upgrade to Embodiment of Battle
- (Rigo) Add missing divine spark predicate to Victor's Wreath immanence
- (Rigo) Add missing traits to Ears That Hear the Truth
- (Rigo) Automate Roaring Heart and Medium's Awareness
- (Rigo) Fix Embed UUID on Thousand League Sandals
- (Rigo) Fix Fracture Mountain's immanence damage adjustment
- (Rigo) Use toggle to tag unarmed attack as a weapon ikon
- (Supe) Make mythic variant rule hint more descriptive in settings

## 6.6.0

### Highlights

- (Ambrose, Dire Weasel, Mecha Maya, Rigo, SpartanCPA, Tikael) Add content from War of Immortals
- (Supe) Add support for mythic feat slots

### System Improvements

- (Farling) Improve display of `/act` in chat for secret rolls
- (stwlam) Add support for tagging modifiers and damage dice
- (stwlam) Search publication sources in addition to item names in ABC Picker

### Bugfixes

- (stwlam) Fix creation of ranged battle-form strikes
- (stwlam) Fix dropping compendium actors' spells from preparation sheets
- (Supe) Fix removing spell damage from corrupting heightening data
- (websterguy) Fix "double vs" resistance requiring all entries to be true

### Data Updates

- (Abaddon) Fix Targets section Champions Sacrifice stat block
- (Abaddon) Fix wrestler dedication prerequisites
- (Ambrose) Add Electromagnetic Dispersal and precision damage immunity to Nanoshard Swarm actor
- (Ambrose) Add missing additional feats to Sniping Duo dedication journal entry
- (Ambrose) Update Contact, Ingested, Inhaled and Injury trait descriptions to match Pathfinder GM Core
- (Ambrose) Update Fresh Produce feat requirements to match Player Core 2 update
- (Ambrose) Update usage on several items to match Pathfinder GM Core
- (Dire Weasel) Fix prerequisites of Dangle and Shed Tail
- (Dire Weasel) improve automation of Gecko's Grip
- (DocSchlock) Fix typo in Elemental Wayfinder (Water)
- (Rigo) Remove condensed witch-specific Incredible Familiar
- (websterguy) Fix Diplomat's Badge slug collision

## 6.5.1

### System Improvements

- (Rigo) Add damage type as index field for item-filter choice sets

### Bugfixes

- (stwlam) Exclude PF2e Companion Compendia items from `ABCPicker` results
- (stwlam) Fix removing frequencies from ability sheets
- (Supe) Apply item alterations to weapon alt usages
- (Supe) Fix trait toggles on strikes overriden within the same item
- (Farling) Ignore disabled region behaviors when determining effect on actors

### Data Updates

- (Ambrose) Add the summon trait to the GM Screen and replace broken links
- (Ambrose) Correct formatting in "Shake it Off" ability for Glacial Worm
- (Ambrose) Update skill actions to /act syntax and use new journal links
- (MrVauxs) Grant Critical Specialization in archer dedication

## 6.5.0

### System Improvements

- (Ambrose) Apply remaster theme to tables in GM Screen and Remaster Changes Journals
- (eryon) Add send to party button to loot sheet
- (stwlam) Refrain from broadcasting drag measurement of GM-hidden tokens
- (stwlam) Rework ancestry, heritage, class, deity picker into a new application that pulls from all compendiums
- (Supe) Make effects panel scrollable when overflowing
- (Supe) Recharge turn and round abilities as the encounter changes turns
- (Supe) Reduce remaining action uses when clicking the use button
- (Tikael) Allow alternative handwraps to function like Handwraps of Mighty Blows

### Bugfixes

- (Dire Weasel, Supe, stwlam) Fix missing compendium sources in several items
- (Stefan van Bodegraven) Fix Crash/Freeze when missing inline damage closing bracket
- (stwlam) Fix predication of item usage and runes in choice sets
- (stwlam) Fix "same-as" weapon proficiency chaining incorrectly
- (Supe) Fix drag/drop reordering of crafting formulas
- (Supe) Fix refreshing items embedded in compendium actors

### Data Updates

- (Ambrose, Dire Weasel) Update more item descriptions and durations for remaster
- (7H3LaughingMan) Implement Monastic Weaponry's Criticial Specialization
- (Abbadon) Brush up multiple effects
- (Ambrose) Add Divine Access class feature to Oracle journal entry
- (Ambrose) Add Fortitude Save to Envenom Companion spell
- (Ambrose) Add Gelid Shard archetype to archetype journal
- (Ambrose) Add Volley 60 feet trait
- (Ambrose) Allow strike sanctification to apply to champion archetype
- (Ambrose) Automate "Come and Get Me"
- (Ambrose) Brush up select Bestiary Effects
- (Ambrose) Condense Antidote, Antiplague, and Blood Booster item effects
- (Ambrose) Fix Fire Shield
- (Ambrose) Redirect more Bestiary actors to Monster Core equivalents
- (Ambrose) Tag more feats that grant ancestral spells
- (Ambrose) Rewrite GM Screen journal
- (Ambrose) Update Grapple actions to use newer format on several items
- (Ambrose) Update instances of inline damage to the new format
- (Ambrose) Update instances of good and evil damage to Remaster terminology
- (CrackJackFlood) Add Spell Effect for Acid Grip
- (CrackJackFlood) Add more aura sizes for Bless effect.
- (CrackJackFlood) Add skill untrained penalty for Silvertongue Mutagen
- (CrackJackFlood) Add spell effect for Acid Grip
- (CrackJackFlood) Condense Tail Lash Effects
- (CrackJackFlood) Fix Soulbound Ruin statblock
- (Daomephsta) Fix inline checks for Paradox Engine
- (Dire Weasel) Add automation for Bomber's Eye Elixir, Hard to Target, Stag's Helm, and Weapon Siphon
- (Dire Weasel) Add template to Bloodsiphon's Death Burst
- (Dire Weasel) Brush up Old Thornbarker
- (Dire Weasel) Condense effects for Mudrock Snare
- (Dire Weasel) Condense effects for Treat Disease and Treat Poison
- (Dire Weasel) Fix Masquerade Scarf, Adamantine Body, and various item descriptions
- (Dire Weasel) Refresh copies of musical instruments in bestiary actors
- (Dire Weasel) Remove several unused effects
- (Dire Weasel) Update IWR for certain Rage of Elements creatures
- (DocSchlock) Add silver to Moonlit Spellgun
- (Hydrair) Fix selectors of Curse of Ancestral Meddling
- (Intervencion) Fix Solar Rejuvenation healing formula
- (rectulo) Fix level for wand of purification
- (reyzor1991) Add Note for Envenom Companion
- (reyzor1991) Change action cost from 1 to 2 Con for Rit - Spit Venom
- (Rigo) Add Strike failure note to Energizing Lattice effect
- (Rigo) Add area roll options to several inline links
- (Rigo) Add effect for Sixth Pillar Mastery
- (Rigo) Add fly speed to Winged Owlbear
- (Rigo) Add inline healing rolls to Vital Beacon
- (Rigo) Add labeled badge to Sewer Ooze's Filth Wave effect
- (Rigo) Automate Backfire Mantle, Blessed Swiftness, Dazzling Rosary, Dragon Throat Scale, Necrotic Cap, Wemmuth Trinket, and Pentagonal Seventh Prison
- (Rigo) Clean up Serene Mutagen effects
- (Rigo) Condense Aura of Faith effects and enable Champion's Aura by default
- (Rigo) Condense Elixir of Life and Healer's Gel effects and add Life Shot effect
- (Rigo) Condense Thermal Nimbus effects
- (Rigo) Fix damage type for Animal Instinct's Tyrannosaurus Tail
- (Rigo) Fix duration of Champion's extra damage effect
- (Rigo) Fix quickstrike localization
- (Rigo) Improve automation for Pocket Library
- (Rigo) Localize labels in Twitchy feat and adjust initiative modifier
- (Rigo) Remove and redirect condensed Dragon Breath spells
- (Rigo) Restrict Kashrishi's Empathic Sense to non-mindless creatures
- (Tikael) Automate Ogre Gluttons glutton's feast ability
- (Tikael) Brush up rule elements on Monstrous Peacemaker
- (Tikael) Fix Aldori Duelist
- (Tikael) Fix verbiage of Self Destruct feat for clarity
- (Unoblueboy) Update Fortify Shield effect

### Under the Hood

- (stwlam) Convert ability items to data models
- (stwlam) Move source ids to \_stats object
- (Supe) Initial implementation of SpecialResource rule element

## 6.4.1

### System Improvements

- (Codas) Improve performance of actor roll option retrieval
- (DocSchlock) Add roll option toggle support to NPC spells and familiars

### Bugfixes

- (Abrault) Fix untrained bonus in Trick Magic Item
- (DocSchlock) Fix permanently hidden Campaign Features in Compendium Browser
- (DocSchlock) Fix minions and eidolons getting added to initiative from party sheet
- (nikolaj-a) Fix modifier adjustments for single check actions
- (Supe) Fix bonuses to damage applying to damage without the suitable type
- (Supe) Fix updating frequencies in NPC and vehicle sheet
- (Supe) Fix temporarily removed actor and item traits from being permanently removed when opening and closing the sheet

### Data Updates

- (Ambrose, Dire Weasel) Assign and replace icons for multiple items
- (Ambrose) Automate the Dire Growth Werecreature feat
- (Ambrose) Correct Ripnugget's intimidation
- (Ambrose) Fix Swashbuckler's Martial Weapon expertise
- (Ambrose) Reduce brightness of Ancient Scale Azarketi
- (Ambrose) Redirect more actors to monster core equivalents
- (Ambrose) Restore the Godless Healing feat
- (Dire Weasel) Add effects for TXCG food
- (Dire Weasel) Add effects for Spun Cloud
- (Dire Weasel) Add effect for Taper of Sanctification
- (Dire Weasel) Update effects for season of ghosts creatures
- (DocShlock) Add silver to Moonlit Spellgun's damage rolls
- (Michaël) Add armor item for Bakuwa Lizardfolk
- (MechaMaya) Add item alteration to "And Will Do This Once More"
- (rectulo) Fix unfurling brocade description
- (reyzor1991) Correct rank of Shrink the Span
- (Rigo) Automate Charged Javelin, Canopy Predator, Sneak Adept, Staggering Fire, Psychic's amped shield, Toxicologist Alchemist Field Benefit, Blessed Counterstrike, and Greater Security for Shields of the Spirit
- (Rigo) Automate Kindling and Luminous familiar abilities
- (Rigo) Automate dice upgrades for Diamond Fists
- (Rigo) Automate Smoothing Aeon Ston's penalty suppression
- (Rigo) Add toggle for Winged Warrior Dedication fly speed bonus
- (Rigo) Condense Investigator Clue in effects and Predictable!
- (Rigo) Condense Damage Avoidance familiar abilities
- (Rigo) Condense and update multiple spell effects
- (Rigo) Fix aid applying to more than attack rolls and skill checks
- (Rigo) Fix Mammoth Bow's weapon category to martial
- (Rigo) Improve blood magic description alteration formatting
- (Rigo) Partially update Sacred Form to Player Core 2
- (Rigo) Rework Dutiful Challenge to use Token Mark
- (Rigo) Update Albatross Curse to apply to enemies within a certain distance
- (Rigo) Update Crossbow Crackshot to work for any damage type and add backstabber damage
- (Tikael) Automate shield augmentations
- (websterguy) Remove erroneous attack bonus from Starlit Transformation

### Under the Hood

- (stwlam) Add relative ally and enemy target and origin roll options
- (Supe) Include distance roll option for all checks
- (Tikael) Add support for choiceset queries for energy and physical damage types

## 6.4.0

### System Improvements

- (Codas) Improve rendering performance in encounter tracker
- (Farling) Add @Embed support for items
- (stwlam) Add support for changing dynamic token ring subject using TokenImageRE
- (Supe) Improve scaling of dynamic token fallback token images in chat messages
- (Tikael) Add creature traits to hazards

### Bugfixes

- (stwlam) Allow blank animation type in TokenLight RE form
- (Supe) Avoid disabled ability modifiers from suppressing enabled ones
- (Supe) Fix choice set homebrew item dropzone for button lists
- (Supe) Fix chat messages containing tokens with wildcards
- (Trent) Fix user callbacks not being awaited for weapons with ammo

### Data Updates

- (Ambrose, kromko) Update publication data for certain items
- (Dire Weasel, Tikael) Update more items to use better core icons
- (Ambrose, Rigo) Improve support of ancestral spells
- (Abbadon) Add stonebound and stone brawler to archetype journal
- (Ambrose) Add icons to more equipment and npc items
- (Ambrose) Add Clawdancer and Shieldmarshal dedications to the archetypes journal
- (Ambrose) Automate Bard critical specialization
- (Ambrose) Condense weapon expertise and spell repertoire class features
- (Ambrose) Fix Seraptis skills
- (Ambrose) Handle Redemption cause in Exalted Reaction
- (Ambrose) Update Pathfinder Society Boons
- (Ambrose) Update Sentinel, Champion Dedication, Quickstrike, and Liberating Step to match PC2
- (Ambrose) Redirect certain actors to their Monster Core equivalent
- (Dire Weasel) Add note reminder for Uncanny Pounce
- (Dire Weasel) Add effects for Malleable Claw, Predator's Claw, and Tiger's Menuki
- (Dire Weasel) Automate Hollow Star aura and Elemental Bulwark
- (Dire Weasel) Automate NPC abilities Ambush and Terrain Advantage
- (Dire Weasel) Condense Elemental Gift and Evolution Surge effects
- (Dire Weasel) Fix error in Ainamuuren damage type
- (Dire Weasel) Update Oni Form effect
- (Dire Weasel) Update NPC Blood Frenzy effect
- (Dire Weasel) Add stance effect for Stretching Reach
- (kromko) Fix Cave Worm Venom and Taper of Sanctification
- (nythz) Fix prices of great Helm of Zeal and Sash of Prowess
- (MiddleTwin) Automate Fortissimo Composition
- (Mose) Fix typos in certain items
- (rectulo) Fix incorrect link in Wild Winds Stance
- (Rigo) Automate Fan Dancer and Starlit Span archetypes
- (Rigo) Automate TXCG Inventor Feats
- (Rigo) Automate TXCG Elemental Medicine Feats
- (Rigo) Fix Price and level of Energy Adaptive Rune
- (Rigo) Fix description and implement Prognostic Veil's Twist the Skeins of Fate
- (Rigo) Fix Awakened Animal's fist strike overriding other strikes
- (Rigo) Move Unleash Psyche's toggle to the spellcasting tab
- (Rigo) Update Mauler's Critical Specialization to include advanced weapons
- (Rigo) Update Alchemist Goggles and automate Berserker's Cloak
- (Rigo) Update several TXCG equipment and effects
- (Rigo) Rework werecreature dedication automation. Drag the feat in again.
- (Tikael) Fix automation of Kitsune Change Shape
- (Tikael) Fix rules for Conspirator Dragons and Bone Missile
- (Tikael) Fix Unstoppable Juggernaut and Superstition's raging resistance

## 6.3.1

### Bugfixes

- (Idle) Fixed background label in the attribute boosts menu
- (stwlam, Supe) Fix level up feature granting and grant item
- (stwlam) Fix critical hit immunities
- (Supe) Don't show chat portraits in secret messages

### Data Updates

- (Abbadon) Adding missing sources to some items
- (Ambrose) Add processed trait
- (Ambrose) Consolidate Catharsis Emotion features into one
- (Dire Weasel) Link some Tian Xia feats to relevant archetype journal entries
- (Nythz) Add dedication trait to Pactbound Dedication
- (Rigo) Fix several Wayang, Yaksha, and Yaoguai ancestry feats
- (Rigo) Add degree of success radius adjustments to Strategist Stance
- (Rigo) Add automation for Protective Cycle, Renewing Cycle, and some Spirit Warrior features
- (TiloBuechsenschuss) Add expiration to Buckler Stance

## 6.3.0

### Highlights

- (Ambrose, Mecha Maya, Rigo, SpartanCPA, Tikael) Add content from Tian Xia Character Guide

### System Improvements

- (stwlam) Allow `rollerRole` (target/origin status) of inline check rolls to be overridden
- (Supe) Add token images to some chat messages
- (Supe) Display max crafting level in header of PC sheet's crafting tab

### Bugfixes

- (7H3LaughingMan) Snap ruler origin/destination to bottom-right vertex
- (Supe) Set default condition roll option prefix

### Data Updates

- (Ambrose) Brush up Hand of the Apprentice wizard focus spell
- (Ambrose) Brush up Vicious Incisors feat RE
- (Ambrose) Consolidate Draw Ire failure and critical failure effects
- (Ambrose) Consolidate Elementalist feats
- (Ambrose) Correct duration and description for Potency Crystal effects
- (Ambrose) Correct prerequisites for Sanctify Water feat
- (Ambrose) Correct spell list for Azi
- (Ambrose) Correct stats for Charau-ka butcher Actor
- (Ambrose) Fix action cost for Blessed Boundary spell
- (Ambrose) Fix bonus for Greater Arboreal Boots
- (Ambrose) Fix slugs used by Vicious Incisors
- (Ambrose) Remove select Actors and redirect to Monster Core Versions
- (Ambrose) Update Alchemist traits to match PC2 text
- (Ambrose) Update Halfling and Human ancestries' publication information to remaster
- (Dire Weasel) Fix action type and cost of Sleek Reposition
- (Dire Weasel) Fix inline damage roll for Invoke the Elements and add automation for Stormy Heart
- (Dire Weasel) Fix predicate and selector for Fiend-Trampling Stature
- (Dire Weasel) Fix save type of Giant Scorpion Venom
- (Dire Weasel) Fix selectors in rule elements on Dragonstorm Blade
- (Dire Weasel) Tidy description of Void Fragment and add links
- (Dire Weasel) Update Soul Swarm's Soul Grasp damage to RollOption with suboptions
- (JJellie) Fix the radius of the Harpy's aura
- (kromko) Fix Desperate Wrath AC penalty
- (kromko) Fix Oversized Throw requirements formatting
- (kromko) Update Medium Armor Mastery publication to PC2
- (Mecha Maya) Count Domain Initiate Cleric feats toward Soul Warden feat count
- (Mose) Fix typos in Crane Flutter, Major Juggernaut Elixir, and Safe House
- (reyzor1991) Set Ijhyeojin HP to max
- (Rigo) Add DoS adjustments to Magical Shorthand and Spellbook Prodigy
- (Rigo) Add missing dice number to Goring Charge's rule element
- (Rigo) Redirect several removed effects to their condensed version
- (Rigo) Set dragonblood rarity to uncommon
- (Rigo) Update Goblin ancestry's publication information to remaster
- (Rigo) Update Sticky Bomb to correctly calculate persistent damage
- (SpartanCPA) Begin Refactoring Player Character Change Shape
- (stwlam) Add morph and primal traits to Rage action from Animal Instinct
- (Tikael) Add magicsense to selectable senses
- (Tikael) Condense ancestry Change Shape actions
- (websterguy) Remove duplicate paragraph from Reaper's Grasp description

### Under the Hood

- (stwlam) Switch to use of `_stats.compendiumSource` instead of `flags.core.sourceId`

## 6.2.3

This update requires Foundry VTT version 12.328.

### Bugfixes

- (stwlam) Fix Treat Wounds macro always using Risky Surgery given presence of feat
- (stwlam) Test against crit immunity exceptions when processing IWR
- (Supe) Do not persist other tags added via item alterations

### Data Updates

- (Abaddon) Add Qi Spells link to Bullet Dancer journal entry page
- (Ambrose) Consolidate Keep Pace and Know It All feats
- (Ambrose) Fix localization for Breath Weapon action
- (Ambrose) Fix Obsidian Edge base damage and range
- (Ambrose) Remove self-applying effect from Portents of Haruspex
- (Ambrose) Update inline damage rolls for the Critical Deck journal entries
- (Dire Weasel) Add effects for Clay Sphere, unified effect for Elemental Motion
- (Dire Weasel) Brush up Ghosthand's Comet
- (Dire Weasel) Fix level of The Dancing Lady
- (Dire Weasel) Fix level of Tunnel feat in Worm Caller journal entry page
- (Dire Weasel) Update Fortify Summoning effect to remaster
- (kromko) Make Ignition rank persistent damage links actually scale
- (MechaMaya) Fix categories of Sharp Teeth and Draconic Scent
- (Mose) Fix formula for damage based on proficiency on agonizing rebuke
- (Mose) Fix typo in Swift Swimmer
- (Mose) Remove incorrect link to Escape action in No Escape
- (rectulo) Fix inline check in Folksy Patter
- (Rigo) Add effect for Connect the Dots
- (Rigo) Add PFS draconic options to dragon instinct barbarian
- (Rigo) Add versatile vial item and basic Field Vial benefits
- (Rigo) Fix Bestial Mutagen Strikes
- (Rigo) Fix typo on Insight Coffee rule elements
- (Rigo) Limit defensive stratagem bonus to Devise a Stratagem target

## 6.2.2

### Bugfixes

- (Idle) Fix NPC strike image in messages generated by macro
- (stwlam) Prevent system tags style from affecting core applications
- (stwlam) Restore later-added strikes from rule elements overriding earlier ones
- (stwlam) Retrieve actor image from core art mapping for compendium browser
- (stwlam) Fix issue causing inline rolls made from effects panel to not include full roll options
- (Supe) Fix elite/weak affecting flat checks
- (Supe) Fix updating homebrew languages
- (Supe) Fix label generation for extra dice in damage dialog
- (Trent) Fix application of weapon-affecting damage alterations with predicates

### Data Updates

- (Abaddon) Fix Nimble Strike description
- (Ambrose) Add missing spell to Shining Child
- (Ambrose) Add roll table for Madcap Top
- (Ambrose) Automate Ostentatious Arrival, Pitch Perfect Projection, Purifying Spell
- (Ambrose) Combine multiple versions of Solar Rejuvenation
- (Ambrose) Condense multiple versions of Invoke the Elements
- (Ambrose) correct action type for Bleed Out sorcerer feat
- (Ambrose) Fix action cost of Glutton's Jaw
- (Ambrose) Fix automation of Deadly Aspect and Sentinel Dedication
- (Ambrose) Fix several data issues in Iruxi Armaments
- (Ambrose) Fix link on Ancestors mystery
- (Ambrose) Fix rules in Arcane Cascade to prevent console spam
- (Ambrose) Fix senses of Five-colored Orchid Mantis
- (Ambrose) Fix typos in Kobold Ancestry journal
- (Ambrose) Fix typos in Solar Rejuvenation
- (Ambrose) Grant Dirty Trick with Town Troublemaker background
- (Ambrose) Improve automation of Unstable trait on some inventor feats
- (Ambrose) Move several instances of inline damage to newer format
- (Ambrose) Reformat more inline damage rolls
- (Ambrose) Remove duplicate attacks from One-Shot actors
- (Ambrose) Restore Draconic Scent feat for Draconic Disciple archetype
- (Ambrose) Update rule elements on Sparkling Targe
- (Ambrose) Update Sticky Bomb feat to now use class feature
- (Dire Weasel) Add automation for Ceremony of Sunlight, Chase Down, Lance Charge, Rush, Sand Stride, Sprint, Swift Swimmer, Woodland Ambush
- (Dire Weasel) Add effect for Electricity Absorption
- (Dire Weasel) Add inline damage/healing button to Agradaemon's Proven Devotion
- (Dire Weasel) Remove unneeded damage roll from Gouging Claw's description
- (Dire Weasel) Update Absolute Solvent descriptions and names to remaster
- (Dire Weasel) Update Rowan Rifle to use RollOption with suboptions instead of effects
- (kromko) Fix Duo's Aim RE localization key
- (kromko) Fix Inexplicable Apparatus activation label
- (kromko) Fix typo in Elixir of Life
- (kromko) Restore missing Holy Chain effect link
- (Michaël) Fix alchemical power feat
- (Michaël) Fix hp for thickskin tripkee heritage
- (Michaël) Fix traits on Frost Roc attacks
- (MrVauxs) Add 2 Action version to Inner Radiance Torrent
- (rectulo) Fix damage in breath of the mantis god
- (rectulo) Fix format of the minotaur ancestry journal
- (rectulo) Rename variants of chthonian wrath
- (Rigo) Add proficiency and degree of success increase to Confident Evasion
- (Rigo) Limit bloodline blood magic suboption to sorcerer class
- (Rigo) Link confused condition on Ashen rune notes
- (Rigo) Update weapon group selectors in Archer's Aim
- (Rigo) Use AdjustModifier on Oracular Warning initiative effect
- (Shaunymon) Correct defense entry for Ghoulish Cravings spell
- (stwlam) Add "spirit" to Dybbuk's resist-all exceptions
- (Tikael) Fix Barbarian Armor Mastery
- (Tikael) Move Ganzi resistance to suboptions
- (Tikael) Remove unnecessary notes from AdjustDegreeOfSuccess rules
- (Trent) Add action:recall-knowledge to diverse-lore FlatModifier predicate

## 6.2.1

### System Improvements

- (nikolaj-a) Support suppressing action chat message creation
- (stwlam) Add support for homebrew armor groups and base types
- (stwlam) Add support for spell area size alterations
- (Supe) Add support for homebrew shield traits
- (Supe) Replace inline roll "defense" param with "against", allow to be used with saving throws

### Bugfixes

- (7H3LaughingMan) Fix ruler snapping on hexagonal columns (odd) grids
- (stwlam) Fix negative base modifiers getting dropped from NPC attacks
- (stwlam) Fix hiding of damage-button cues when roll results are hidden
- (stwlam) Limit applicability some material equivalences (dawnsilver, sovereign steel, etc.) for IWR
- (stwlam) Prevent healing from becoming damage (and vice versa) via large damage- or healing-received bonuses/penalties
- (stwlam) Fix issue prevent Weight of Experience from automatically selecting skill for Assurance bonus feat
- (Supe) Fix damage dialog toggles sometimes not reflecting correct state

### Data Updates

- (Abaddon) Add shepherd of decay as source for some items
- (Abaddon) Add Spawn of Dahak variant
- (Ambrose) Add description alterations for Overwhelming Breath
- (Ambrose) Add Dragonblood trait to Dragon's Flight feat.
- (Ambrose) Add effect for Unstable check failure
- (Ambrose) Add Effect to Albatross Curse spell
- (Ambrose) Add Howl of the Wild options to the Untamed Form feat.
- (Ambrose) Add inline healing roll to Rejuvenating Flames spell
- (Ambrose) Add missing text and proficiency scaling for Herbalist dedication
- (Ambrose) Automate Dark Archive, Oracle, Scaly Hide, and Sorcerer spellshape feats
- (Ambrose) Brush up text on Haphazard Repair and Searing restoration
- (Ambrose) Change specific barding items to armor
- (Ambrose) Correct Advanced Herbalism from Class Feature to Class Feat
- (Ambrose) Correct typo on Kingmaker actor (Lickweed)
- (Ambrose) Fix description of Elbow Breaker
- (Ambrose) Hide Discordant Voice damage dice if disabled
- (Ambrose) Refresh spells on several actors
- (Ambrose) Remove Sustained status for Angelic Halo effect and aura
- (Ambrose) Update Barding Saddle to armor
- (Ambrose) Update Fling Magic to use damage syntax for rolls
- (AngelofWoe) Update Kobold Ancestry for PC2
- (Cerapter) Change Strategic Strike's `DamageDice` RE to use `diceNumber` instead of `value`
- (Chas) Fix bonus type of Robust Health
- (Chris Barrett) Fix Force Open table footnote
- (Dire Weasel) Add automation for Troop Spellcasting
- (Dire Weasel) Add EphemeralEffect to Grandmother Spider - Major Curse
- (Dire Weasel) Brush up divine intercessions
- (Dire Weasel) Fix Ghoul Stalker's token name
- (Dire Weasel) Fix link to Soothe in Life Oracle class feature description
- (Dire Weasel) Fix selector for Hone Claws effect
- (Dire Weasel) Update Weapon Storm's description to include area
- (DocSchlock) Correct text on Stylish Tricks
- (DocSchlock) Fix Max Take count to 3 for Voluminous Vials Feat
- (Drental) Add emanation templates to society actors
- (intrand) Fix action cost of Tap Into Blood
- (kromko) Add missing Spirit Sense spell effect link
- (kromko) Fix Astral Projection, Clone and Ward Domain degree of success formatting
- (kromko) Restore missing Seal Fate spell effect link
- (Michaël) Add automation to Duo's Aim
- (Michaël) Add toggle to Mighty Rage class feature
- (Michaël) Choker-Arm Mutagen fix to account for size changes
- (Phoenix) Update Herbalist Dedication batch size to match PC2
- (rectulo) Add Witch trait to Whisper of Wings
- (Rigo) Add action cost to Breath of the Dragon dragonblood feat
- (Rigo) Add Barbarian Ligneous Instinct's speed decrease
- (Rigo) Add DC to Oracle feats according to PFS clarification
- (Rigo) Add description alterations for Tap Into Blood
- (Rigo) Add description override to You're Next depending on the class
- (Rigo) Add effects for Leaden Steps, Revel in Retribution, Shields of the Spirit, Security (feat)
- (Rigo) Add Oracular curses as class features, automate effects of Cursebound condition
- (Rigo) Add Structure trait to Resplendent Mansion
- (Rigo) Allow Champion's Aura to be granted to archetype champions
- (Rigo) Allow Dirty Trick to be taken beyond level 1
- (Rigo) Automate dragonblood's Draconic Exemplar feats, Persistent Boost
- (Rigo) Automate Player Core 2 Sorcerer Blood Magic Feats
- (Rigo) Automate Widen Spell
- (Rigo) Correct Harpy Hungry Winds action cost
- (Rigo) Correct Long Hammer's rarity to common
- (Rigo) Fix Bestial Mutagen description and Oracle spellcasting table
- (Rigo) Fix Certain Stratagem damage roll
- (Rigo) Fix Hammer Gun damage type
- (Rigo) Fix ranged attack penalty on Tempest curse
- (Rigo) Fix typo and update links on Champion Armament feats
- (Rigo) Grant Draconic Exemplar to Kobolds using legacy feats
- (Rigo) Grant proficiency to advanced deity weapon with Deific Weapon
- (Rigo) Increase area of Amped Redistribute Potential
- (Rigo) Link damage and conditions on Age of Ashes NPC poison
- (Rigo) Rearrange Deity to be granted before Cause on Champion
- (Rigo) Remove AC penalty and add Temporary Hit Points to Share Rage
- (Rigo) Remove Invisible condition link from Connect the Dots
- (Rigo) Remove Invulnerable Juggernaut feat
- (Rigo) Rename Sulfur Bomb effect
- (Rigo) Restrict weapon proficiency granted by Tengu Weapon Familiarity
- (Rigo) Trim down Weight of Experience Choice Set
- (Rigo) Update sources content reprinted in Player Core 2, remove several legacy class feats
- (SpartanCPA) Add journal entry pages for Howl of the Wild Ancestries
- (SpartanCPA) Add Note on Initiative to Quick Tempered
- (stwlam) Remove Champion's Code class features and feats/spells depending on them
- (Tikael) Automate Advanced Weapon Training
- (Tikael) Brush up Fire Shield effect
- (Tikael) Brush up Hunter's Bow
- (Tikael) Change inline checks to new style
- (Tikael) Fix fly speed of Soaring Armor
- (Tikael) Lower the color intensity of the Light spell effect
- (Tikael) Move more inlines to new style
- (Tikael) Set several checks in class feats to use the proper class DC

## 6.2.0

### Highlights

- (Ambrose, Dire Weasel, DocSchlock, Mecha Maya, redeux, Rigo, SpartanCPA, Tikael, TMun) Add Content from Player Core 2

### System Improvements

- (nikolaj-a) Include action-specific modifiers for action check previews
- (stwlam) Add optional `testDomains` field to AE-likes
- (stwlam) Add support for damage alterations of base weapon damage
- (stwlam) Automate Shockwave rune
- (Supe) Remove repeating limitation for ammo with multiple uses

### Bugfixes

- (FolkvangrForgent) Remove system handling of hex-grid snapping
- (stwlam) Acquire modifier adjustments for Volley penalty
- (stwlam) Apply item alterations to basic unarmed attack
- (stwlam) Fix emanation snapping for large and gargantuan tokens
- (stwlam) Correct snapped destination when drag-measuring from unsnapped origin
- (stwlam) Resolve injected properties in AdjustDegreeOfSuccess predicates
- (Supe) Fix saving edits on deity sheets
- (Supe) Fix resolving nested predicates in config choice sets

### Data Updates

- (Abaddon) Add spell variants for establish ward
- (Abaddon) Add starshot arrow activation
- (alephtwo) Fix Performance bonus for Dancing Scarf
- (Ambrose) Fix formula for amped Redistribute Potential
- (Ambrose) Update Retraining description to remaster
- (arthurtrumpet) Add effects for new Howl of the Wild Animal Forms.
- (Dire Weasel) Add automation for Gruhastha - Moderate Boon
- (Dire Weasel) Brush up Goblin Zombie
- (Dire Weasel) Fix some predicates for Revolutionary Innovation
- (HeliumAnt) Fixed icon paths in kingdom builder when not served from the root
- (Rigo) Add effects for Insight Coffee
- (Rigo) Add note text for Goading Feint
- (SpartanCPA) Add Content from The Great Toy Heist
- (TMun) Add NPCs and Effects for PFS 6-00

## 6.1.3

### System Improvements

- (Tikael) Allow weapon group to be resolved in Strike REs

### Bugfixes

- (stwlam) Fix the (hopefully) remaining edge cases of Concussive trait
- (Supe) Fix display of readonly traits in actor and item sheets
- (Supe) Fix inline dc adjustments for elite/weak creatures
- (Trent) Fix Escape not picking unarmed attacks with negative modifiers

### Data Updates

- (Ambrose) Update Exploration Activities source and text to Player Core/GM Core
- (Dire Weasel) Remove invalid alignment traits from NPC strikes
- (rectulo) Fix lore skill in Art Tutor background
- (reyzor1991) Add DamageAlteration to Divine Castigation
- (reyzor1991) Add missing inline checks to several NPC abilities
- (Tikael) Remove unmaintained GMG journal entry compendium
- (websterguy) Fix domain on Artokus's Fire RollOption
- (websterguy) Fix inline roll in Note text on Glutton's Jaw effect

## 6.1.2

### System Improvements

- (stwlam) Integrate new `allowInteractive` core feature into check and damage rolls

### Bugfixes

- (stwlam) Loosen line template snapping
- (stwlam) Fix waypoint placement when not drag measuring
- (stwlam) Fix several visual quirks in attack popout
- (stwlam) Handle Concussive trait against targets having both immunity and resistance to same damage type
- (stwlam) Restore reinforcing rune select option labels on shield sheet
- (stwlam) Loosen line snapping restrictions for now
- (Supe) Prevent damage alterations from disabling override dice

### Data Updates

- (Dire Weasel) Add effect for Funereal Dirge
- (Dire Weasel) Add effect link to Elite Duergar Taskmaster's Take Them Down!
- (DocSchlock) Add Formula roll to Lucky Number Spell Effect

## 6.1.1

### System Improvements

- (nikolaj-a) Add traits and roll-options parameters to /act inline links
- (stwlam) Adjust drag measurement feature to play nice(r) with modules

### Bugfixes

- (stwlam) Fix Concussive trait redirecting damage type to one in which the target is immune
- (stwlam) Fix tiny tokens not traversing waypoints during drag measurement
- (stwlam) Fix drawing of highlights from other users' drag measurements
- (stwlam) Restore processing of roll breakdown user visibility
- (Supe) Fix font color of unready strikes
- (Supe) Fix hiding strikes in character sheet

### Data Updates

- (Ambrose) Correct typo in Spit Ambient Magic damage formula
- (nikolaj-a) Fix missing space character in Administer First Aid action description

## 6.1.0

### System Improvements

- (Clemente) Allow editing Shield HP from token attribute bars
- (Dire Weasel) Allow DamageAlteration rule elements to have resolvable selectors
- (MrVauxs) Add suport for battle form rule elements to specify whether one can use their own AC if higher
- (stwlam) Automate Concussive trait
- (stwlam) Add simple token drag measurement support
- (stwlam) Add environment feature region behavior (just with difficult terrain for now)
- (stwlam) Add animation options to TokenImage rule element
- (stwlam) Restore Z-cycling of token stacks
- (Supe) Add support for retrieving subitems and an actor's own skills in choice sets
- (Supe) Add roll option and AE-like RE support to hazards
- (Supe) Add support for defining new skills from module flags
- (Supe) Add toggle to hide strikes from stowed weapons
- (Supe) Allow no master attribute for non-familiar pets
- (Supe) Show error instead of silently failing when rolling inline checks for invalid actors

### Bugfixes

- (DocSchlock) Allow item alterations of hardness to use non-integer and negative values
- (Duncan) Add a minimum ability modifier to familiars
- (In3luki) Rerender all created messages when a Treat Wounds macro check is rerolled
- (nikolaj-a) Fix sending description to chat for actions with variants when no variant is specified
- (stwlam) Fix application of two-hand trait from strike adjustments to weapon damage dice
- (stwlam) Fix detection of item drops on tokens
- (stwlam) Fix token defaults not being taken up on compendium-actor imports
- (stwlam) Include weapon-compatible traits when generating weapon from shield
- (Supe) Fix inline checks using resolve double applying penalties
- (Supe) Prevent parties from being created in or moved into folders
- (Supe) Fix grid snap when placing bursts and emanations
- (Supe) Fix retrieving subitems from chat messages

### Data Updates

- (Abaddon) Fix Reverse Engineering prerequisite
- (Abaddon) Fix Widen the Gap prerequisites
- (Abaddon) Update Summon Nephilim Kin to remaster text
- (AFigureOfBlue) Fix typos in Grazing Deer hazard
- (Ambrose) Add action to Resonant Reflection Campaign items.
- (Ambrose) Add actions for Clawdancer dedication
- (Ambrose) Add modification class features and rule elements for Revolutionary Innovation
- (Ambrose) Add Eye Gems spellcasting entry for Demilich
- (Ambrose) Add rule elements to Feral Sense and You Don't Smell Right feats
- (Ambrose) Add SpecialStatistic rule element to Verdant Core
- (Ambrose) Add unique icons to Action Macros
- (Ambrose) Allow Marvelous Medicines to be used when not held
- (Ambrose) Automate Dragon Form resistances
- (Ambrose) Automate Ostilli Host archetype
- (Ambrose) Automate Perception bonuses on several NPCs
- (Ambrose) Automate remaining Elementalist and Player Core spellshape feats
- (Ambrose) Brushup Wild Mimic feats and Winged Warrior feats
- (Ambrose) Fix equipment on AoA NPC Bshez
- (Ambrose) Make Resonating Fork (Major) attack roll in line with others
- (Ambrose) Remove Dragonhide table from Dragonslayer's Shield description
- (Ambrose) Update aid DC for Recall the Teachings action
- (Ambrose) Update Commune description to Remaster text
- (Ambrose) Update Crystal Luminescence to use an effect
- (Ambrose) Update Oil of Potency description to remaster
- (Avery) Add Action Frequency Tracking to Familiar and NPC sheets
- (bennyty) Reword Sniping Duo label for clarity
- (Dire Weasel) Add automation for Moderate Boon (Erastil), Hamatula's Impaling Barb, Mirage Dragon's Lunging Bite, and Worm Caller Dedication's Inexorable feat
- (Dire Weasel) Add effect for Mana-Rattler Liniment and Vaultbreaker Ooze's Metallify
- (Dire Weasel) Add inline damage links to Vibrant Thorns
- (Dire Weasel) Add poisons for Howl of the Wild
- (Dire Weasel) Automate immobilized immunity for NPC Inexorable ability
- (Dire Weasel) Brush up deity boons and curses
- (Dire Weasel) Brush up Howl of the Wild equipment
- (Dire Weasel) Brush up Lion's Shield
- (Dire Weasel) Fix errata'd price for Trollhound Pick
- (Dire Weasel) Fix name of "Familiar of Parasitic Might"
- (Dire Weasel) Fix Note visibility for Shanrigol's Shred Flesh
- (Dire Weasel) Fix Ostovite's Bone Chariot weakness
- (Dire Weasel) Fix Sceaduinar's spell list and give it void healing
- (Dire Weasel) Make inline damage roll for Cauterize Wounds immutable
- (Dire Weasel) Update Acid Arrow to use `@Damage` syntax
- (Dire Weasel) Update Raise Symbol to handle unified Emblazon Armament
- (Dire Weasel) Update Gorum's Minor Curse to alter armor and shield hardness
- (Farling) Add automation for Crystal Luminescence feat
- (kromko) Add public notes to Gallowdead
- (kromko) Fix Choker of Elocution (Greater) craft requirements
- (kromko) Fix formatting for many degree of success descriptions
- (kromko) Fix Pernicious Spore Bomb (Lesser) RE text
- (kromko) Fix Show the Way heightened value
- (kromko) Fix Thaumaturge Tome Implement description
- (kromko) Replace level with rank in actor-owned Unimpeded Stride
- (Manuel Hegner) Fix price of Boots of Free Running (Greater)
- (MrVauxs) Allow Debilitating Strike to receive additional suboptions from external sources
- (MrVauxs) Automate Cooperative Soul
- (n1xx1) Fix typo in pregenerated bleed damage formula
- (nikolaj-a) Fix missing start paragraph in Sneak success description
- (Razytos) Fix typo in Favored Prey
- (rectulo) Fix range of Bramble Bush
- (Rigo) Add "ranged 100 feet" trait and hide Blindness note in Kingmaker NPC
- (Rigo) Add effects for Big Debut, Command Attention, and Upstage
- (Rigo) Add resistance effect for Spirit's Mercy
- (Rigo) Add resistance to demon attacks to Pickled Demon Tongue effects
- (Rigo) Integrate Geomancer archetype automation with environment regions
- (Rigo) Brush up Acrobat, Aldori Duelist, Alkenstar Agent, Chronoskimmer, Crystal Keeper, Edgewatch Detective, Oozemorph, Pirate, Pistol Phenom, Swarmkeeper archetypes
- (Rigo) Correct Spell Reservoir's Channeled Release action glyph
- (Rigo) Correct Thousand Pains Fulu usage
- (Rigo) Correct usage and description of Silver Salve
- (Rigo) Fix Inflammation Flask description and publication data
- (Rigo) Remove class predicate from Parallel Breakthrough
- (Rigo) Remove Conjure Bullet grant from Spellshot Dedication
- (Rigo) Update Distracting Explosion and Electrify Armor unstable DC to 15
- (Rigo) Update Worm's Repast inline damage links
- (Rigo) Use AdjustModifier in Investigator Expertise to upgrade Pursue a Lead bonus
- (stwlam) Fix damage type and kinds of Field of Life spell
- (stwlam) Fix predicate and value of RE on Effect: Emblazon Energy
- (Tikael) Add automation to Firearm Expert
- (Tikael) Add content from Curtain Call Player's Guide
- (Tikael) Fix abilities on The Librarian and variant
- (Tikael) Fix rule elements on Nephilim Lore and Powder Punch Stance effect
- (Tikael) Fix several creatures with missing spellcasting DCs
- (Tikael) Fix the case of several feats
- (Tikael) Update backgrounds to use Remaster terminology
- (TMun) Add Quest 19 NPCs
- (Trent) Add choiceset rules to Intense Implement feat

### Under the Hood

- (In3luki) Add custom `tagify-tags` HTML element that handles `Tagify` form data
- (MrVauxs) Add item and origin to appliedDamage messages
- (stwlam) Allow `target`s of `TokenPF2e#distanceTo` to be arbitrary points

## 6.0.4

### Bugfixes

- (stwlam) Fix rendering of invisible creatures when see-invisibility detection mode is in use
- (stwlam) Add temporary measure to fix abilities that function similarly to the Keen weapon property rune
- (stwlam) Update actor/item hiding from creation dialog windows for V12 (sorry about the book-item tease)
- (stwlam) Prevent AE-like rule elements from sometimes catastrophically exploding on very old actors

## 6.0.3

### System Improvements

- (jfn4th) Control rule element viewing permissions using foundry user role
- (Vauxs) Copy all homebrew feat traits to effect traits

### Bugfixes

- (Supe) Fix sheets not opening in certain instances involving bad inventory data.
- (Supe) Fix the current scene sync darkness option becoming unlocalized when the world sync setting is changed.

### Data Updates

- (Dire Weasel) Add automation and links for Howl of the Wild's Ankhrav Duster, Hive Mother Bottle, and Sargassum Phial
- (kromko) Add minor fixes for Venomtail Kobold

## 6.0.2

### System Improvements

- (MrVauxs) Add additional damage from venomous trait
- (Supe) Undo restriction for variant grid diagonals such as 5 foot diagonals. This has no impact on templates.

### Bugfixes

- (In3luki) Fix auras not being drawn when a token is created
- (Rigo) Fix localization for token light rule element form
- (stwlam) Fix NPC strikes with the thrown trait not being detected as ranged attacks
- (stwlam) Fix darkness regions not hiding tokens from players without darkvision
- (stwlam) Fix reinforced stock not benefitting from the two hand trait when the weapon is held with both hands
- (Supe) Fix creating roll tables from compendium results
- (Supe) Fix overriding striking dice using the Striking Rule Element, used in some effects such as Runic Weapon.
- (Supe) Fix the "Give" button sometimes showing to players when purchasing an item
- (Supe) Fix label for damage type overrides in the damage roll dialog
- (Supe) Fixed the Token Image Rule Element form
- (Supe) Fix markdown rendering for item alteration description overrides
- (Supe) Prevent sheet crashes from invalid skills data

### Data Updates

- (Abaddon) Fix errors in relic action descriptions
- (Abaddon) Fix broken spell link in Mahathallah
- (Ambrose M) Add missing grab ability to Unrisen (BotD) and Shisagishin (SoG)
- (Ambrose M) Correct Flame Attack for Fire Giant
- (Dire Weasel) Add ancestry feature items to Centaur
- (Dire Weasel) Add inline buttons to Summon Warden of the Wild
- (Dire Weasel) Add spell effect for Hippocampus Retreat
- (Dire Weasel) Add Surki language
- (Dire Weasel) Add automation to Mocking Chorus, Prismhydra, Stargut Hydra, and Tyrafdir
- (kromko) Fix formatting issues in some Howl of the Wild feats
- (stwlam) Update internal macros, journal entries, and roll tables to V12 schema
- (Tikael) Add inline check to the Thaumaturge's Ring Bell action

## 6.0.1

This release requires Foundry VTT version 12.327

### Highlights

- (TangledLion) Add new icon for Serum of Sex Shift

### System Improvements

- (stwlam) Add support for drag/drop repositioning of regions
- (stwlam) Add "axes" as a resistance type
- (Supe) Add ability for GMs to gift items from merchants to players for free

### Bugfixes

- (In3luki) Make pf2e specific prosemirror menu options available in journal sheets
- (In3luki) Fix scene config terrain updates with blank inputs
- (In3luki) Fix vision mode initialization before the canvas is ready
- (In3luki) Update Token Config with changes from the latest core version
- (In3luki) Show roll mode indicator for damage rolls
- (Maple) Hide non-functional UI elements when editing non-stowing containers
- (stwlam) Fix certain errors that sometimes occured with npc melee item traits
- (stwlam) Fix UUIDs for older migrations and module art
- (Supe) Fix errors with skill migrations from 6.0.0 beta 3.
- (Supe) Fix Kingmaker settlements and update to Prosemirror
- (Supe) Fix text issues in treat wounds and identify item
- (Supe) Fix rendering of invested items within non-stowing containers

### Data Updates

- (Ambrose M) Improve automation for Fire Shield
- (Dire Weasel) Add campaign effect for Stoop
- (Dire Weasel) Update automation for Howl of the Wild automation
- (DocSchlock) Add max badge value to Multilating Bite
- (DocSchlock) Update more skill ability scores to attribute modifiers for remaster
- (DocSchlock) Fixes for Season of Ghosts major story npc
- (Rigo) Add damage button to Thermal Nimbus
- (Rigo) Fix the second Clan Lore skill
- (Rigo) Move certain impulse junctions to feat description alterations
- (SpartanCPA) Minor fixes to Trample and Corrupting Gaze
- (stwlam) Fix malformed source uuids for wands held by certain NPCs
- (Tikael) Add Howl of the Wild barbarian instincts
- (Tikael) Fix automation of Awakened Animal and Swimming Animal heritage

### Under the Hood

- (stwlam) Skip excluding creature traits for NPC strikes generated from rule elements
- (Supe) Make the Strike rule's "ability" property into a resolvable

## 6.0.0 Beta 3

This release includes all data from system release 5.16.1 and requires Foundry VTT version 12.323. Several major under the hood changes have been made that would benefit from testing.

### System Improvements

- (Abaddon) Localize physical item attach button label
- (In3luki) Add support for scene environment types as well as scene environment region overrides
- (Supe) Add button to view item specific roll options in the item rules tab

### Bugfixes

- (In3luki) Fix grant item form erroring when resolvables fail
- (MrVauxs) Add support for eidolon gang up flanking
- (stwlam) Fix updating deity sanctification
- (stwlam) Remove Z key token cycling now that a similar feature exists in FoundryVTT
- (Supe) Allow class traits to be added to ability items
- (Supe) Fix display of upgrade dice in roll inspector
- (Supe) Fix resolution and updates of mergeable toggleable roll option dropdowns

### Data Updates

- (Abaddon) Fix prerequites of certain feats
- (Ambrose M) Fix and update Glass Shield and Fire Shield
- (Dire Weasel) Add effect for Mind of Menace
- (Dire Weasel) Update effect for Distracting Decoy and Shielding Wave
- (Dire Weasel) Update Cry of Destruction and Chilling Darkness
- (Dire Weasel) Fixes for Falling Portcullis and Rusted Door traps
- (Rigo) Move impulse junction notes to feat description alterations
- (rectulo) Fix malformed html in reveal hidden self
- (stwlam) Fix source id for Padli's Wand of Magic Missile

### Under the Hood

- (In3luki) Fix multiple errors caused by various uuid testing functions
- (stwlam) Convert npc attacks and kit items to foundry data models
- (Supe) Finish converting all short form skill abbreviations (ath) to skill slugs (athletics)
- (Supe) Add roll options for item and feat action type and cost

## 6.0.0 Beta 2

This release requires Foundry VTT version 12.323

### System Improvements

- (In3luki) Compact prosemirror to avoid wrapping in several locations
- (In3luki) Style pf2e custom elements in prosemirror editor
- (Supe) Use Prosemirror in character biographies, hazard sheet, npc sheet, and simple npc sheet

### Bugfixes

- (Idle) Fix dropdown in Token Light RE form
- (In3luki) Fix visibility of hidden, undetected, and unnoticed tokens
- (In3luki) Fix melee weapons gaining a range
- (In3luki) Fix new actors being assigned the wrong prototype token image
- (In3luki) Fix rolling deterministic damage such as splash
- (stwlam) Fix importing actors and items from module compendia

## 6.0.0 Beta 1

### New Features

- (In3luki, stwlam, Supe) Add support for Foundry VTT version 12

### System Improvements

- (In3luki) Switched text editor to prosemirror for item sheets
- (Supe) Tweaked token config to better represent modifications from Rules Based Vision
- (Supe) Reduced Rules Based Vision's brightness value to default foundry values for darkvision.

### Bugfixes

- (Supe) Rerender token vision when global RBV setting is changed
