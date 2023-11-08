## 5.8.3

### Notice

The 5.8 series of system releases is the final one before changes from Pathfinder Player Core and Pathfinder GM Core are added. The majority of changes are simple renaming of some items, traits, and other elements, with some small tweaks to mechanics. Some of the coming non-renaming changes are more substantial:

PC options: current Witch patron themes, Wizard arcane schools, and the Tiefling & Aasimar heritages are being moved to a "PF2e Legacy Data" module, which will be available soon.

Alignment: alignment is being removed from all sheets, but the data will still exist on actors, hidden until a module enables the display of them as traits.

Variant rules: the Dual Class and Ancestry Paragon variant rules are moving to the PF2e Workbench module. Other variants that were not reprinted, like Stamina, will be staying in the system as they are difficult to reproduce in module form.

Premium modules: many adventure modules, such as those developed by Foundry Gaming and Sigil Services, keep up with system releases. This means updating the pf2e system version will be required to run such modules in the future.

We will update our system wiki with a full list of changes prior to the 5.9 system release.

### System Improvements

-   (jfn4th) Add separate setting to skip damage modifiers dialog
-   (stwlam) Enable ephemeral effects for spell damage rolls
-   (Supe) Add buttons to place measured template in spell summaries on actor sheets

### Bugfixes

-   (jfn4th) Fix NPC shield labels
-   (stwlam) Fix condition increasing in effects panel
-   (stwlam) Fix issue causing some roll substitutions to not delete parent effect after rolling
-   (stwlam) Include max stamina when determining whether massive damage is taken
-   (stwlam) Show (core Foundry) secret text in item descriptions to GMs
-   (Supe) Fix fatal override when base damage type is overwritten
-   (Supe) Fix styling for spellcasting drag handle

### Data Updates

-   (Abaddon) Fix description of Grindlegrub Steak and Jax
-   (Dire Weasel) Add automation for Burning Mammoth Commando's Cruel Cutter
-   (Dire Weasel) Add automation for House Drake's Silver Strike
-   (Dire Weasel) Add automation for Stasian Smash
-   (Dire Weasel) Add custom resistance for Perfect Droplet
-   (Dire Weasel) Add damage automation to Garrote Bolt and Garrote Shot
-   (Dire Weasel) Add effects for Glowing Lantern Fruit, Element Embodied (metal and wood), Silver Crescent, Thorn Triad
-   (Dire Weasel) Add leshy trait to Towering Growth
-   (Dire Weasel) Add Metal and Wood to effect for Elemental Absorption
-   (Dire Weasel) Add silver material effect to Sterling Dynamo strikes and magical trait with Golem Dynamo strikes
-   (Dire Weasel) Add spells to Spirit Turtle
-   (Dire Weasel) Add TokenLight to Glorious Plate, Radiant Lance, and Songbird's Brush
-   (Dire Weasel) Add Wood and Metal effects for Elemental Gift
-   (Dire Weasel) Fix physical resistance exception for The First Faithful
-   (Dire Weasel) Fix single action damage for Wronged Monk's Wrath
-   (Intervención) Fix Purple Worm Sting damage
-   (rectulo) Fix typo in description of Retch Rust feat
-   (stwlam) Fix predicate in Ongoing Strategy feat

## 5.8.2

### System Improvements

-   (stwlam) Automate damage-based instant death
-   (stwlam) Display total bulk in vehicle sheet inventory
-   (Supe) Support spell heighten trait overrides
-   (Supe) Move always show dialog toggle from the header to the dialog body

### Bugfixes

-   (stwlam) Fix issue preventing NPC loot sheet inventory from appearing to players
-   (stwlam) Fix handling of shield block buttons on damage messages
-   (Supe) Fix deleting spell fixed heightening entries
-   (Supe) Fix shield hardness label in armor sheet

### Data Updates

-   (Dire Weasel) Brush up Reginald Vancaskerkin and add effect for Overdrive Engine
-   (Dire Weasel) Fix healing links in Life Shot
-   (stwlam) Fix application of Blade Ally property rune effects on handwraps

## 5.8.1

This release updates verified core compatibility to 11.314.

### Bugfixes

-   (alexbrault) Localize damage label in item summary
-   (In3luki) Restore "Rest for the Night" button listener in character sheet
-   (stwlam) Remove checking of hands available for free-hand weapons
-   (stwlam) Fix issue preventing damage weakness associated with fire aura junction from being properly recognized

### Data Updates

-   (Dire Weasel) Add typed damage links to Manifestation Of Dahak's Focused Breath Weapon
-   (Dire Weasel) Update The Eclipse damage to `@Damage` format

## 5.8.0

### System Improvements

-   (In3luki, Supe) Add a damage-roll dialog, similar in purpose to the check roll dialog
-   (In3luki) Add "not" button to Compendium Browser filter tags
-   (stwlam) Add support for aura effect alterations
-   (stwlam) Start adding support for designating damage rolls as actually being healing
-   (stwlam) Add support for property-rune strike adjustments on melee items
-   (stwlam) Do not emit effects from auras of GM-hidden tokens
-   (stwlam) Draw aura textures underneath tokens
-   (stwlam) Make PC attacks that require free hands always visible (though still disabled) on sheet
-   (stwlam) Include UUID in actor roll options as "self:uuid:[uuid]"

### Bugfixes

-   (stwlam) Fix some bonuses and modifiers slipping by battle-form damage exclusion
-   (stwlam) Fix specific magic weapons receiving price changes due to precious materials
-   (stwlam) Fix setting of attribute domain for strikes using weapons with finesse
-   (stwlam) Localize publication form labels in actor/item sheets
-   (stwlam) Fix issue preventing ephemeral effects from operating on elemental blasts
-   (stwlam) Read in `options.difficultyClass` in `SingleCheckActionVariant#use`
-   (stwlam) Restore editability of stamina & resolve from token HUD
-   (stwlam) Fix issue preventing some automatic effect removals after rolls.
-   (Supe) Fix display of variant spell descriptions
-   (Supe) Fix some spell sheet errors and update to fieldset

### Data Updates

-   (Cerapter) Allow Thaumaturge Implements to accept homebrew
-   (Dire Weasel) Add aura to Aura of Forgetfulness
-   (Dire Weasel) Add automation for Brimorak's Flaming Weapon, Corrupted Touch, Eunemvro's Blessed Strikes, Facetbound Nullifier's Field of Force, Secret-Keeper's Designate Apostate, Shoma Lyzerius' Natural-Born Burner, Spirit Turtle's Environmental Balance
-   (Dire Weasel) Add utilize property runes on some NPC attacks
-   (Dire Weasel) Add effect for Cloak of Light and auto-heighten damage link
-   (Dire Weasel) Add effects for Blood Booster, Ghost Oil, Life-Boosting Oil, Wounding Oil
-   (Dire Weasel) Add infused alchemical items to Amateur Chemist's inventory and add attacks
-   (Dire Weasel) Add missing category to Numerian Construct action
-   (Dire Weasel) Add note and damage link to Grendel's Hands of the Murderer
-   (Dire Weasel) Add stupefied check to Vetalarana Emergent's Anticipatory Attack
-   (Dire Weasel) Brush up some NPC Pack Attacks
-   (Dire Weasel) Fix resistances and weaknesses of Bloom of Lamashtu
-   (Dire Weasel) Fix size of The Beast
-   (Dire Weasel) Fix War Formation to remove explicit damage type
-   (Dire Weasel) Set Weapon Surge effect duration to 1 round
-   (Dire Weasel) Update Desiccating Inhalation to include leveled damage in main description and add healing link
-   (Dire Weasel) Update Facetbound Cascader's Energy Ward from effect to RollOptions with suboptions
-   (Dire Weasel) Update some NPC strikes to use damage partials instead of rule elements
-   (Dire Weasel) Fix Brochmaw's Hot Oil damage
-   (In3luki) Fix issue causing hazards to not appear in compendium browser
-   (InfamousSky) Add many equipment and spell icons
-   (Intervención) Makes Overdrive Ally an action rather than passive ability
-   (rectulo) Add missing level requirement in archetype journal for Sorcerer archetype
-   (rectulo) Fix double "action-glyph" elements in some item descriptions
-   (rectulo) Fix the bonus on attack rolls in the sulfur bomb (greater) description
-   (SpartanCPA) Add Exploit Regret reaction to Ifrit Shuyookh
-   (stwlam) Add aura junction effects for fire and water elements
-   (stwlam) Fix hardness alteration of shield in sparkling targe class feature
-   (stwlam) Fix reference to "Vs. Undead" spell effect in text of Lay on Hands
-   (stwlam) Automate Keen rune, Keen-like abilities on PC options and creature attack effects
-   (stwlam) Automatically add/increase Doomed condition at extreme oracular curse stage
-   (stwlam) Remove scouting effects only after initiative rolls
-   (Supe) Add label for fire impulse junction upgrade
-   (Tikael) Add effect for Fresh Produce
-   (Tikael) Add spell effect for Positive Luminance

## 5.7.4

### Bugfixes

-   (Cuingamehtar) Remove empty common rarity tag on feat chat cards
-   (In3luki) Restore availability of stamina token bar attribute
-   (stwlam) Fix dropping feats in campaign feat group
-   (stwlam) Fix rendering error in Firefox of actor sheet inventories

