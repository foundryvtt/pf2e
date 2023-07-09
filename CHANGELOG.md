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