## Data Updates

-   (stwlam) Automate Ghostly Resistance feat
-   (Tikael) Fix rule element in Buckler Expertise

## 5.7.3

### System Improvements

-   (stwlam) Add round-end expiry option for effects
-   (stwlam) Add search input on spell preparation dialog
-   (stwlam) Include `@target` as resolvable in strike, spell, and blast damage rolls

### Bugfixes

-   (Cerapter) Fix ancestry featgroup not being able to filter for homebrew ancestries
-   (Cerapter) Include custom IWR definitions in weaknesses and immunities
-   (stwlam) Prevent error from being thrown in some circumstances when damage dice doubling is enabled
-   (stwlam) Fix issue causing some oracular curse effects to not automatically adjust condition values
-   (stwlam) Fix issue causing thief rogues to roll unarmed strike damage with no attribute modifier
-   (Supe) Prevent party-actor data preparation failure when familiar data preparation fails

### Data Updates

-   (Cora) Make minor Kingmaker data entry tweaks and fixes
-   (CrackJackFlood) Add inert effects for Rage of Elements stances
-   (CrackJackFlood) Brush up effects for scouting
-   (Dire Weasel) Add automation for NPC Expanded Splash and update bomb Strikes
-   (Dire Weasel) Add custom resistance for Maliadi's Collar of Fire
-   (Dire Weasel) Add effect for Vitrifying Blast and Warding Statuette
-   (Dire Weasel) Add infused alchemical items to Blue Viper's (Level 20) inventory, infused trait to several NPC items
-   (Dire Weasel) Add otherTags to Rune Patron and Way of the Spellshot
-   (Dire Weasel) Brush up automation for some skeleton bestiary abilities and Vewslog's Deadeye
-   (Dire Weasel) Refresh copies of NPC bomb strikes
-   (Jesse) Add size increase for heightened Righteous Might spell effect
-   (jfn4th) Fix rarely occuring aberrant rendering of actions on PC sheet
-   (stwlam) Add alternate crit spec effect to Lavasoul feat's Magma Spike
-   (stwlam) Expire Devise a Stratagem effect at end of current round
-   (stwlam) Improve automation of Fearsome Brute feat
-   (Tikael) Add missing spells to FotRP actor
-   (Tikael) Automate Kineticist critical junctions
-   (Tikael) Automate Buckler Expertise feat
-   (Tikael) Fix DC of inline save in Mountain Quake
-   (TiloBuechsenschuss) Fix strike names for Vegetable Lamb and spell variants for Falling Stars

## 5.7.2

### System Improvements

-   (stwlam) Add support for core secret token disposition feature

### Bugfixes

-   (In3luki) Fix compendium browser publication source loading
-   (JellyfishJail) Fix check prompt showing DC 0 checks
-   (stwlam) Fix issue causing damage types to sometimes be lost when using dice doubling on critical hits
-   (stwlam) Fix advanced weapons utilizing non-advanced category proficiencies
-   (stwlam) Fix Take a Breather macro and application of damage to stamina points
-   (stwlam) Fix issue causing general skill feats to not appear in general feat group on PC sheet

### Data Updates

-   (cgollubske) Adding rules for icy disposition
-   (Dire Weasel) Remove inline damage links from Necrotic Bomb
-   (Dire Weasel) Update some NPC bomb strikes
-   (stwlam) Add crossbow other-tag to Lancer weapon

## 5.7.1

### Bugfixes

-   (Cerapter) Fix bonus feats not appearing on the character sheet
-   (In3luki) Fix stamina max value on character sheet and stamina restoration in rest for the night macro
-   (stwlam) Fix selectors for check prompt skills/saves inputs
-   (stwlam) Fix styling quirks on simple NPC sheet

## 5.7.0

### System Improvements

-   (In3luki) Have strike/elemental blast macros render attack popouts
-   (JellyfishJail) Add dialog to create check prompts in chat via party sheet and macro
-   (stwlam) Add support for custom IWR
-   (stwlam) Add support for alterations of several armor properties
-   (stwlam) Add support for defense proficiencies to MartialProficiency RE
-   (stwlam) Allow AE-likes to add simulated partial attribute boosts
-   (Supe) Add configurable effect badge min/max
-   (Supe) Add dialog to perform compendium migrations
-   (Supe) Remove bonus encumbrance from character sheet, add tooltip breakdown to encumbrance and max bulks
-   (Supe) Highlight adjusted @Damage expressions and show base value in a tooltip
-   (Supe) Include priority in header for rule element forms

### Bugfixes

-   (Dire Weasel) Fix issue with showing critical damage cue when metagame settings should prevent it
-   (Dire Weasel) Fix loss of flavor on numeric inline splash and precision
-   (Dire Weasel) Support immunity to persistent damage and wounded conditions
-   (Dire Weasel) Fix NPC effects tab being dimmed when conditions are applied
-   (In3luki) Prevent invalid `BaseSpeed` rule element from throwing error on rendering item sheets
-   (MySurvive) Fix setting of "own-turn" encounter roll option when targeting
-   (PeterG) Restore retrieval of attack targets via macro parameter
-   (stwlam) Resolve DC for unarmed-attack escape
-   (stwlam) Restore pre-expanded NPC attack descriptions
-   (Supe) Fix ability of players to roll kingdom checks
-   (Supe) Fix grievous rune usage with pick crit spec, refactor damage modifier acquisition
-   (Supe) Restore scroll position after codemirror rules edit
-   (Supe) Show DCs by default in kingdom sheet
-   (stwlam) Correctly source material valuation data for armor
-   (stwlam) Fix usability of Malevolence condition
-   (stwlam) Fix WeaponPotency RE not adding "magical" trait to weapons

### Data Updates

-   (Ariphaos) Add effect and correct spell details for Lift Nature's Caul
-   (CrackJackFlood) Brushup most alchemical bombs
-   (Dire Weasel) Add automation for Alchemical Golem's Alchemical Injection, Aurumvorax's Tenacious Stance, Azer's Burning Touch, Kragala's Percussive Reverberation, Thresholder Hermeticist's Cruel Anatomist, Thrown Weapon Mastery, Visperath's persistent acid damage, Waldgeist's Possess Tree, Change Shape Strike (Pukwudgie, Harmony In Agony, Weeping Jack)
-   (Dire Weasel) Add custom resistance exceptions to Dragonshard Guardian, Aliriel, Strigoi Progenitor
-   (Dire Weasel) Add effect for Ghostbane Fulu, Ghost Strike, Psi Strikes, Spider Climb, Stormbreaker Fulu
-   (Dire Weasel) Add inline checks for Daring Act
-   (Dire Weasel) Add light to Angelic Wings and fix fly speed
-   (Dire Weasel) Add missing links and traits to Death Gasp
-   (Dire Weasel) Add missing Zeal for Battle spell to Svaryr Soldier
-   (Dire Weasel) Add Osseous Defense Strike automation for Jitterbone Contortionist
-   (Dire Weasel) Add resistances to Oath of the Devoted
-   (Dire Weasel) Add toggle for Limb Extension
-   (Dire Weasel) Brush up automation for Blade Magus and Ivarsa's Arcane Cascade, some skeleton bestiary abilities
-   (Dire Weasel) Brush up Vilree's Alchemical Crossbow effect
-   (Dire Weasel) Fix damage on Major Blood Bomb
-   (Dire Weasel) Fix domain on Gloom Blade's RollOption
-   (Dire Weasel) Fix effect for Entwined Roots
-   (Dire Weasel) Fix link to Spell Effect: Community Repair and provide link to spell from effect
-   (Dire Weasel) Fix Matron Uldrula's Shard Shield
-   (Dire Weasel) Fix resistance exceptions for Ferrous Form and Metallic Skin
-   (Dire Weasel) Remove description from Malarunk's Cinderclaw Gauntlet attack, as it's automated
-   (Dire Weasel) Remove untyped damage link from Babau's Grievous Strike and add Note
-   (Dire Weasel) Show DC for Augury check
-   (Dire Weasel) Unify Boiling Spring's Freeze and Shatter damage and flag as death note
-   (Dire Weasel) Unify inline damage links for Shanrigol's Sapping Squeeze
-   (Dire Weasel) Update Aives's Smoke Exhalation Note to use item description
-   (Dire Weasel) Update automation for Kolo Harvan's Upward Stab
-   (Dire Weasel) Update Clockwork Hunter's Target Weakness to apply deadly d4
-   (Dire Weasel) Update Exsanguinating Ammunition for persistent bleed recovery
-   (Dire Weasel) Fix Chronomancer's Secrets so that it can be taken a second time
-   (rectulo) Fix formatting in descriptions of Prey Mutagen & Terror Spores, Staff of Sieges, and Webslinger
-   (redeux) Add PFS 3-15 NPCs and hazards
-   (stevecambridge) Condense effects for Community Repair, Corrosive Body, and Fiery Body
-   (stwlam) Add arbalest from Pathfinder Player Core
-   (stwlam) Add aura effect for Bless spell
-   (stwlam) Add breakthrough armor innovations
-   (stwlam) Add REs for Raging Resistance to Fury and Spirit instincts
-   (stwlam) Add self-applied effect for Duelist's Challenge
-   (stwlam) Change ogre hook's weapon category to martial
-   (stwlam) Remove Anticipate Peril spell effect after initiative rolls
-   (Supe) Remove extranous link in Ghosts in the Storm
-   (Supe) Add effect for Shattershields
-   (Tikael) Add content from the Season of Ghosts player's guide
-   (Tikael) Add metal and wood domains
-   (Tikael) Add Shatter Glass reaction
-   (Tikael) Adding missing traits to Straugh's claw strike
-   (Tikael) Automate Lock On feat
-   (Tikael) Fix rule element on Fearless Sash
-   (Tikael) Move ancestry text to journals and refresh pregens
-   (Tikael) Move class details to journals, refresh class item on pregens
-   (Tikael) Update Light spell effect description to remaster description

## 5.6.2

### System Improvements

-   (Supe) Add new kingdom building phase and pop open sheet

### Bugfixes

-   (stwlam) Allow all users to expand collapsed action descriptions
-   (stwlam) Fix assurance roll substitutions
-   (stwlam) Fix processing of flexible trait on armor
-   (stwlam) Fix rendering error on some rule element forms for unowned items
-   (Supe) Fix scrolling quirks in item sheet description tabs
-   (Supe) Fix detection of selected republic/thaumocracy in kingdom builder

### Data Updates

-   (Dire Weasel) Add automation for Coating Of Slime, Deflecting Wavem, and NPC Destructive Vengeance
-   (Dire Weasel) Add Note RE to NPC Gardener's Resolve and fix formatting
-   (Dire Weasel) Automate persistent damage for Accursed Touch, Core Cannon, and Vicious Fangs
-   (Supe) Automate insider training kingdom feat

## 5.6.1

### Bugfixes

-   (jfn4th) Ensure PC sheet navigation bar is always above panel content
-   (stwlam) Fix issue preventing Battle Form attacks from appearing
-   (stwlam) Fix issue causing some MAP rule elements to not apply

### Data Updates

-   (AFigureOfBlue) Fix typo in Id Ooze's puddled ambush ability
-   (Dire Weasel) Add Grab ability to Id Ooze and unify some constrict damage
-   (Dire Weasel) Add light automation to Reborn Sun Warrior's Flame Spike
-   (Dire Weasel) Refresh copies of Crimson Fulcrum Lens and Mirror Image spell across compendiums
-   (Dire Weasel) Add effect for Selfish Shield
-   (Dire Weasel) Update localized strings with "positive" or "negative" to use "vitality" or "void"
-   (stwlam) Set alliance of Ekundayo, Linzi, and Valerie to "party"
-   (Tikael) Add automation to Sarenrae's moderate boon

## 5.6.0

### System Improvements

-   (In3luki) Add forms for Aura and Token Light rule elementsRuleElement
-   (In3luki) Stack item quantities of items looted with the Loot NPCs dialog
-   (JellyfishJail) Add token-to-token visual flanking indicator when highlighting objects
-   (stwlam) Add forms for MultipleAttackPenalty and Token Image rule elements
-   (stwlam) Add support for spell damage dice type overrides
-   (stwlam) Display carried bulk and encumbrance on NPC sheet
-   (Supe) Add sheet and tooling for managing a Kingmaker kingdom
-   (Supe) Allow opening sheet of effects from effects panel tooltip
-   (Supe) Support reordering NPC abilities
-   (Supe) Add drag/drop reordering of rule elements
-   (Supe) Move character height/weight to biography

### Bugfixes

-   (In3luki) Fix overflow in Compendium Browser settings tab
-   (MySurvive) Add set-as-initiative button to kept roll for rerolls
-   (stwlam) Move on-update coercion of item-level values to document classes
-   (stwlam) Check for immunities when granting effects and conditions
-   (stwlam) Fix browsing compendiums with multiple actor/item subtypes
-   (stwlam) Predicate-test MultipleAttackPenalty rule elements
-   (stwlam) Restore rarity to spell sheet
-   (stwlam) Fix issue causing spell ranks to not be transmitted via aura effects
-   (Supe) Allow players to send loot and party (physical) items to chat
-   (Supe) Fix party tokens being actor-size linked
-   (Supe) Use thin scrollbar everywhere for Firefox

### Data Updates

-   (7H3LaughingMan) Fix saddlebags bulk reduction
-   (7H3LaughingMan) Fix stealth bonus in air Gate junction
-   (Dire Weasel) Add automation for Demonic Strength, Hammer Mastery, Open Mind item, Standard of the Primeval Howl
-   (Dire Weasel) Add damage links to The Whispering Reeds and adjust formatting
-   (Dire Weasel) Add inline check to Spellwrack
-   (Dire Weasel) Add resonant effects for several Aeon Stones
-   (Dire Weasel) Add spell effect for Endure and Foresight
-   (Dire Weasel) Brush up Dead Faine's Sneak Attack
-   (Dire Weasel) Brush up Demonologist and consolidate Breach the Abyss
-   (Dire Weasel) Emphasize Magnificent Mansion in Remaster journal
-   (Dire Weasel) Fix capitalization on Take its Course and Heightened Awareness
-   (Dire Weasel) Fix Dead Faine's toggle label to off-guard
-   (Dire Weasel) Fix labels on Spell Effect: Wish-Twisted Form
-   (Dire Weasel) Fix level of Strigoi Servant
-   (Dire Weasel) Fix predicate on Mighty Bulwark
-   (Dire Weasel) Fix some incorrect remaster spell names and fix missing emphasis
-   (Dire Weasel) Fix usage and bulk of Ring of Observation
-   (Dire Weasel) Move Glutton's Jaw's temporary Hit Points roll to Note
-   (Dire Weasel) Restore brawling group to Sharp Fangs
-   (Dire Weasel) Update damage links in Worm's Repast to auto-scale
-   (jfn4th) Fix skills, languages, items in A Few Flowers More pregens
-   (stwlam) Brush up rule elements on Crimson Fulcrum Lens
-   (stwlam) Migrate positive/negative damage types and traits to vitality/void
-   (stwlam) Use Token Mark rule element in Devise a Stratagem
-   (Supe) Fix Bond with Mortal Damage for Cunning Fox/Feathered Bear
-   (Tikael) Add content from issues 2 and 3 of Pathfinder Wake the Dead
-   (Tikael) Add remaster spells previewed in the Paizo blog
-   (Tikael) Change NPC sneak attack entries to new rules
-   (Tikael) Change NPC strike trait labels to use 'feet' instead of 'ft'
-   (Tikael) Update Sneak Attack bestiary glossary ability to simplify rules
-   (TMun) Add battleforms from Fist of the Ruby Phoenix
-   (TMun) Update license text with recent and announced products

## 5.5.3

### Bugfixes

-   (In3luki) Fix "view item" buttons on choice set prompt
-   (stwlam) Fix handling of rarity updates on non-physical items
-   (stwlam) Include hazards in encounter metrics
-   (stwlam) Remove coloration of common-rarity inventory items
-   (stwlam) Render highlights for auras on familiars
-   (stwlam) Reset aura renders when token size changes
-   (Supe) Fix aura rendering and detection for tiny tokens
-   (Supe) Don't add non-persistent damage dice and modifiers to purely persistent damage
-   (Supe) Resolve injected properties in roll note predicates

### Data Updates

-   (Dire Weasel) Add automation for Giant Gecko's Uncanny Climber
-   (Dire Weasel) Add effects for Codex of Destruction and Renewal, Knock, Repel Metal fix level
-   (Dire Weasel) Add materials to several NPC attacks
-   (Dire Weasel) Brush up and homogenize automation for Evasion and Deft Evasion
-   (Dire Weasel) Fix effect link name in Runic Weapon spell
-   (Dire Weasel) Fix Overpowering Jaws' Note visibility
-   (dogstarrb) Remove unneeded will save button from Nudge Fate
-   (Drental) Fix hardwood scamp attack bonus
-   (Abaddon) Fix Entities from Afar prerequisites
-   (shemetz) Fix handful of typos in en.json
-   (Supe) Add effect for furnace form
-   (Tikael) Add missing feat from EC player's guide
-   (Tikael) Data Entry World Fixes September 16 2023
-   (websterguy) Fix reference to master ability in Skilled familiar ability flat modifier

## 5.5.2

### System Improvements

-   (In3luki) Show action cost in feat chat card when available
-   (stwlam) Add tooltips explaining threat and XP award in encounter tracker
-   (stwlam) Add visibility toggles to PC biography sections

### Bugfixes

-   (stwlam) Fix labeling and options presentation of Striking runes in weapon sheet
-   (stwlam) Recalculate encounter metrics when party membership is changed while encounter is running
-   (Supe) Fix display of spell DCs in item summaries

### Data Updates

-   (In3luki) Eliminate console noise from Versatile Blast feat when Kinetic Aura effect isn't present
-   (Intervención) Fixed typo on Aura trait description
-   (stwlam) Predicate on encounter threat level in Battle oracle curse effect
-   (Tikael) Fix stats of Vicious Abyssal Bunny Swarm

## 5.5.1

### Bugfixes

-   (stwlam) Fix roll-data resolution in inline damage links
-   (stwlam) Restore damage buttons to NPC/hazard attack rolls
-   (Supe) Add support for brackets in Fast Healing/Regeneration rule element form

### Data Updates

-   (Dire Weasel) Add secondary save link to Beheading Buzz Saw
-   (Dire Weasel) Add effects for Flame Dancer, Galvanic Chew, Phoenix Ward, and Thermal Remedy

## 5.5.0

### System Improvements

-   (darvey) Allow dragging stashed items in party sheet to members in sidebar
-   (darvey) Add default filter to free archetype feat slots on PC sheets
-   (darvey) Add property runes missing from armor and weapon dropdowns
-   (In3luki) Add buttons to choice set prompts that open item sheets (given the choices are items)
-   (stwlam, Friz) Automatically price and rename armor with runes and precious materials
-   (stwlam) Add a system tab to scene config windows, allowing hearing radius and rules-based vision to be managed per scene.
-   (stwlam) Show basic threat/XP data in encounter tracker: will continue to refine by adding settings and ability to award XP from it.
-   (stwlam) Add an "appearance" property to Aura rule element configuration, allowing for greatly expanded control over an aura's looks. Textures, including videos, are now supported. Border and fill colors have been moved to this property.
-   (stwlam) Refine visibility rules for auras:
    -   During encounters, borders are always visible unless configured in the rule element to not be. Outside of encounters, they are only visible when a token is hovered or controlled. Only GMs can see aura borders from "opposition" (typically NPC) tokens.
    -   Highlights are only visible during encounters, and only when a token is hovered or controlled. Visibility to players follows the same rules as borders.
    -   Textures are always visible, in or out of encounters, and even to players for ones emanating from opposition tokens.

### Bugfixes

-   (darvey) Fix item summary / spell buttons firing when pressing enter elsewhere in the form
-   (Dire Weasel) Fix TempHP rule element to resolve injected properties in its predicate
-   (In3luki) Fix ancestry feats without an ancestry trait being filtered in the compendium browser feats tab
-   (In3luki) Fix "Select Other Variant" button being show on heightened spell chat cards
-   (In3luki) Fix issue causing degree of success to sometimes not be updated when rerolling.
-   (stwlam) Fix styling and content selection of limited PC sheet
-   (stwlam) Refrain from having ABP attack potency make weapons magical
-   (stwlam) Limit visibility of degree-of-success button cues in strike attack rolls
-   (stwlam) Hide spell DCs in chat cards when appropriate
-   (stwlam) Fix issue preventing NPC sneak attack from applying damage during flanking
-   (stwlam) Fix calculation of counteract total modifier
-   (Supe) Fix Grant Item form defaults
-   (Supe) Fix effects that modify degree of success of persistent-damage recovery checks

### Data Updates

-   (Abaddon) Remove duplicate skill entries for Angelique Loveless and Glaz Nixbrix
-   (arthurtrumpet) Add an effect for Emblazon Armament (Shield)
-   (Chas) Brushup rule elements on Acrobat dedication & Tumble Behind
-   (Cuingamehtar) Fix frequency of Expeditious Inspection
-   (Cuingamehtar) Improve Flame Wisp effect counter
-   (Dana) Fix inline perception check icon
-   (darvey) Add armor specialization rule elements for armor groups added in Treasure Vault
-   (Dire Weasel) Add automation for Broadleaf Shield, Ooze Ammunition, Cape of Illumination
-   (Dire Weasel) Add bleed damage to Splintering Spear
-   (Dire Weasel) Add effect for Conductive Weapon, Envenom Fangs, Ferrous Form, Ginger Chew, Journeybread (Power), Merciful Balm, Pucker Pickle, Sand Form, Spiny Lodestone, and Tremorsense (spell)
-   (Dire Weasel) Add inline Checks to Invoke The Elements
-   (Dire Weasel) Add token light to Fulminating Spear and Starfaring Cloak
-   (Dire Weasel) Fix action cost of Alicorn Lance activation
-   (Dire Weasel) Fix broken spell link and missing emphasis in Remaster Changes journal
-   (Dire Weasel) Fix damage links for Slashing Gust and Splinter Volley
-   (Dire Weasel) Fix Emblazon Armament (Shield) effect to only allow shields
-   (Dire Weasel) Fix some formatting in the GM screen and archetypes journals
-   (Dire Weasel) Unify inline damage links for Steaming Fields' Steam Jet
-   (Dire Weasel) Update Flashy Disappearance effect to include grant of Invisible condition
-   (Dire Weasel) Update torch icon and swap Strike icon when lit
-   (Drental) Add automation for Watch This!
-   (Dwim) Automate Poison Weapon feat chain
-   (Dwim) Improved automation of Gunslinger initial deeds
-   (LebombJames) Bring some inventor feats up to date with automation
-   (stwlam) Add aura to Aura of Despair
-   (stwlam) Fix rule elements on Large Bore Modifications
-   (Tikael) Add automation to Tactician's Helm
-   (Tikael) Add inline check to Disturbing Knowledge
-   (Tikael) Add missing notes to Kinzaruk
-   (Tikael) Add missing NPC from PFS 4-12
-   (Tikael) Add missing Hryngar trait
-   (Tikael) Add Talos and Ardande traits to geniekin feats
-   (Tikael) Fix applicability of effects from air and wood kinetic auras
-   (Tikael) Improve weapon inventor overdrive automation

## 5.4.4

### System Improvements

-   (Supe) Improve clarity of overland travel labeling on party sheet

### Bugfixes

-   (SkepticRobot) Fix non limited npcs showing in actors tab
-   (stwlam) Fix compendium browser rarity-tag coloration
-   (stwlam) Fix party name input being editable to non-owners of party actor
-   (stwlam) Fix width constraint of lootable NPC sheet sidebar

### Data Updates

-   (Dire Weasel) Brush up automation and add inline checks to several NPCs
-   (Dire Weasel) Add effect for Rousing Splash
-   (stwlam) Add remaining armor property runes from Treasure Vault

## 5.4.3

### System Improvements

-   (stwlam) Add UI enhancements to party stash tab: coin values, rarity coloration of item names, stash total bulk
-   (stwlam) Animate party clown car loading/unloading and incorporate wall detection when depositing tokens

### Bugfixes

-   (reyzor1991) Include roll options passed to strike methods when rolling
-   (stwlam) Make damage from ability items responsive to magical immunities, resistances, and weaknesses
-   (stwlam) Restore legacy boost row in attribute builder
-   (stwlam) Fix display of attack modifier on familiar sheet

### Data Updates

-   (Abaddon) Remove scroll case and sheath from NPCs
-   (Dire Weasel) Add automation for Gallowdead's Charge Chain, Groplit's Flammable Grease, and Umbral Dragon's Ghost Bane
-   (Dire Weasel) Add Capritellix from _Rage of Elements_
-   (Dire Weasel) Add effects for Grindlegrub Steak, Incendiary Dollop, Irondust Stew, Therapeutic Snap Peas
-   (Dire Weasel) Add inline checks to several NPC abilities
-   (Dire Weasel) Add inline healing links to Qxal's Blood Siphon
-   (Dire Weasel) Add light automation to Abysium Horror's Green Glow and Jellyfish Lamp
-   (Dire Weasel) Add spell effect for Wooden Fists
-   (Dire Weasel) Automate reach for Gallowdead's Charge Chain
-   (Dire Weasel) Fix formatting in Glass River Midge Attach
-   (Dire Weasel) Normalize damage links in Burning Grasp description
-   (Dire Weasel) Update automation for Spriggan's Enraged Growth and Bully's Bludgeon
-   (Dire Weasel) Standardize Meliosa's Leshy names and update automation
-   (Dire Weasel) Add automation for Capritellix's Shift Mood skill bonus
-   (Dire Weasel, Drental) Fix several compendium actors with errant prototype token names
-   (Dwim) Automate Fatal Bullet feat
-   (pedrogrullada) Add spell effect for Phase Familiar
-   (stwlam) Have temporary hit points from Inexorable Iron apply immediately upon adding effect
-   (Supe) Implement Nanite Surge status bonus
-   (Tikael) Add Player Core spells from War of Immortals Playtest
-   (Tikael) Add spell effect for Anima Invocation
-   (Tikael) Fix damage of Frostbite

## 5.4.2

### System Improvements

-   (Supe) Show party permission to GM in header
-   (Supe) Allow custom domains for inline damage rolls

### Bugfixes

-   (stwlam) Fix edge case where duplicate aura effects were sometimes being applied
-   (stwlam) Fix choice set prompt when homebrew item button is clicked
-   (stwlam) Fix compendium browser search by ability category
-   (stwlam) Fix issue causing some auras to not grow when replaced by larger aura with same slug
-   (Supe) Fix barbarian specialization abilities that keyed off greater weapon specialization
-   (Supe) Hide sidebar activate-party and create-member buttons from players

### Data Updates

-   (Abaddon) Fill source for Weapon Infusion effect
-   (Dire Weasel) Add automation for several NPC abilities
-   (Dire Weasel) Add inline checks to several NPC abilities
-   (Dire Weasel) Brush up Geist's Haunt and Elk's Hoof
-   (Dire Weasel) Fix Suli Dune Dancer's Elemental Assault traits
-   (Dire Weasel) Refresh copies of Ice Storm and Lightning Storm
-   (Dire Weasel) Update automation for Sounrel's Accursed Claws
-   (Dire Weasel) Update Ice Storm description and add level damage link
-   (Tikael) Add inline checks to several feats missing them

## 5.4.1

### System Improvements

-   (Supe) Save active party folder state and default to expanded

### Bugfixes

-   (stwlam) Add additional damage types from weapon infusion effect
-   (stwlam) Fix P keybind fetching active party
-   (stwlam) Refrain from deleting class features granted by feats when lowering PC level
-   (Supe) Fix deviant ability proficiencies that extend spell DCs
-   (Supe) Fix responsiveness of other parties folder
-   (Supe) Fix rolling checks for items-only spellcasting entries

### Data Updates

-   (Abaddon) Fix source for Psychic's Daze effect
-   (Dire Weasel) Add automation for several NPC abilities
-   (Dire Weasel) Add automation for Vocal Warm-Up
-   (Dire Weasel) Brush up Cinder Dispersal and Lucky Stabs
-   (Dire Weasel) Add automation for Weapon Master's Swift Blow
-   (Dire Weasel) Automate Moonlight Ray good damage
-   (Dire Weasel) Brush up NPC Skewer automation
-   (Dire Weasel) Update Ulgrem-Axaan's Territorial Rage
-   (stwlam) Add necessary class features to kineticist dedication
-   (Supe) Add toggle for pivot strike
-   (Surge) Have Soul Warden Dedication grant blue light
-   (Tikael) Fix inline actor level references in feats

## 5.4.0

### Highlights

-   The system now has a Party actor type. It is very shiny and does quite a bit!
-   A significant amount of work has been put into automating features of the Kineticist class.

### New Features

-   (stwlam) Add handling of Elemental Blast
-   (stwlam) Add support for including self-applied effects in ability/feat items
-   (Supe, Allistaar) Add party actor and sheet

### System Improvements

-   (Drental) Add keybind (default of "P") to toggle party sheet
-   (stwlam) Improve system support for Apex items (with and without ABP)
-   (stwlam) Handle precision-damage weakness and resistance
-   (stwlam) Add icon to cue which strike-damage button to click on chat messages
-   (stwlam) Add management of ABP Apex increase to attribute builder
-   (stwlam) Add support for multiple selectors in Damage Dice and Note rule elements
-   (stwlam) Alert user on PC sheet when there are unallocated attribute boosts
-   (stwlam) Create toggle macro when dropping conditions in hotbar
-   (stwlam) Make all chat messages pop-outable
-   (stwlam) Add externally accessible CSS variables for rarity and damage-type colors
-   (stwlam) Add `removeAfterRoll` property to FlatModifer REs
-   (Supe) Convert weapon specialization to rule elements
-   (Supe) Enable roll notes for damage-received
-   (Supe) Add search filter to roll inspector
-   (Supe) Add way to track partial attribute increases in manual-entry mode
-   (Supe) Add cue to alert user when their PC's armor is equipped but not invested
-   (Supe) Support restricting spell/inline dice overrides by damage type
-   (Supe) Allow Trick Magic Item counteractions

### Bugfixes

-   (Dire Weasel) Update armor usage when category changed to shield
-   (Dire Weasel) Fix rectangle templates and fix Force Cage to be cube
-   (Dire Weasel) Emit item name and UUID for remaining categories of rule element warning messages
-   (stwlam) Acquire rule-element notes for all damage rolls, regardless of source
-   (stwlam) Fix calculation of familiar AC modified by effects
-   (stwlam) Fix improvised and kickback penalties not appearing on PC sheet
-   (stwlam) Fix overwriting proficiency in light barding on PC actors (impacts Companion Compendia module)
-   (stwlam) Fix handling of container items' worn bulk
-   (stwlam) Prevent effects that expire at end of current turn from immediately expiring when not in encounter mode
-   (stwlam) Have ghost touch weakness increase damage only once instead of once per damage instance
-   (stwlam) Prevent doubling of splash damage dice on NPC attacks
-   (stwlam) Show all property runes on ABP magic items embedded in loot actors
-   (Supe) Accept modifier adjustments for multiple attack penalty
-   (Supe) Include spellcasting roll options in damage rolls
-   (Supe) Fix detection of animal companions for some types of system automation
-   (Supe) Use item level when available as fallback value in @Damage expressions referencing actor level

### Data Updates

-   (Abaddon) Fix description/source typos and inline damage formulas in several NPCs & items
-   (chrpow) Fix description of Level 3 Gate Attenuator Item
-   (Dire Weasel) Add "+1 Status to All Saves vs. Magic" to Mummy Prophet Of Set
-   (Dire Weasel) Add aura effect for Beacon of the Rowan Guard
-   (Dire Weasel) Add automation for Dazing Blow, Doprillu, Heretic's Smite, Irrepressible (Halfling), King Merlokrep's Hampering Strike, Imperious Retreat, Pearlescent Pyramid, Polished Pebble, Shoulder to Shoulder, Skirmishing Dash, Unshakable Grit, Resonant Guitar, Spiritual Aid, Wynsal's Formation Attack
-   (Dire Weasel) Add effect for Bloodseeker Beak, Death Knell, Guardian Staff, Haste spell, Sharkskin Robe, Strum of Thunder
-   (Dire Weasel) Add metal variants and bleed damage link to Needle Darts
-   (Dire Weasel) Add missing hazards from Impossible Lands
-   (Dire Weasel) Add save link to Aerial Boomerang
-   (Dire Weasel) Add TokenLight to Shard of the Third Seal
-   (Dire Weasel) Add Underwater weapon property rune
-   (Dire Weasel) Automate Quoppopak Tentacle Stab damage override
-   (Dire Weasel) Brush up data and automation for Azarim, Ji-yook's Foxfire Blast, Spelunker, Thoqqua, Wisps' In Concert ability
-   (Dire Weasel) Update Everstand Stance to use ItemAlteration
-   (Dire Weasel) Fix feat types of Flowering Path and Growth Spell
-   (Dire Weasel) Fix formatting in Erraticannon description
-   (Dire Weasel) Fix Glass Shield's spell effect hit points
-   (Dire Weasel) Fix Hagegraf Royal Guard Darkvision to be correct ability
-   (Dire Weasel) Fix Immolis' Heat Beam DC
-   (Dire Weasel) Fix level of Phantom Footsteps
-   (Dire Weasel) Fix malformed damage links in Life-Giving Form
-   (Dire Weasel) Fix Mother Maw inline roll
-   (Dire Weasel) Fix Sawtooth Saber bulk
-   (Dire Weasel) Fix rule elements in Aerial Cloak and Eat Fire
-   (Dire Weasel) Fix source of Soulbound Doll (Sky King's Tomb)
-   (Dire Weasel) Move Conch of Otherworldly Seas' Voice of Oceans automation to effect
-   (Dire Weasel) Refresh copies of feats, spells, and other abilities on many compendium actors
-   (Dire Weasel) Remove object immunity from Spell Pitchers
-   (Dire Weasel) Update Atmospheric Staff and Drazmorg's Staff of All-Sight to be weapons
-   (Dwim) Fix Lesser Dragonstorm (AoA) missing electricity damage
-   (Dwim) Fix Phylactery of Faithfulness (greater) Religion bonus
-   (In3luki) Throttle chat card button clicks to once in 500ms
-   (Jeremy) Prevent Elemental Betrayal from showing an attack button
-   (LebombJames) Create an effect for Cinder Gaze, Fix name of Ash mystery, add maneuver defense modifiers
-   (reyzor1991) fix Effect: Dazzled's expiration
-   (SpartanCPA) Add additional dice to Fiery Body effect
-   (SpartanCPA) Add Dice to Corrosive Body Effect
-   (stwlam) Add aura and spell effect for Angelic Halo
-   (Supe) Add frequency alteration from Consistent Surge
-   (Tikael) Add an effect for Devise a Stratagem
-   (Tikael, Zullock) Add automation for gate junctions
-   (Tikael) Add automation for Kinetic Aura
-   (Tikael) Add automation for The Brass Dwarf
-   (Tikael) Add Malevolence condition
-   (Tikael) Add elemental blast choices to actor data
-   (Tikael) Add Goloma trait to Goloma ancestry
-   (Tikael) Add missing Decompose action
-   (Tikael) Add many applied effects
-   (Tikael) Add removeAfterRoll to Guidance spell effect
-   (Tikael) Automate Blasting Beams deviant ability
-   (Tikael) Automate inventor's Offensive Boost
-   (Tikael) Automate Kineticist feat choices
-   (Tikael) Automate Manifold Modifications
-   (Tikael) Automate several frequency alterations
-   (Tikael) Brushup automation for Swashbuckler finishers
-   (Tikael) Brushup sorcerer bloodlines
-   (Tikael) Change several AV actors' persistent-damage notes to actual persistent damage
-   (Tikael) Clean up inline damage rolls on impulses
-   (Tikael) Fix broken inline class DCs
-   (Tikael) Fix data references in kinetic aura effects
-   (Tikael) Fix filter on Through the Gate feat
-   (Tikael) Fix name of Witchwyrd Beacon
-   (Tikael) Grant Act Together and Share Senses actions to Summoners
-   (Tikael) Localize blast labels and add traits
-   (Tikael) Move spoilers on artifacts to GM notes
-   (Tikael) Remove non-functional sense rule elements from sense good/evil
-   (Tikael) Tone down the light on Gliminal
-   (Tikael) Improve automation for Sparkling Targe
-   (TMun) Convert Ancient Dust to non-text based persistent damage application
-   (TMun) Update description to Tales in Timber armor to link ritual

## 5.3.2

### Bugfixes

-   (stwlam) Fix display of battle form attack modifiers on PC sheet
-   (stwlam) Fix issue causing auras to stop transmitting effects when multiple scenes have tokens for same actors

### Data Updates

-   (Abaddon) Fix major vigilant eye description
-   (Abaddon) Fix greater clockwork shield description
-   (chrpow) Remove reference to _scorching ray_ from _blazing bolt_'s description
-   (chrpow) Remove Persistence of Memory ability from Shadow King's statblock
-   (chrpow) Add duration and traditions to One with Stone
-   (chrpow) Add Shory Language from Stolen Fate Player's Guide
-   (chrpow) Fix localization of Composite trait
-   (SpartanCPA) Fix action type of "Too Angry to Die"
-   (stwlam) Add Swallow-Spike armor property runes
-   (stwlam) Add Versatile Poison trait
-   (stwlam) Force attribute modifier of Spellshot class DC to be intelligence
-   (Tikael) Fix immunities of Choking Tethers hazard
-   (Tikael) Add area to Grasping Grave focus spell
-   (Tikael) Add spell DC to Obrousian
-   (Tikael) Fix inline damage of Eldritch Flare

## 5.3.1

### System Improvements

-   (Supe) Support more formulas using math terms in @Damage
-   (stwlam) Show GMs remaster changes journal entry once on startup

### Bugfixes

-   (Kim) Fix issue preventing some adventure reimports
-   (stwlam) Fix attribute boost buttons sometimes not reflecting being clicked
-   (stwlam) Respect `overrideTraits` (and its absence) in @Damage expressions
-   (Supe) Add "damage" selector to @Damage
-   (Supe) Handle top-level math terms and subtraction in @Damage
-   (Supe) Assume actor is level 1 in @Damage instead of skipping
-   (Surge) Display vehicle source in description tab

### Data Updates

-   (Abaddon) Fix Bravery Baldric descriptions
-   (Abaddon) Fix Spiderfoot Brew item variants
-   (abrault) Fix spell-save button in chat cards
-   (dellatorreadrian) Fix searching actions in Compendium Browser using text and type at the same time
-   (Roxim) Add automation for Martial Performance feat
-   (stwlam) Migrate bracketed AE-likes modifying ability scores (used by Companion Compendia eidolons)
-   (Tikael) Add _Translate_ to list of renamed spells
-   (Tikael) Automate Bristle's inline damage increase
-   (Tikael) Change the Kinetic Gate feature to be renamed with selected choices
-   (Tikael) Fix broken links in remaster journal, add language changes
-   (Tikael) Move more inline rolls to the new damage format
-   (Tikael) Backfill frequencies for most NPC actions
-   (TMun) Add knockdown to cinder wolf strikes from PFS 1-14

## 5.3.0

### Highlights

-   Rage of Elements content is in. As usual with data entry from larger volumes, this is the initial pass, to be followed up with QA and automation passes.
-   A new syntax for inline rolls, `@Damage`, has been added. This has additional features & options compared to basic Foundry `/roll` expressions, such as support for pulling in modifiers and additional damage dice.

### New Features

-   (Supe) Add @Damage inline rolls

### System Improvements

-   (stwlam) Remove ability scores, rename "ability modifiers" to "attribute modifiers"
-   (stwlam) Add "Clear Placed Templates" button to area-effect spell cards
-   (stwlam) Add support for thrown weapons with reload values of 0

### Bugfixes

-   (stwlam) Fix issue causing repeating-weapon magazines to be consumed too quickly
-   (stwlam) Fix check for Deny Advantage
-   (stwlam) Fix issue causing some rule elements that check effect origins to not function at key points
-   (stwlam) Initialize apply homebrew elements early enough for utilization by rule elements
-   (stwlam) Fix numeric predication comparisons when no right-hand operands are found
-   (Supe) Fix elite/weak adjustment for cantrips
-   (Supe) Fix issue causing CPUs to be pegged while collecting information to present choice set dialogs

### Data Updates

-   (Abaddon) Fix Game Hunter Dedication prerequisite
-   (Dire Weasel, Dogstarrb, Roxim, SpartanCPA, Tikael, TMun) Add content from _Rage of Elements_
-   (Dire Weasel) Add rule elements to Aquatic Ambush creature ability
-   (Dire Weasel) Add effect for Replenishment of War
-   (Dire Weasel) Add spell effect for False Life
-   (Dire Weasel) Add swim speed to Drowned Mummy
-   (Dire Weasel) Brush up Effect: Dragon Turtle Scale and Effect: Bronze Bull Pendant
-   (Dire Weasel) Fix action cost and traits of Focusing Hum
-   (Dire Weasel) Fix copies of Ferocity missing death note
-   (Dire Weasel) Set the ability on the NPCs casting statistic
-   (Drental) Add effect for Root Magic feat
-   (hotdog) Add images to several weapons missing them
-   (n1xx1) Fix title case of at-will and constant spells
-   (redeux) Add missing attribute boosts for 4 iconic PCs
-   (SpartanCPA) Remove Spell School traits from Bestiary Glossary items
-   (SpartanCPA) Update Glossary Abilities to @Damage
-   (stwlam) Add critical specialization to Inventor Weapon Expertise (when attacking with a weapon innovation)
-   (stwlam) Have Godless Helaing feat add 5 additional healing received when called for
-   (stwlam) Add status penalty to healing received in Life curse effect
-   (stwlam) Limit moderate life curse effects to PCs with Oracle class
-   (stwlam) Migrate in-universe languages renamed in Rage of Elements
-   (stwlam) Rename all uses/mentions of "flat-footed" to "off-guard"
-   (Surge) Add missed vehicles from G&G and SoT
-   (Surge) Fix display of saving throws on sheets of vehicles with broken condition
-   (Tikael) Add new Player Core preview spells, alter existing spells
-   (Tikael) Add journal entry explaining system handling of remaster changes
-   (Tikael) Add Scions of Domora archetype journal entry
-   (Tikael) Change many compendiums item descriptions to utilize new inline @Damage syntax
-   (Tikael) Change cooldown wording on several abilities to recharge
-   (Tikael) Change harrow court items to class or spell DC
-   (Tikael) Improve automation of Flame Wisp
-   (Tikael) Remove penalty for amphibious and aquatic unarmed strikes underwater
-   (Tikael) Remove some duplicate PFS actors
-   (TMun) Add PFS 4-99 errata
-   (TMun) Correct the price of Starsong Nectar from _Treasure Vault_

## 5.2.3

### Bugfixes

-   (stwlam) Fix check for whether a feat can be taken multiple times in choice set rule elements
-   (stwlam) Fix several display issues with effects panel
-   (stwlam) Fix version check in workaround of upstream encounter-creation issue
-   (stwlam) Set label for familiar's attack-roll statistic
-   (Supe) Fix action categories label in compendium browser

### Data Updates

-   (Tikael) Fix typo in trait description
-   (stwlam) Add inline check to Swallow Whole description

## 5.2.2

### System Improvements

-   (stwlam) Add handling of disease immunity

### Bugfixes

-   (stwlam) Fix stack overflow sometimes occurring when two unlinked tokens have intersecting auras
-   (stwlam) Prevent armor speed penalty from being doubly applied to derived speeds

### Data Updates

-   (Dire Weasel) Add automatic success of saving throws against cold effects to Icy Apotheosis
-   (Dire Weasel) Fix name for Blood-Pear Tree's Bloody Pear and remove Blight ability
-   (Dire Weasel) Fix resistances for Vampire Rival and Skeleton Rivals
-   (Dire Weasel) Fix usage of Handling Gloves and Twining Chains
-   (stwlam) Fix predicates in ancestors curse effect
-   (stwlam) Have Leukodaemon's aura only affect creatures
-   (Tikael, Dire Weasel) Add basic automation to Gelid Shard archetype
-   (Tikael) Fix rule elements on Twisting Tree
-   (Tikael) Utilize inline checks against defenses in several items
-   (Tikael) Add automation to Leprechaun Magic
-   (TMun) Add "Prepare the Processional" downtime activity

## 5.2.1

### System Improvements

-   (stwlam) Prevent players from opening sheets of unidentified world items

### Bugfixes

-   (stwlam) Restore object in `CONFIG.PF2E` depended upon by some modules
-   (stwlam) Fix resolution of bracketed numeric values

### Data Updates

-   (Dire Weasel) Refresh copies of Telekinetic Projectile

## 5.2.0

### New Features

-   (stwlam) Add Item Alteration rule element
-   (stwlam) Add encumbrance automation (disabled by default)

### System Improvements

-   (Cerapter) Add pack's source package after its name in brackets on the Compendium Browser's Settings tab
-   (In3luki) Fix source of error occasionally thrown while placing measured templates
-   (stwlam) Add support for always-active toggles and predicated suboptions
-   (stwlam) Add support for in-memory-only grants of condition items
-   (stwlam) Add support for targeted inline checks against specified defenses
-   (stwlam) Test aura coverage from small cluster of origin points in addition to center
-   (stwlam) Allow labels for all effect badge types
-   (stwlam) Add `xor` predication operator
-   (stwlam) Show notification when roll options are toggled from macros
-   (stwlam) Add option to reevaluate formula effect badges every turn
-   (stwlam) Fall back to prototype token for determining name visibility of speaker
-   (stwlam) Include "parent:" (i.e., the parent item of the rule element) roll options in flat modifier testing
-   (Supe) Enable incapacitation trait for physical non-weapon items
-   (Supe) Convert spell schools to traits

### Bugfixes

-   (Idle) Add isDestroyed check to the raiseAShield action
-   (Dire Weasel) Add roll-option toggles to vehicle sheet
-   (Dire Weasel) Allow Strike RE dice property to be resolvable
-   (In3luki) Show adjusted modifier on strike MAP buttons
-   (stwlam) Fix creation of battle-form strikes from strike data with no traits
-   (stwlam) Fix default radius of hearing
-   (stwlam) Fix token Z-cycling in Foundry 11.304+
-   (stwlam) Only copy signature spells to spell ranks with max slots of at least 1
-   (Supe) Restore DC adjustments to inline checks in NPC item descriptions
-   (Supe) Acquire roll options and fix roll inspector for flat checks
-   (Supe) Fix refresh of death overlay icon on setting change
-   (Supe) Add scrollbar to familiar sheet

### Data Updates

-   (Abaddon) Normalize language of spell durations, ranges, and cast times
-   (ArthurTrumpet) Fix duration of Unleash Psyche effect
-   (Dire Weasel) Add aura effect for Mist Stalker's Mist Cloud
-   (Dire Weasel) Add automation for Arrow of Death
-   (Dire Weasel) Add automation for Bloody Barber Goon's Thunk 'n' Slice
-   (Dire Weasel) Add automation for Enchanting Arrow
-   (Dire Weasel) Add automation for Garrote Master Assassin and Starwatch Commando abilities
-   (Dire Weasel) Add effects for Deadweight Mutagens, Disrupting Strikes, Evangelist's Impaling Chain, Infernal Wound, Lerritan's Tenacious Flames, Moon Frenzy, Precious Arrow
-   (Dire Weasel) Add missing Wight Spawn ability to Drazmorg
-   (Dire Weasel) Add note to Wereant Poisoner's Vitriolic Strikes
-   (Dire Weasel) Add skills to some NPCs that were missing them
-   (Dire Weasel) Add some automation for persistent damage recovery DCs
    . Add toggle for Clunkerjunker's Fall Apart.
-   (Dire Weasel) Add traits and fix bulk for Drazmorg's Staff
-   (Dire Weasel) Add traits and fix runes and materials for Spellcutter
-   (Dire Weasel) Allow City Scavenger's subsist bonus to apply to Society
-   (Dire Weasel) Automate Construct Armor hardness breaking
-   (Dire Weasel) Brush up Corrupted Priest rule elements
-   (Dire Weasel) Brush up Spirit Touch rule elements and fix uses of :trait:undead
-   (Dire Weasel) Build/Extract: Convert EphemeralEffect UUIDs between name and ID references
-   (Dire Weasel) Continue to work around upstream error thrown when encounters are created
-   (Dire Weasel) Correct Eldritch Archer Dedication level in journal
-   (Dire Weasel) Decrease persistent fire damage recovery DC on Charhide Goblin
-   (Dire Weasel) Fix missing damage types in some inline links
-   (Dire Weasel) Fix name in description of Disrupting (Greater) and Fortification (Greater)
-   (Dire Weasel) Fill some missing NPC hardness values
-   (Dire Weasel) Fix UUID in Holy Castigation's EphemeralEffect
-   (Dire Weasel) Group ActorTraits REs
-   (Dire Weasel) Make some NPC onset times blind rolls
-   (Dire Weasel) Refresh copies of Shocking Grasp, Fumbus' Charhide Goblin heritage, several NPC items
-   (Dire Weasel) Update Ahmoza Twins's Channel Element to use suboptions
-   (Dire Weasel) Update description formatting of Hunter's Dawn, Kortos Diamond, Piereta
-   (Dire Weasel) Update Effect: Ichthyosis Mutagen for persistent bleed recovery
-   (Dire Weasel) Update Effect: Impaling Chain to cascade delete Grabbed
-   (Dire Weasel) Update Ghost Charges for Quinn and Zhang Yong
-   (Dire Weasel) Update Marut's Fists of Thunder and Lightning to be always active
-   (Dire Weasel) Update Sapling Shield rule elements
-   (Dire Weasel) Update werecreature's Moon Frenzy
-   (Drental) Fix description and traits of fearless sash
-   (stwlam) Add Assisting armor property rune
-   (stwlam) Add rule element to Strong Arm feat
-   (stwlam) Add Spell Effect for Healer's Blessing
-   (stwlam) Allow thrown weapons to configured for use as ammunition
-   (stwlam) Collect note and degree-of-success adjustment synthetics for recovery checks
-   (stwlam) Fix Ancestral Paragon choice set
-   (stwlam) Increase persistent fire damage recovery DC on tar zombies
-   (stwlam) Refresh the Amiris and the Seelahs
-   (stwlam) Reimplement Shield Ally with item alterations
-   (stwlam) Have Quicksilver mutagen reduce hit points and mark the loss as unrecoverable
-   (Tikael) Add ChoiceSet to Terrain Stalker
-   (Tikael) Add content from Sky King's Tomb Player's Guide
-   (Tikael) Add localized names for each animal form
-   (Tikael) Add missing action grant to Stalwart Defender
-   (Tikael) Brushup Quasit automation
-   (Tikael) Change Order of the Gate to a class feature
-   (Tikael) Fix rarity of Bolas
-   (Tikael, stwlam) Convert Oracle curses to badged effects
-   (UristMcClaws) Add charge to Brightshade
-   (UristMcClaws) Fix traits for Lethargy Poison

## 5.1.2

### Bugfixes

-   (stwlam) Fix regression in determining battle form attack modifiers
-   (stwlam) Restore rule-element-based token effect icons
-   (Supe) Work around obscure upstream issue resulting in PC sheets becoming unopenable immediately after updating system

### Data Updates

-   (Dire Weasel) Fix stringified level for Ashen
-   (stwlam) Fix price of major cloister robe
-   (Tikael) Fix rule element in Echo of the Fallen

## 5.1.1

### System Improvements

-   (stwlam) Indicate verified compatibility with 11.305
-   (stwlam) Have token HUD show Broken for vehicles/loot and Hidden for others
-   (stwlam) Include parent items' names and UUIDs in all rule element validation warnings
-   (stwlam) Obscure token sprite if hearing/tremorsense detection filter is applied
-   (stwlam) Remove hidden tokens from vision detection
-   (Supe) Deprecate direct access of actor system data properties (`@abilities`, `@attributes`, `@details`, etc.) in roll formulas

### Bugfixes

-   (Drental) Localize "legacy flaws" in ability builder
-   (stwlam) Apply damage-type overrides to fatal damage dice
-   (stwlam) Fix issue causing players to not immediately see token light changes from rule elements
-   (stwlam) Update emulated token hover from chat messages to work with 11.304+
-   (stwlam) Fix aberrent grid highlighting when dragging cone templates
-   (stwlam) Dodge upstream error when encounters are created
-   (stwlam) Show token name when available (instead of actor name) in roll messages for skill checks and saving throws
-   (stwlam) Fix search in basic tag selector application
-   (Tikael) Add missing localization string on NPC sheet

### Data Updates

-   (Dire Weasel) Add Frequency to Rupture Stomp description
-   (Dire Weasel) Add missing traits to Shatterstone
-   (Dire Weasel) Fix category of Gathering Moss and Propulsive Leap.
-   (Dire Weasel) Add duration to Effect: Gathering Moss.
-   (Dire Weasel) Fix level and price of Grub Gloves
-   (Dire Weasel) Fix level of Bloodknuckles
-   (Dire Weasel) Group Ankhrav's Spray Acid damage
-   (Dire Weasel) Update Calikang's Suspended Animation to use suboptions
-   (Dire Weasel) Update Effect: Fiddle to include grant of flat-footed and slowed
-   (rectulo) Fix action format for highhelm stronghold plate
-   (stwlam) Add deathdrinking weapon property rune

## 5.1.0

### Data Updates

-   (SpartanCPA) Add content from Lost Omens: Highhelm
-   (Tikael) Add content from A Few Flowers More
-   (TMun) Add NPCs from PFS 4-15
-   (Dire Weasel) Add fix heightening effects of Etheric Shards spell
-   (Dire Weasel) Add effect for Swarm Form, Touch of the Moon
-   (Dire Weasel) Add missing traits to Grimbal's Drain Mind
-   (Dire Weasel) Allow PFS Hireling boons to be taken multiple times
-   (Dire Weasel) Brush up Meleeka's Blazing-Talon Surge and Mastered Rain of Embers Stance
-   (Dire Weasel) Fix cast time of Thoughtful Gift
-   (Dire Weasel) Fix damage link in Gray Prince and add line template
-   (Dire Weasel) Fix malformed link in Grand Archive Champion, Improved
-   (Dire Weasel) Fix name of Toxic Furnace's Boiling Toxin
-   (Dire Weasel) Fix range on Meteor Shield and Razor Disc
-   (Dire Weasel) Fix reach on Blood Lords Mithral Golem's Spike
-   (Dire Weasel) Fix Strike category for Throwing Shield
-   (Dire Weasel) Move Princess Kerinza's key details to GM note
-   (stwlam) Add Keep Stone as precious material
-   (stwlam) Add remaining weapon property runes from TV and LO:KoL

### System Improvements

-   (nikolaj-a, In3luki) Add support for modifiers and notes healing recipients received modifiers and roll notes
-   (stwlam) Bump max domains settable in deity-item sheet to 6
-   (stwlam) Allow setting fixed attack modifier and damage for rule-element-based NPC strikes
-   (Supe) Always skip roll dialog for flat checks

### Bugfixes

-   (In3luki) Fix revert damage button showing for lootable NPCs
-   (In3luki) Reevaluate roll notes upon rerolling checks
-   (stwlam) Add click listener to popped-out damage messages
-   (stwlam) Fix grid highlighting placement of measured templates while dragging
-   (stwlam) Incorporate flat-footed condition immunity into flanking checks
-   (stwlam) Include roll option on NPC attacks indicating whether they are magical
-   (stwlam) Fix issue causing incorrect level to be used for some incapacitation abilities
-   (stwlam) Fix issue causing compendium browser to get stuck semi-transparent and non-interactable
-   (Supe) Fix some minor visual issues with actor inventories

## 5.0.2

### System Improvements

-   (stwlam) Set toggled RollOption rule element suboptions as `rulesSelections`

### Bugfixes

-   (Dire Weasel) Localize some Treat Wounds macro strings
-   (reyzor1991) Include rarity in ancestry item roll options
-   (stwlam) Fix compendium directory search while app is popped out
-   (stwlam) Remove 11.301 `ActorDelta` workaround, add new one for 11.302
-   (stwlam) Fix editability of AC details on NPC sheet
-   (stwlam) Refrain from adding reach trait to generated NPC range attacks
-   (stwlam) Make system `Actor#temporaryEffects` getter return objects more faithful to `ActiveEffect` interface
-   (stwlam) Fix issue causing custom AC modifiers from being editable
-   (Supe) Fix scrolling behavior on limited-permission NPC and loot sheets
-   (Supe) Filter out damage dice with invalid outcomes
-   (Supe) Fix heighten level when retrieving prepared spells from chat message

### Data Updates

-   (Dire Weasel) Add automation to Skeletal Crocodile's Reconfigure ability
-   (Dire Weasel) Add missing critical hits immunity to Carnivorous Crystal
-   (Dire Weasel) Add some missing NPC auras
-   (Dire Weasel) Add speed bonus to Grace "The Rhino" Owano's Celestial Rage
-   (Dire Weasel) Automate Lomok's Powerful Will and add aura to Aura of Courage
-   (Dire Weasel) Automate the Rabbit Prince's Perfect Will and Bloody Jab
-   (Dire Weasel) Fix Displaced Robot's Divert Power rule elements and switch to suboptions
-   (Dire Weasel) Fix Seal Fate's spell type and add effect
-   (Dire Weasel) Update several RollOption roll elements to utilize suboptions
-   (Dire Weasel) Update NPC copies of spell Seal Fate
-   (Dire Weasel) Update Sky Dragon's Divine Lightning to predicate off target rather than RollOption toggles
-   (LebombJames) Add missing True Name trait to Reveal True Name feat
-   (OrangeChris) Fix rule elements on Subtle Dampeners and Otherworldly Protection
-   (putty) Add cooking ingredients from kingmaker companion guide
-   (stwlam) Add damaging-effect roll option to Aeolaeka's Liberate the Earth ability
-   (stwlam) Fix rule element in Adopted Ancestry feat
-   (stwlam) Prevent ancestral weapon proficiencies from cascading
-   (stwlam) Prevent Order Explorer (Leaf or Storm) from granting focus points
-   (stwlam) Remove domains compendium, migrate @UUID links
-   (Tikael) Add missing gravity trait localization
-   (Tikael) Clean up creature ability glossary entries
-   (Tikael) Fix damage in Oppali statblock
-   (Tikael) Fix localization of unarmed attack resistance

## 5.0.1

### System Improvements

-   (stwlam) Add heatsight as sense type
-   (stwlam) Display progress bar during system migrations
-   (stwlam) Add vehicle hardness processing to damage application
-   (Supe) Stack items acquired or purchased from the compendium browser

### Bugfixes

-   (cdverrett94) Add core Append Number and Prepend Adjective fields to Prototype Token Config
-   (In3luki) Fix broken thumbnails in compendium sidebar `JournalEntry` search results
-   (In3luki) Fix issue causing vehicle sheet to be unopenable
-   (stwlam) Update format of source links generated in spell consumable descriptions to V11 standard
-   (stwlam) Fix compendium drag & drop functionality
-   (stwlam) Fix style issue in PC sheet's advanced alchemy template

### Data Updates

-   (Cora) Replace core compendium pack banner images
-   (Dire Weasel) Add effects for Crushing runes
-   (Dire Weasel) Move Parsus' key details to GM note
-   (Dire Weasel) Update Cyclops Bully's Terrorizing Swing rule elements and localize
-   (stwlam) Add rule elements to Snaring Anadi heritage
-   (stwlam) Update Hero Point deck to paged format, migrate UUIDs to V11 format
-   (Tikael) Add inline save to Draugr curse
-   (Tikael) Improve automation of Shield of the Unified Legion
-   (TiloBuechsenschuss) Add rule elements to Archer's Aim

## 5.0.0-beta2

### Bugfixes

-   (In3luki) Fix manual drawing of measured templates
-   (In3luki) Hide buttons to generate roll tables in compendium browser from non-GMs

### Data Updates

-   (Dire Weasel) Make Awful Approach recharge rolls blind
-   (stwlam) Fix some settings being returned with wrong values due to upstream issue
-   (stwlam) Fix broken links in some GM notes on compendium items

## 5.0.0-beta1

### New Features

-   (In3luki, stwlam, Supe) Add support for Foundry VTT version 11
-   (Drental) Port over V11 pronouns field to system player config template
-   (In3luki) Enable creation of Roll Tables from Compendium Browser search results

### System Improvements

-   (Dire Weasel) Mystify scrolls and wands when GM drops spell onto an actor sheet while holding the ALT key

### Bugfixes

-   (Dire Weasel) Fix language of warning message emitted by AdjustDegreeOfSuccess rule element
-   (oWave) Fix issue with information passed to spell variant chat messages

### Data Updates

-   (Dire Weasel) Add Aura rule elements to Tormented
-   (Dire Weasel) Add automation to Halo
-   (Dire Weasel) Add burst template to Blindpepper Bomb
-   (Dire Weasel) Add damage links to Aroden's Hearthstone, Potions of Retaliation, and Capsaicin Tonic
-   (Dire Weasel) Add effects for Potions of Resistance
-   (Dire Weasel) Add link to effect for Kreeth-Ni's Wrath of Spurned Hospitality
-   (Dire Weasel) Fix action symbols in Instinct Crowns
-   (Dire Weasel) Fix bonus in Clarity Goggles description
-   (Dire Weasel) Fix damage for Agorron Guard Claw. Add scythe to Tenebric Giant inventory.
-   (Dire Weasel) Fix descriptions of entrench melee and entrench ranged
-   (Dire Weasel) Fix radius of Burning Blossoms
-   (Dire Weasel) Fix rule elements for Telekinetic Slip
-   (Dire Weasel) Fix some Agents of Edgewatch NPCs
-   (OrangeChris) Add maxItemLevel to Gadget Specialist rule element
-   (OrangeChris) Add rule elements to Exemplary Finisher
-   (stwlam) Fix ephemeral effect transmitted by Holy Castigation feat
-   (stwlam) Fix range increments and maximum ranges on battle form attacks
-   (stwlam) Fix Twisting Tree damage die upgrade
-   (stwlam) Move April Fools bestiary creatures to Paizo Blog Bestiary
-   (Tikael) Add content from Pathfinder Wake the Dead #1
-   (Tikael) Fix rule elements on Munavri Spellblade
-   (Tikael) Organize compendiums into folders
-   (Tikael) Remove non-existant note from Track macro

### System Improvements

-   (Dana) Add shorthand syntax for multiple rollable check buttons
-   (nikolaj-a) Add Aid action implementation
-   (Supe) Convert familiar abilities to the action item type, add abilities frequency display to familiar sheet
-   (xdy) Increase/decrease item quantities by 5 if shift-clicking and by 10 if ctrl-clicking
