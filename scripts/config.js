// Damage Types
CONFIG.damageTypes = {
  "acid": "Acid",
  "bludgeoning": "Bludgeoning",
  "cold": "Cold",
  "fire": "Fire",
  "force": "Force",
  "electricity": "Electricity",
  "sonic": "Sonic",
  "negative": "Negative",
  "piercing": "Piercing",
  "poison": "Poison",
  "psychic": "Psychic",
  "positive": "Positive",
  "bleed": "Bleed",
  "mental": "Mental",
  "precision": "Precision",
  "slashing": "Slashing",
  "chaotic": "Chaotic",
  "lawful": "Lawful",
  "good": "Good",
  "evil": "Evil"
};

// Weapon Damage Types
CONFIG.weaponDamage = {
  "bludgeoning": "Bludgeoning",
  "piercing": "Piercing",
  "slashing": "Slashing"
};

// Healing Types
CONFIG.healingTypes = {
  "healing": "Healing",
  "temphp": "Healing (Temporary)"
};

// Weapon Types
CONFIG.weaponTypes = {
  "simple": "Simple Weapon",
  "martial": "Martial Weapon",
  "advanced": "Advanced Weapon",
  "unarmed": "Unarmed Attack"
};

// Weapon Types
CONFIG.weaponGroups = {
  "club": "Club",
  "knife": "Knife",
  "brawling": "Brawling",
  "spear": "Spear",
  "sword": "Sword",
  "axe": "Axe",
  "flail": "Flail",
  "polearm": "Polearm",
  "pick": "Pick",
  "hammer": "Hammer",
  "shield": "Shield",
  "dart": "Dart",
  "bow": "Bow",
  "sling": "Sling",
  "bomb": "Bomb"
};

// Weapon Descriptions
CONFIG.weaponDescriptions = {
  "club": "Critical Specialization Effect: You knock the target away from you up to 10 feet (you choose the distance). This is forced movement (page 475).",
  "knife": "Critical Specialization Effect: The target takes 1d6 persistent bleed damage. You gain an item bonus to this bleed damage equal to the weapon’s item bonus to attack rolls.",
  "brawling": "Critical Specialization Effect: The target must succeed at a Fortitude save against your class DC or be slowed 1 until the end of your next turn.",
  "spear": "Critical Specialization Effect: The weapon pierces the target, weakening its attacks. The target is clumsy 1 until the start of your next turn.",
  "sword": "Critical Specialization Effect: The target is made off‑balance by your attack, becoming ﬂat‑footed until the start of your next turn.",
  "axe": "Critical Specialization Effect: Choose one creature adjacent to the initial target and within reach. If its AC is lower than your attack roll result for the critical hit, you deal damage to that creature equal to the result of the weapon damage die you rolled (including extra dice for its potency rune, if any). This amount isn’t doubled, and no bonuses or other additional dice apply to this damage.",
  "flail": "Critical Specialization Effect: The target is knocked prone.",
  "polearm": "Critical Specialization Effect: The target is moved 5 feet in a direction of your choice. This is forced movement (page 475).",
  "pick": "Critical Specialization Effect: The weapon viciously pierces the target, who takes 2 additional damage per weapon damage die.",
  "hammer": "Critical Specialization Effect: The target is knocked prone.",
  "shield": "Critical Specialization Effect: You knock the target back from you 5 feet. This is forced movement (page 475).",
  "dart": "Critical Specialization Effect: The target takes 1d6 persistent bleed damage. You gain an item bonus to this bleed damage equal to the weapon’s item bonus to attack rolls.",
  "bow": "Critical Specialization Effect: If the target of the critical hit is adjacent to a surface, it gets stuck to that surface by the missile. The target is immobilized and must spend an Interact action to attempt a DC 10 Athletics check to pull the missile free; it can’t move from its space until it succeeds. The creature doesn’t become stuck if it is incorporeal, is liquid (like a water elemental or some oozes), or could otherwise escape without effort",
  "sling": "Critical Specialization Effect: The target must succeed at a Fortitude save against your class DC or be stunned 1.",
  "bomb": "Critical Specialization Effect: Increase the radius of the bomb’s splash damage (if any) to 10 feet."
};

// Weapon Properties
CONFIG.weaponTraits = {
  "uncommon": "Uncommon",
  "rare": "Rare",
  "agile": "Agile",
  "attached": "Attached",
  "backstabber": "Backstabber",
  "backswing": "Backswing",
  "deadly-d6": "Deadly d6",
  "deadly-d8": "Deadly d8",
  "deadly-d10": "Deadly d10",
  "deadly-d12": "Deadly d12",
  "disarm": "Disarm",
  "dwarf": "Dwarf",
  "elf": "Elf",
  "fatal-d8": "Fatal d8",
  "fatal-d10": "Fatal d10",
  "fatal-d12": "Fatal d12",
  "finesse": "Finesse",
  "forceful": "Forceful",
  "free-hand": "Free-Hand",
  "gnome": "Gnome",
  "goblin": "Goblin",
  "grapple": "Grapple",
  "halfling": "Halfling",
  "jousting-d6": "Jousting d6",
  "monk": "Monk",
  "nonlethal": "Nonlethal",
  "orc": "Orc",
  "parry": "Parry",
  "propulsive": "Propulsive",
  "range": "Range",
  "ranged-trip": "Ranged",
  "reach": "Reach",
  "shove": "Shove",
  "sweep": "Sweep",
  "tethered": "Tethered",
  "thrown-10": "Thrown 10 ft.",
  "thrown-20": "Thrown 20 ft.",
  "thrown-30": "Thrown 30 ft.",  
  "trip": "Trip",
  "twin": "Twin",
  "two-hand-d8": "Two-Hand d8",
  "two-hand-d10": "Two-Hand d10",
  "two-hand-d12": "Two-Hand d12",
  "unarmed": "Unarmed",
  "versatile-s": "Versatile S",
  "versatile-p": "Versatile P",
  "versatile-b": "Versatile B",
  "volley-30": "Volley 30 ft."
};

// Traits Descriptions
CONFIG.traitsDescriptions = {
  "common": "Anything that doesn’t list another rarity trait (uncommon, rare, or unique) automatically has the common trait. This rarity indicates that an ability, item, or spell is available to all players who meet the prerequisites for it. A creature of this rarity is generally known and can be summoned with the appropriate summon spell.",
  "uncommon": "Something of uncommon rarity requires special training or comes from a particular culture or part of the world. Some character choices give access to uncommon options, and the GM can choose to allow access for anyone. Less is known about uncommon creatures than common creatures. They typically can’t be summoned. The DC of Recall Knowledge checks related to these creature is increased by 2.",
  "rare":"This rarity indicates that a rules element is very difficult to find in the game world. A rare feat, spell, item or the like is available to players only if the GM decides to include it in the game, typically through discovery during play. Creatures with this trait are rare. They typically can’t be summoned. The DC of Recall Knowledge checks related to these creatures is increased by 5.",
  "unique":"A rules element with this trait is one-of-a-kind. The DC of Recall Knowledge checks related to creatures with this trait is increased by 10.",
  "agile": "The multiple attack penalty you take with this weapon on the second attack on your turn is –4 instead of –5, and –8 instead of –10 on the third and subsequent attacks in the turn.",
  "attached": "An attached weapon must be combined with another piece of gear to be used. The trait lists what type of item the weapon must be attached to. You must be wielding or wearing the item the weapon is attached to in order to attack with it. For example, shield spikes are attached to a shield, allowing you to attack with the spikes instead of a shield bash, but only if you’re wielding the shield. An attached weapon is usually bolted onto or built into the item it’s attached to, and typically an item can have only one weapon attached to it. An attached weapon can be affixed to an item with 10 minutes of work and a successful DC 10 Crafting check; this includes the time needed to remove the weapon from a previous item, if necessary. If an item is destroyed, its attached weapon can usually be salvaged.",
  "backstabber": "When you hit a flat-footed creature, this weapon deals 1 precision damage in addition to its normal damage. The precision damage increases to 2 if the weapon is a +3 weapon.",
  "backswing": "You can use the momentum from a missed attack with this weapon to lead into your next attack. After missing with this weapon on your turn, you gain a +1 circumstance bonus to your next attack with this weapon before the end of your turn.",
  "deadly-d6": "On a critical hit, the weapon adds a weapon damage die of the listed size. Roll this after doubling the weapon’s damage. This increases to two dice if the weapon has a greater striking rune and three dice if the weapon has a major striking rune. For instance, a rapier with a greater striking rune deals 2d8 extra piercing damage on a critical hit. An ability that changes the size of the weapon’s normal damage dice doesn’t change the size of its deadly die.",
  "deadly-d8": "On a critical hit, the weapon adds a weapon damage die of the listed size. Roll this after doubling the weapon’s damage. This increases to two dice if the weapon has a greater striking rune and three dice if the weapon has a major striking rune. For instance, a rapier with a greater striking rune deals 2d8 extra piercing damage on a critical hit. An ability that changes the size of the weapon’s normal damage dice doesn’t change the size of its deadly die.",
  "deadly-d10": "On a critical hit, the weapon adds a weapon damage die of the listed size. Roll this after doubling the weapon’s damage. This increases to two dice if the weapon has a greater striking rune and three dice if the weapon has a major striking rune. For instance, a rapier with a greater striking rune deals 2d8 extra piercing damage on a critical hit. An ability that changes the size of the weapon’s normal damage dice doesn’t change the size of its deadly die.",
  "deadly-d12": "On a critical hit, the weapon adds a weapon damage die of the listed size. Roll this after doubling the weapon’s damage. This increases to two dice if the weapon has a greater striking rune and three dice if the weapon has a major striking rune. For instance, a rapier with a greater striking rune deals 2d8 extra piercing damage on a critical hit. An ability that changes the size of the weapon’s normal damage dice doesn’t change the size of its deadly die.",
  "disarm": "You can use this weapon to Disarm with the Athletics skill even if you don’t have a free hand. This uses the weapon’s reach (if different from your own) and adds the weapon’s item bonus to attack rolls (if any) as an item bonus to the Athletics check. If you critically fail a check to Disarm using the weapon, you can drop the weapon to take the effects of a failure instead of a critical failure. On a critical success, you still need a free hand if you want to take the item.",
  "dwarf": "A creature with this trait is a member of the dwarf ancestry. Dwarves are stout folk who often live underground and typically have darkvision. An ability with this trait can be used or selected only by dwarves. An item with this trait is created and used by dwarves.",
  "elf": "A creature with this trait is a member of the elf ancestry. Elves are mysterious people with rich traditions of magic and scholarship who typically have low-light vision. An ability with this trait can be used or selected only by elves. A weapon with this trait is created and used by elves.",
  "fatal-d8": "The fatal trait includes a die size. On a critical hit, the weapon’s damage die increases to that die size instead of the normal die size, and the weapon adds one additional damage die of the listed size.",
  "fatal-d10": "The fatal trait includes a die size. On a critical hit, the weapon’s damage die increases to that die size instead of the normal die size, and the weapon adds one additional damage die of the listed size.",
  "fatal-d12": "The fatal trait includes a die size. On a critical hit, the weapon’s damage die increases to that die size instead of the normal die size, and the weapon adds one additional damage die of the listed size.",
  "finesse": "You can use your Dexterity modifier instead of your Strength modifier on attack rolls using this melee weapon. You still use your Strength modifier when calculating damage.",
  "forceful": "This weapon becomes more dangerous as you build momentum. When you attack with it more than once on your turn, the second attack gains a circumstance bonus to damage equal to the number of weapon damage dice, and each subsequent attack gains a circumstance bonus to damage equal to double the number of weapon damage dice.",
  "free-hand": "This weapon doesn’t take up your hand, usually because it is built into your armor. A free-hand weapon can’t be Disarmed. You can use the hand covered by your free-hand weapon to wield other items, perform manipulate actions, and so on. You can’t attack with a free-hand weapon if you’re wielding anything in that hand or otherwise using that hand. When you’re not wielding anything and not otherwise using the hand, you can use abilities that require you to have a hand free as well as those that require you to be wielding a weapon in that hand. Each of your hands can have only one free-hand weapon on it.",
  "gnome": "A creature with this trait is a member of the gnome ancestry. Gnomes are small people skilled at magic who seek out new experiences and usually have low-light vision. An ability with this trait can be used or selected only by gnomes. A weapon with this trait is created and used by gnomes.",
  "goblin": "A creature with this trait can come from multiple tribes of creatures, including goblins, hobgoblins, and bugbears. Goblins tend to have darkvision. An ability with this trait can be used or chosen only by goblins. A weapon with this trait is created and used by goblins.",
  "grapple": "You can use this weapon to Grapple with the Athletics skill even if you don’t have a free hand. This uses the weapon’s reach (if different from your own) and adds the weapon’s item bonus to attack rolls as an item bonus to the Athletics check. If you critically fail a check to Grapple using the weapon, you can drop the weapon to take the effects of a failure instead of a critical failure.",
  "halfling": "A creature with this trait is a member of the halfling ancestry. These small people are friendly wanderers considered to be lucky. An ability with this trait can be used or selected only by halflings. A weapon with this trait is created and used by halflings.",
  "jousting-d6": "The weapon is suited for mounted combat with a harness or similar means. When mounted, if you moved at least 10 feet on the action before your attack, add a circumstance bonus to damage for that attack equal to the number of damage dice for the weapon. In addition, while mounted, you can wield the weapon in one hand, changing the damage die to the listed value.",
  "monk": "Many monks learn to use these weapons.",
  "nonlethal": "Attacks with this weapon are nonlethal, and are used to knock creatures unconscious instead of kill them. You can use a nonlethal weapon to make a lethal attack with a –2 circumstance penalty.",
  "orc": "Orcs craft and use these weapons.",
  "parry": "This weapon can be used defensively to block attacks. While wielding this weapon, if your proficiency with it is trained or better, you can spend an Interact action to position your weapon defensively, gaining a +1 circumstance bonus to AC until the start of your next turn.",
  "propulsive": "You add half your Strength modifier (if positive) to damage rolls with a propulsive ranged weapon. If you have a negative Strength modifier, you add your full Strength modifier instead.",
  "range": "These attacks will either list a finite range or a range increment, which follows the normal rules for range increments.",
  "ranged-trip": "This weapon can be used to Trip with the Athletics skill at a distance up to the weapon’s first range increment. The skill check takes a –2 circumstance penalty. You can add the weapon’s item bonus to attack rolls as a bonus to the check. As with using a melee weapon to trip, a ranged trip doesn’t deal any damage when used to Trip.",
  "reach": "Natural attacks with this trait can be used to attack creatures up to the listed distance away instead of only adjacent creatures. Weapons with this trait are long and can be used to attack creatures up to 10 feet away instead of only adjacent creatures. For creatures that already have reach with the limb or limbs that wield the weapon, the weapon increases their reach by 5 feet.",
  "shove": "You can use this weapon to Shove with the Athletics skill even if you don’t have a free hand. This uses the weapon’s reach (if different from your own) and adds the weapon’s item bonus to attack rolls as an item bonus to the Athletics check. If you critically fail a check to Shove using the weapon, you can drop the weapon to take the effects of a failure instead of a critical failure.",
  "sweep": "This weapon makes wide sweeping or spinning attacks, making it easier to attack multiple enemies. When you attack with this weapon, you gain a +1 circumstance bonus to your attack roll if you already attempted to attack a different target this turn using this weapon.",
  "tethered": "This weapon is attached to a length of rope or chain that allows you to retrieve it after it has left your hand. If you have a free hand while wielding this weapon, you can use an Interact action to pull the weapon back into your grasp after you have thrown it as a ranged attack or after it has been disarmed (unless it is being held by another creature).",
  "thrown-10": "You can throw this weapon as a ranged attack. A thrown weapon adds your Strength modifier to damage just like a melee weapon does. When this trait appears on a melee weapon, it also includes the range increment.",
  "thrown-20": "You can throw this weapon as a ranged attack. A thrown weapon adds your Strength modifier to damage just like a melee weapon does. When this trait appears on a melee weapon, it also includes the range increment.",
  "thrown-30": "You can throw this weapon as a ranged attack. A thrown weapon adds your Strength modifier to damage just like a melee weapon does. When this trait appears on a melee weapon, it also includes the range increment.",  
  "trip": "You can use this weapon to Trip with the Athletics skill even if you don’t have a free hand. This uses the weapon’s reach (if different from your own) and adds the weapon’s item bonus to attack rolls as an item bonus to the Athletics check. If you critically fail a check to Trip using the weapon, you can drop the weapon to take the effects of a failure instead of a critical failure.",
  "twin": "These weapons are used as a pair, complementing each other. When you attack with a twin weapon, you add a circumstance bonus to the damage roll equal to the weapon’s number of damage dice if you have previously attacked with a different weapon of the same type this turn. The weapons must be of the same type to benefit from this trait, but they don’t need to have the same runes.",
  "two-hand-d8": "This weapon can be wielded with two hands. Doing so changes its weapon damage die to the indicated value. This change applies to all the weapon’s damage dice, such as those from striking runes.",
  "two-hand-d10": "This weapon can be wielded with two hands. Doing so changes its weapon damage die to the indicated value. This change applies to all the weapon’s damage dice, such as those from striking runes.",
  "two-hand-d12": "This weapon can be wielded with two hands. Doing so changes its weapon damage die to the indicated value. This change applies to all the weapon’s damage dice, such as those from striking runes.",
  "unarmed": "An unarmed attack uses your body rather than a manufactured weapon. An unarmed attack isn’t a weapon, though it’s categorized with weapons for weapon groups, and it might have weapon traits. Since it’s part of your body, an unarmed attack can’t be Disarmed. It also doesn’t take up a hand, though a fist or other grasping appendage follows the same rules as a free-hand weapon.",
  "versatile-s": "A versatile weapon can be used to deal a different type of damage than that listed in the Damage entry. This trait indicates the alternate damage type. For instance, a piercing weapon that is versatile S can be used to deal piercing or slashing damage. You choose the damage type each time you make an attack.",
  "versatile-p": "A versatile weapon can be used to deal a different type of damage than that listed in the Damage entry. This trait indicates the alternate damage type. For instance, a piercing weapon that is versatile S can be used to deal piercing or slashing damage. You choose the damage type each time you make an attack.",
  "versatile-b": "A versatile weapon can be used to deal a different type of damage than that listed in the Damage entry. This trait indicates the alternate damage type. For instance, a piercing weapon that is versatile S can be used to deal piercing or slashing damage. You choose the damage type each time you make an attack.",
  "volley-30": "This ranged weapon is less effective at close distances. Your attacks against targets that are at a distance within the range listed take a –2 penalty.",
  "attack": "An ability with this trait involves an attack. For each attack you make beyond the first on your turn, you take a multiple attack penalty.",
  "death": "An effect with the death trait kills you immediately if it reduces you to 0 HP. Some death effects can bring you closer to death or slay you outright without reducing you to 0 HP.",
  "disease": "An effect with this trait applies one or more diseases. A disease is typically an affliction.",
  "downtime": "An activity with this trait takes a day or more, and can be used only during downtime.",
  "drug": "Note from Nethys: no description was provided for this trait",
  "environement": "A hazard with this trait is something dangerous that’s part of the natural world, such as quicksand or harmful mold.",
  "extradimensional": "This effect or item creates an extradimensional space. An extradimensional effect placed inside another extradimensional space ceases to function until it is removed.",
  "focused": "An item with this trait can give you an additional Focus Point.This focus point is separate from your focus pool and doesn’t count toward the cap on your focus pool. You can gain this benefit only if you have a focus pool, and there might be restrictions on how the point can be used. You can’t gain more than 1 Focus Point per day from focused items.",
  "fortune": "A fortune effect beneficially alters how you roll your dice. You can never have more than one fortune effect alter a single roll. If multiple fortune effects would apply, you have to pick which to use. If a fortune effect and a misfortune effect would apply to the same roll, the two cancel each other out, and you roll normally.",
  "general": "A type of feat that any character can select, regardless of ancestry and class, as long as they meet the prerequisites. You can select a feat with this trait when your class grants a general feat.",
  "haunt": "A hazard with this trait is a spiritual echo, often of someone with a tragic death. Putting a haunt to rest often involves resolving the haunt’s unfinished business. A haunt that hasn’t been properly put to rest always returns after a time.",
  "healing": "A healing effect restores a creature’s body, typically by restoring Hit Points, but sometimes by removing diseases or other debilitating effects.",
  "incorporeal": "An incorporeal creature or object has no physical form. It can pass through solid objects, including walls. When inside an object, an incorporeal creature can’t perceive, attack, or interact with anything outside the object, and if it starts its turn in an object, it is slowed 1. Corporeal creatures can pass through an incorporeal creature, but they can’t end their movement in its space. An incorporeal creature can’t attempt Strength-based checks against physical creatures or objects—only against incorporeal ones—unless those objects have the ghost touch property rune. Likewise, a corporeal creature can’t attempt Strength-based checks against incorporeal creatures or objects. Incorporeal creatures usually have immunity to effects or conditions that require a physical body, like disease, poison, and precision damage. They usually have resistance against all damage (except force damage and damage from Strikes with the ghost touch property rune), with double the resistance against non-magical damage.",
  "infused": "You created an alchemical item with the infused trait using your infused reagents, and it has a limited time before it becomes inert. Any nonpermanent effects from your infused alchemical items, with the exception of afflictions such as slow-acting poisons, end when you make your daily preparations again.",
  "light": "Light effects overcome non-magical darkness in the area, and can counteract magical darkness. You must usually target darkness magic with your light magic directly to counteract the darkness, but some light spells automatically attempt to counteract darkness.",
  "linguistic": "An effect with this trait depends on language comprehension. A linguistic effect that targets a creature works only if the target understands the language you are using.",
  "litany": "Litanies are special devotion spells, typically used by champions and requiring a single action, that usually give temporary immunity to further litanies.",
  "mechanical": "A hazard with this trait is a constructed physical object.",
  "mental": "A mental effect can alter the target’s mind. It has no effect on an object or a mindless creature.",
  "minion": "Minions are creatures that directly serve another creature. A creature with this trait can use only 2 actions per turn and can’t use reactions. Your minion acts on your turn in combat, once per turn, when you spend an action to issue it commands. For an animal companion, you Command an Animal; for a minion that’s a spell or magic item effect, like a summoned minion, you Sustain a Spell or Sustain an Activation; if not otherwise specified, you issue a verbal command, a single action with the auditory and concentrate traits. If given no commands, minions use no actions except to defend themselves or to escape obvious harm. If left unattended for long enough, typically 1 minute, mindless minions usually don’t act, animals follow their instincts, and sapient minions act how they please.",
  "misfortune": "A misfortune effect detrimentally alters how you roll your dice. You can never have more than one misfortune effect alter a single roll. If multiple misfortune effects would apply, the GM decides which is worse and applies it. If a fortune effect and a misfortune effect would apply to the same roll, the two cancel each other out, and you roll normally.",
  "move": "An action with this trait involves moving from one space to another.",
  "possession": "Effects with this trait allow a creature to project its mind and spirit into a target. A creature immune to mental effects can’t use a possession effect. While possessing a target, a possessor’s true body is unconscious (and can’t wake up normally), unless the possession effect allows the creature to physically enter the target. Whenever the target takes damage, the possessor takes half that amount of damage as mental damage. A possessor loses the benefits of any of its active spells or abilities that affect its physical body, though it gains the benefits of the target’s active spells and abilities that affect their body. A possessor can use any of the target’s abilities that are purely physical, and it can’t use any of its own abilities except spells and purely mental abilities. The GM decides whether an ability is purely physical or purely mental. A possessor uses the target’s attack modifier, AC, Fortitude save, Reflex save, Perception, and physical skills, and its own Will save, mental skills, spell attack roll, and spell DC; benefits of invested items apply where relevant (the possessor’s invested items apply when using its own values, and the target’s invested items apply when using the target’s values). A possessor gains no benefit from casting spells that normally affect only the caster, since it isn’t in its own body. The possessor must use its own actions to make the possessed creature act. If a possessor reaches 0 Hit Points through any combination of damage to its true body and mental damage from the possession, it is knocked out as normal and the possession immediately ends. If the target reaches 0 Hit Points first, the possessor can either fall unconscious with the body and continue the possession or end the effect as a free action and return to its body. If the target dies, the possession ends immediately and the possessor is stunned for 1 minute.",
  "precious": "Valuable materials with special properties have the precious trait. They can be substituted for base materials when you Craft items.",
  "prediction": "Effects with this trait determine what is likely to happen in the near future. Most predictions are divinations.",
  "reload": "While all weapons need some amount of time to get into position, many ranged weapons also need to be loaded and reloaded. This entry indicates how many Interact actions it takes to reload such weapons. This can be 0 if drawing ammunition and firing the weapon are part of the same action. If an item takes 2 or more actions to reload, the GM determines whether they must be performed together as an activity, or you can spend some of those actions during one turn and the rest during your next turn.",
  "revelation": "Effects with this trait see things as they truly are.",
  "scrying": "A scrying effect lets you see, hear, or otherwise get sensory information from a distance using a sensor or apparatus, rather than your own eyes and ears.",
  "shadow": "This magic involves shadows or the energy of the Shadow Plane.",
  "sleep": "This effect can cause a creature to fall asleep or get drowsy.",
  "splash": "When you use a thrown weapon with the splash trait, you don’t add your Strength modifier to the damage roll. If an attack with a splash weapon fails, succeeds, or critically succeeds, all creatures within 5 feet of the target (including the target) take the listed splash damage. On a failure (but not a critical failure), the target of the attack still takes the splash damage. Add splash damage together with the initial damage against the target before applying the target’s weaknesses or resistances. You don’t multiply splash damage on a critical hit.",
  "summoned": "A creature called by a conjuration spell or effect gains the summoned trait. A summoned creature can’t summon other creatures, create things of value, or cast spells that require a cost. It has the minion trait. If it tries to cast a spell of equal or higher level than the spell that summoned it, it overpowers the summoning magic, causing the summoned creature’s spell to fail and the summon spell to end. Otherwise, the summoned creature uses the standard abilities for a creature of its kind. It generally attacks your enemies to the best of its abilities. If you can communicate with it, you can attempt to command it, but the GM determines the degree to which it follows your commands. Immediately when you finish Casting the Spell, the summoned creature uses its 2 actions for that turn. Summoned creatures can be banished by various spells and effects. They are automatically banished if reduced to 0 Hit Points or if the spell that called them ends.",
  "tattoo": "A tattoo is a type of item that is drawn or cut into a creature’s skin and usually takes the form of images or symbols.",
  "teleportation": "Teleportation effects allow you to instantaneously move from one point in space to another. Teleportation does not usually trigger reactions based on movement.",
  "trap": "A hazard or item with this trait is constructed to hinder interlopers.",
  "virulent": "Afflictions with the virulent trait are harder to remove. You must succeed at two consecutive saves to reduce a virulent affliction’s stage by 1. A critical success reduces a virulent affliction’s stage by only 1 instead of by 2.",
  "skill": "A general feat with the skill trait improves your skills and their actions or gives you new actions for a skill. A feat with this trait can be selected when a class grants a skill feat or general feat. Archetype feats with the skill trait can be selected in place of a skill feat if you have that archetype’s dedication feat.",
  "dwarf": "A creature with this trait is a member of the dwarf ancestry. Dwarves are stout folk who often live underground and typically have darkvision. An ability with this trait can be used or selected only by dwarves. An item with this trait is created and used by dwarves.",
  "elf": "A creature with this trait is a member of the elf ancestry. Elves are mysterious people with rich traditions of magic and scholarship who typically have low-light vision. An ability with this trait can be used or selected only by elves. A weapon with this trait is created and used by elves.",
  "gnome": "A creature with this trait is a member of the gnome ancestry. Gnomes are small people skilled at magic who seek out new experiences and usually have low-light vision. An ability with this trait can be used or selected only by gnomes. A weapon with this trait is created and used by gnomes.",
  "goblin": "A creature with this trait can come from multiple tribes of creatures, including goblins, hobgoblins, and bugbears. Goblins tend to have darkvision. An ability with this trait can be used or chosen only by goblins. A weapon with this trait is created and used by goblins.",
  "half-elf": "A creature with this trait is part human and part elf. An ability with this trait can be used or selected only by half-elves.",
  "halfling": "A creature with this trait is a member of the halfling ancestry. These small people are friendly wanderers considered to be lucky. An ability with this trait can be used or selected only by halflings. A weapon with this trait is created and used by halflings.",
  "half-orc": "A creature with this trait is part human and part orc. An ability with this trait can be used or selected only by half-orcs.",
  "human": "A creature with this trait is a member of the human ancestry. Humans are a diverse array of people known for their adaptability. An ability with this trait can be used or selected only by humans.",  
  "manipulate": "You must physically manipulate an item or make gestures to use an action with this trait. Creatures without a suitable appendage can’t perform actions with this trait. Manipulate actions often trigger reactions.",
  "additive1": "Feats with the additive trait allow you to spend actions to add special substances to bombs or elixirs. You can add only one additive to a single alchemical item, and attempting to add another spoils the item. You can typically use actions with the additive trait only when you’re creating an infused alchemical item, and some can be used only with the Quick Alchemy action. The additive trait is always followed by a level, such as additive 2. An additive adds its level to the level of the alchemical item you’re modifying; the result is the new level of the mixture. The mixture’s item level must be no higher than your advanced alchemy level",
  "additive2": "Feats with the additive trait allow you to spend actions to add special substances to bombs or elixirs. You can add only one additive to a single alchemical item, and attempting to add another spoils the item. You can typically use actions with the additive trait only when you’re creating an infused alchemical item, and some can be used only with the Quick Alchemy action. The additive trait is always followed by a level, such as additive 2. An additive adds its level to the level of the alchemical item you’re modifying; the result is the new level of the mixture. The mixture’s item level must be no higher than your advanced alchemy level",
  "additive3": "Feats with the additive trait allow you to spend actions to add special substances to bombs or elixirs. You can add only one additive to a single alchemical item, and attempting to add another spoils the item. You can typically use actions with the additive trait only when you’re creating an infused alchemical item, and some can be used only with the Quick Alchemy action. The additive trait is always followed by a level, such as additive 2. An additive adds its level to the level of the alchemical item you’re modifying; the result is the new level of the mixture. The mixture’s item level must be no higher than your advanced alchemy level",
  "alchemical": "Alchemical items are powered by reactions of alchemical reagents. Alchemical items aren’t magical and don’t radiate a magical aura.",
  "archetype": "This feat belongs to an archetype.",
  "auditory": "Auditory actions and effects rely on sound. An action with the auditory trait can be successfully performed only if the creature using the action can speak or otherwise produce the required sounds. A spell or effect with the auditory trait has its effect only if the target can hear it. This applies only to sound-based parts of the effect, as determined by the GM. This is different from a sonic effect, which still affects targets who can’t hear it (such as deaf targets) as long as the effect itself makes sound.",
  "aura": "An aura is an emanation that continually ebbs out from you, af ecting creatures within a certain radius. Aura can also refer to the magical signature of an item or a creature with a strong alignment.",
  "cantrip": "A spell you can cast at will that is automatically heightened to half your level rounded up.",
  "companion": "An item with this trait can be worn by an animal companion or similar creature. A companion can have up to two items invested.",
  "composition": "To cast a composition cantrip or focus spell, you usually use a type of Performance. If the spell includes a verbal component, you must use an auditory performance, and if it includes a somatic component, you must use a visual one. The spell gains all the traits of the performance you used. You can cast only one composition spell each turn, and you can have only one active at a time. If you cast a new composition spell, any ongoing effects from your previous composition spell end immediately.",
  "concentrate": "An action with this trait requires a degree of mental concentration and discipline.",
  "consecration": "DedicA consecration spell enhances an area for an extended period of time. A given area can have only a single consecration effect at a time. The new effect attempts to counteract any existing one in areas of overlap.ation",
  "contact": "This poison is delivered by contact with the skin.",
  "curse": "A curse is an effect that places some long-term affliction on a creature. Curses are always magical and are typically the result of a spell or trap.",
  "darkness": "Darkness effects extinguish non-magical light in the area, and can counteract less powerful magical light. You must usually target light magic with your darkness magic directly to counteract the light, but some darkness spells automatically attempt to counteract light.",
  "dedication": "You must select a feat with this trait to apply an archetype to your character.",
  "detection": "Effects with this trait attempt to determine the presence or location of a person, object, or aura.",
  "emotion": "This effect alters a creature’s emotions. Effects with this trait always have the mental trait as well. Creatures with special training or that have mechanical or artificial intelligence are immune to emotion effects.",
  "exploration": "An activity with this trait takes more than a turn to use, and can usually be used only during exploration mode.",
  "fear": "Fear effects evoke the emotion of fear. Effects with this trait always have the mental and emotion traits as well.",
  "flourish": "Flourish actions are actions that require too much exertion to perform a large number in a row. You can use only 1 action with the flourish trait per turn.",
  "incapacitation": "An ability with this trait can take a character completely out of the fight or even kill them, and it’s harder to use on a more powerful character. If a spell has the incapacitation trait, any creature of more than twice the spell’s level treats the result of their check to prevent being incapacitated by the spell as one degree of success better, or the result of any check the spellcaster made to incapacitate them as one degree of success worse. If any other effect has the incapacitation trait, a creature of higher level than the item, creature, or hazard generating the effect gains the same benefits.",
  "instinct": "Instinct abilities require a specific instinct; you lose access if you perform acts anathema to your instinct.",
  "magical": "Something with the magical trait is imbued with magical energies not tied to a specific tradition of magic. A magical item radiates a magic aura infused with its dominant school of magic. Some items or effects are closely tied to a particular tradition of magic. In these cases, the item has the arcane, divine, occult, or primal trait instead of the magical trait. Any of these traits indicate that the item is magical.",
  "metamagic": "Actions with the metamagic trait, usually from metamagic feats, tweak the properties of your spells. You must use a metamagic action directly before Casting the Spell you want to alter. If you use any action (including free actions and reactions) other than Cast a Spell directly after, you waste the benefits of the metamagic action. Any additional effects added by a metamagic action are part of the spell’s effect, not of the metamagic action itself.",
  "morph": "Effects that slightly alter a creature’s form have the morph trait. Any Strikes specifically granted by a morph effect are magical. You can be affected by multiple morph spells at once, but if you morph the same body part more than once, the second morph effect attempts to counteract the first (in the same manner as two polymorph effects, described in that trait). Your morph effects might also end if you are polymorphed and the polymorph effect invalidates or overrides your morph effect. The GM determines which morph effects can be used together and which can’t.",
  "multiclass": "Archetypes with the multiclass trait represent diversifying your training into another class’s specialties. You can’t select a multiclass archetype’s dedication feat if you are a member of the class of the same name.",
  "oath": "Oaths add an additional tenet to your code. You can usually have only one feat with this trait.",
  "open": "These maneuvers work only as the first salvo on your turn. You can use an open only if you haven’t used an action with the attack or open trait yet this turn.",
  "polymorph": "These effects transform the target into a new form. A target can’t be under the effect of more than one polymorph effect at a time. If it comes under the effect of a second polymorph effect, the second polymorph effect attempts to counteract the first. If it succeeds, it takes effect, and if it fails, the spell has no effect on that target. Any Strikes specifically granted by a polymorph effect are magical. Unless otherwise stated, polymorph spells don’t allow the target to take on the appearance of a specific individual creature, but rather just a generic creature of a general type or ancestry. If you take on a battle form with a polymorph spell, the special statistics can be adjusted only by circumstance bonuses, status bonuses, and penalties. Unless otherwise noted, the battle form prevents you from casting spells, speaking, and using most manipulate actions that require hands. (If there’s doubt about whether you can use an action, the GM decides.) Your gear is absorbed into you; the constant abilities of your gear still function, but you can’t activate any items.",
  "press": "Actions with this trait allow you to follow up earlier attacks. An action with the press trait can be used only if you are currently affected by a multiple attack penalty. Some actions with the press trait also grant an effect on a failure. The effects that are added on a failure don’t apply on a critical failure. If your press action succeeds, you can choose to apply the failure effect instead. (For example, you may wish to do this when an attack deals no damage due to resistance.) Because a press action requires a multiple attack penalty, you can’t use one when it’s not your turn, even if you use the Ready activity.",
  "rage": "You must be raging to use abilities with the rage trait, and they end automatically when you stop raging.",
  "secret": "The GM rolls the check for this ability in secret.",
  "stance": "A stance is a general combat strategy that you enter by using an action with the stance trait, and that you remain in for some time. A stance lasts until you get knocked out, until its requirements (if any) are violated, until the encounter ends, or until you enter a new stance, whichever comes first. After you use an action with the stance trait, you can’t use another one for 1 round. You can enter or be in a stance only in encounter mode.",
  "visual": "A visual effect can affect only creatures that can see it. This applies only to visible parts of the effect, as determined by the GM.",
  "chaotic": "Chaotic effects often manipulate energy from chaos-aligned Outer Planes and are anathema to lawful divine servants or divine servants of lawful deities. A creature with this trait is chaotic in alignment. An ability with this trait can be selected or used only by chaotic creatures.",
  "evil": "Evil effects often manipulate energy from evil-aligned Outer Planes and are antithetical to good divine servants or divine servants of good deities. A creature with this trait is evil in alignment. An ability with this trait can be selected or used only by evil creatures.",
  "good": "Good effects often manipulate energy from good-aligned Outer Planes and are antithetical to evil divine servants or divine servants of evil deities. A creature with this trait is good in alignment. An ability with this trait can be selected or used only by good creatures.",
  "lawful": "Lawful effects often manipulate energy from law-aligned Outer Planes and are antithetical to chaotic divine servants or divine servants of chaotic deities. A creature with this trait is lawful in alignment. An ability with this trait can be selected or used by lawful creatures only.",
  "arcane": "This magic comes from the arcane tradition, which is built on logic and rationality. Anything with this trait is magical.",
  "divine": "This magic comes from the divine tradition, drawing power from deities or similar sources. Anything with this trait is magical.",
  "occult": "This magic comes from the occult tradition, calling upon bizarre and ephemeral mysteries. Anything with this trait is magical.",
  "primal": "This magic comes from the primal tradition, connecting to the natural world and instinct. Anything with this trait is magical.",
  "air": "Effects with the air trait either manipulate or conjure air. Those that manipulate air have no effect in a vacuum or an area without air. Creatures with this trait consist primarily of air or have a magical connection to that element.",
  "earth": "Effects with the earth trait either manipulate or conjure earth. Those that manipulate earth have no effect in an area without earth. Creatures with this trait consist primarily of earth or have a magical connection to that element.",
  "fire": "Effects with the fire trait deal fire damage or either conjure or manipulate fire. Those that manipulate fire have no effect in an area without fire. Creatures with this trait consist primarily of fire or have a magical connection to that element.",
  "water": "Effects with the water trait either manipulate or conjure water. Those that manipulate water have no effect in an area without water. Creatures with this trait consist primarily of water or have a magical connection to the element.",
  "abjuration": "Effects and magic items with this trait are associated with the abjuration school of magic, typically involving protection or wards.",
  "conjuration": "Effects and magic items with this trait are associated with the conjuration school of magic, typically involving summoning, creation, teleportation, or moving things from place to place.",
  "divination": "The divination school of magic typically involves obtaining or transferring information, or predicting events.",
  "enchantment": "Effects and magic items with this trait are associated with the enchantment school of magic, typically involving mind control, emotion alteration, and other mental effects.",
  "evocation": "Effects and magic items with this trait are associated with the evocation school of magic, typically involving energy and elemental forces.",
  "illusion": "Effects and magic items with this trait are associated with the illusion school of magic, typically involving false sensory stimuli.",
  "necromancy": "Effects and magic items with this trait are associated with the necromancy school of magic, typically involving forces of life and death.",
  "transmutation": "Effects and magic items with this trait are associated with the transmutation school of magic, typically changing something’s form.",
  "acid": "Effects with this trait deal acid damage. Creatures with this trait have a magical connection to acid.",
  "cold": "Effects with this trait deal cold damage. Creatures with this trait have a connection to magical cold.",
  "electricity": "Effects with this trait deal electricity damage. A creature with this trait has a magical connection to electricity.",
  "force": "Effects with this trait deal force damage or create objects made of pure magical force.",
  "positive": "Effects with this trait heal living creatures with positive energy, deal positive energy damage to undead, or manipulate positive energy.",
  "sonic": "An effect with the sonic trait functions only if it makes sound, meaning it has no effect in an area of silence or in a vacuum. This is different from an auditory spell, which is effective only if the target can hear it. A sonic effect might deal sonic damage.",
  "negative": "Effects with this trait heal undead creatures with negative energy, deal negative damage to living creatures, or manipulate negative energy.",
  "complex": "A hazard with this trait takes turns in an encounter.",
  "alchemist": "This indicates abilities from the alchemist class.",
  "barbarian": "This indicates abilities from the barbarian class.",
  "bard": "This indicates abilities from the bard class.",
  "champion": "This indicates abilities from the champion class.",
  "cleric": "This indicates abilities from the cleric class.",
  "druid": "This indicates abilities from the druid class.",
  "fighter": "This indicates abilities from the fighter class.",
  "monk": "Abilities with this trait are from the monk class. A weapon with this trait is primarily used by monks.",
  "ranger": "This indicates abilities from the ranger class.",
  "rogue": "This indicates abilities from the rogue class.",
  "sorcerer": "This indicates abilities from the sorcerer class.",
  "wizard": "This indicates abilities from the wizard class.",
  "bulwark": "The armor covers you so completely that it provides benefits against some damaging effects. On Reflex saves to avoid a damaging effect, such as a fireball, you add a +3 modifier instead of your Dexterity modifier.",
  "comfort": "The armor is so comfortable that you can rest normally while wearing it.",
  "flexible": "The armor is flexible enough that it doesn’t hinder most actions. You don’t apply its check penalty to Acrobatics or Athletics checks.",
  "noisy": "This armor is loud and likely to alert others to your presence when you’re using the Avoid Notice exploration activity.",
  "ingested": "This poison is delivered when drunk or eaten.",
  "inhaled": "This poison is delivered when breathed in.",
  "injury": "This poison is delivered by damaging the recipient.",
  "poison": "An effect with this trait delivers a poison or deals poison damage. An item with this trait is poisonous and might cause an affliction.",
};

// Weapon Hands 
CONFIG.weaponHands = {
  "1": "One",
  "1+": "One Plus",
  "2": "Two"
};

// Item Bonus 
CONFIG.itemBonuses = {
  "-2": "Shoddy (-2)",
  "0": "0",
  "1": "+1 Weapon Potency",
  "2": "+2 Weapon Potency",
  "3": "+3 Weapon Potency"
};

// Damage Dice 
CONFIG.damageDice = {
  "1": "1",
  "2": "2",
  "3": "3",
  "4": "4"
};

// Damage Die 
CONFIG.damageDie = {
  "d4": "d4",
  "d6": "d6",
  "d8": "d8",
  "d10": "d10",
  "d12": "d12"
};

// Weapon Range 
CONFIG.weaponRange = {
  "melee": "Melee",
  "reach": "Reach",
  "10": "10 ft.",
  "20": "20 ft.",
  "30": "30 ft.",
  "40": "40 ft.",
  "50": "50 ft.",
  "60": "60 ft.",
  "80": "80 ft.",
  "100": "100 ft.",
  "120": "120 ft.",
  "140": "140 ft."
};

// Weapon Reload 
CONFIG.weaponReload = {
  "-": "-",
  "0": "0",
  "1": "1",
  "2": "2",
  "3": "3",
};

// Armor Types
CONFIG.armorTypes = {
  "unarmored": "Unarmored",
  "light": "Light Armor",
  "medium": "Medium Armor",
  "heavy": "Heavy Armor",
  "shield": "Shield"
};

// Armor Groups
CONFIG.armorGroups = {
  "leather": "Leather",
  "composite": "Composite",
  "chain": "Chain",
  "plate": "Plate"
};

// Consumable Types
CONFIG.consumableTypes = {
  "ammo": "Ammunition",
  "potion": "Potion",
  "oil": "Oil",
  "scroll": "Scroll",
  "talasman": "Talasman",
  "other": "Other"
};

// Magic Traditon
CONFIG.magicTraditions = {
  "arcane": "Arcane",
  "occult": "Occult",
  "divine": "Divine",
  "primal": "Primal",
  "focus": "Focus"
};

// Preparation Type
CONFIG.preparationType = {
  "prepared": "Prepared",
  "spontaneous": "Spontaneous"
};

// Spell Traits
CONFIG.spellTraits = {
  "uncommon": "Uncommon",
  "rare": "Rare",
  "attack": "Attack",
  "disease": "Disease",
  "polymorph": "Polymorph",
  "incapacitation": "Incapacitation",
  "plant": "Plant",
  "teleportation": "Teleportation",
  "visual": "Visual",
  "emotion": "Emotion",
  "light": "Light",
  "darkness": "Darkness",
  "death": "Death",
  "scrying": "Scrying",
  "detection": "Detection",
  "acid": "Acid",
  "bludgeoning": "Bludgeoning",
  "cold": "Cold",
  "fire": "Fire",
  "force": "Force",
  "electricity": "Electricity",
  "sonic": "Sonic",
  "negative": "Negative",
  "piercing": "Piercing",
  "poison": "Poison",
  "psychic": "Psychic",
  "positive": "Positive",
  "bleed": "Bleed",
  "mental": "Mental",
  "precision": "Precision",
  "slashing": "Slashing",
  "chaotic": "Chaotic",
  "lawful": "Lawful",
  "good": "Good",
  "evil": "Evil",
  "healing": "Healing",
  "cantrip": "Cantrip",
  "nonlethal": "Nonlethal",
  "visual": "Visual",
  "arcane": "Arcane",
  "divine": "Divine",
  "occult": "Occult",
  "primal": "Primal",
  "abjuration": "Abjuration",
  "conjuration": "Conjuration",
  "divination": "Divination",
  "enchantment": "Enchantment",
  "evocation": "Evocation",
  "illusion": "Illusion",
  "necromancy": "Necromancy",
  "transmutation": "Transmutation",
}

// Feat Traits
CONFIG.featTraits = {
  "uncommon": "Uncommon",
  "rare": "Rare",
  "attack": "Attack",
  "move": "Move",
  "manipulate": "Manipulate",
  "concentrate": "Concentrate",
  "rage": "Rage",
  "general": "General",
  "skill": "Skill",
  "dwarf": "Dwarf",
  "elf": "Elf",
  "gnome": "Gnome",
  "goblin": "Goblin",
  "halfling": "Halfling",
  "human": "Human",  
  "alchemist": "Alchemist",
  "barbarian": "Barbarian",
  "bard": "Bard",
  "champion": "Champion",
  "cleric": "Cleric",
  "druid": "Druid",
  "fighter": "Fighter",
  "monk": "Monk",
  "ranger": "Ranger",
  "rogue": "Rogue",
  "sorcerer": "Sorcerer",
  "wizard": "Wizard",
  "fortune": "Fortune",
  "healing": "Healing",
  "manipulate": "Manipulate",
  "downtime": "Downtime",
  "secret": "Secret",
  "additive1": "Additive 1",
  "additive2": "Additive 2",
  "additive3": "Additive 3",
  "air": "Air",
  "archetype": "Archetype",
  "auditory": "Auditory",
  "dedication": "Dedication",
  "detection": "Detection",
  "emotion": "Emotion",
  "exploration": "Exploration",
  "fear": "Fear",
  "flourish": "Flourish",
  "half-Elf": "Half-Elf",
  "half-Orc": "Half-Orc",
  "incapacitation": "Incapacitation",
  "instinct": "Instinct",
  "magical": "Magical",
  "metamagic": "Metamagic",
  "morph": "Morph",
  "multiclass": "Multiclass",
  "oath": "Oath",
  "open": "Open",
  "polymorph": "Polymorph",
  "press": "Press",
  "rage": "Rage",
  "secret": "Secret",
  "stance": "Stance",
  "visual": "Visual",
  "arcane": "Arcane",
  "divine": "Divine",
  "occult": "Occult",
  "primal": "Primal",
  "abjuration": "Abjuration",
  "conjuration": "Conjuration",
  "divination": "Divination",
  "enchantment": "Enchantment",
  "evocation": "Evocation",
  "illusion": "Illusion",
  "necromancy": "Necromancy",
  "transmutation": "Transmutation",
  "positive": "Positive",
  "negative": "Negative",
  "mental": "Mental"
}

// Class Traits
CONFIG.classTraits = {
  "alchemist": "Alchemist",
  "barbarian": "Barbarian",
  "bard": "Bard",
  "champion": "Champion",
  "cleric": "Cleric",
  "druid": "Druid",
  "fighter": "Fighter",
  "monk": "Monk",
  "ranger": "Ranger",
  "rogue": "Rogue",
  "sorcerer": "Sorcerer",
  "wizard": "Wizard"
}

// Ancestry Traits
CONFIG.ancestryTraits = {
  "dwarf": "Dwarf",
  "elf": "Elf",
  "gnome": "Gnome",
  "goblin": "Goblin",
  "halfling": "Halfling",
  "human": "Human"
}

// Skill List
CONFIG.skillList = {
  "acrobatics": "Acrobatics",
  "arcana": "Arcana",
  "athletics": "Athletics",
  "crafting": "Crafting",
  "deception": "Deception",
  "diplomacy": "Diplomacy",
  "intimidation": "Intimidation",
  "medicine": "Medicine",
  "nature": "Nature",
  "occultism": "Occultism",
  "performance": "Performance",
  "religion": "Religion",
  "society": "Society",
  "stealth": "Stealth",
  "survival": "Survival",
  "thievery": "Thievery",
  "lore": "Lore"
}

// Spell Components
CONFIG.spellComponents = {
  "V": "Verbal",
  "S": "Somatic",
  "M": "Material"
};

// Spell Types
CONFIG.spellTypes = {
  "attack": "Spell Attack",
  "save": "Saving Throw",
  "heal": "Healing",
  "utility": "Utility"
};

// Spell Traditions
CONFIG.spellTraditions = {
  "arcane": "Arcane",
  "divine": "Divine",
  "occult": "Occult",
  "primal": "Primal"
};

// Spell Schools
CONFIG.spellSchools = {
  "abj": "Abjuration",
  "con": "Conjuration",
  "div": "Divination",
  "enc": "Enchantment",
  "evo": "Evocation",
  "ill": "Illusion",
  "nec": "Necromancy",
  "trs": "Transmutation",
};

// Spell Levels
CONFIG.spellLevels = {
  0: "Cantrip",
  1: "1st Level",
  2: "2nd Level",
  3: "3rd Level",
  4: "4th Level",
  5: "5th Level",
  6: "6th Level",
  7: "7th Level",
  8: "8th Level",
  9: "9th Level",
  10: "10th Level",
  11: "Focus"
};

// Feat Types
CONFIG.featTypes = {
  "bonus": "Bonus Feat",
  "ancestry": "Ancestry Feat",
  "skill": "Skill Feat",
  "general": "General Feat",
  "class": "Class Feat"  
};

// Feat Action Types
CONFIG.featActionTypes = {
  "passive": "Passive",
  "action": "Action",
  "reaction": "Reaction",
  "free": "Free Action"
};

// Action Action Types
CONFIG.actionTypes = {
  "action": "Action",
  "reaction": "Reaction",
  "free": "Free Action",
  "passive": "Passive"
};

// Actions Number
CONFIG.actionsNumber = {
  "1": "One",
  "2": "Two",
  "3": "Three"
};


// Proficiency Multipliers
CONFIG.proficiencyLevels = {
  0: "Not Trained",
  1: "Trained",
  2: "Expert",
  3: "Master",
  4: "Legendary"
};

// Creature Sizes
CONFIG.actorSizes = {
  "tiny": "Tiny",
  "sm": "Small",
  "med": "Medium",
  "lg": "Large",
  "huge": "Huge",
  "grg": "Gargantuan"
};

// Creature Sizes
CONFIG.bulkTypes = {
  "L": "Light",
  "1": "1",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5"
};

// Condition Types
CONFIG.conditionTypes = {
  "blinded": "Blinded",
  "charmed": "Charmed",
  "deafened": "Deafened",
  "frightened": "Frightened",
  "grappled": "Grappled",
  "incapacitated": "Inacapacitated",
  "invisible": "Invisible",
  "paralyzed": "Paralyzed",
  "petrified": "Petrified",
  "poisoned": "Poisoned",
  "prone": "Prone",
  "restrained": "Restrained",
  "stunned": "Stunned",
  "unconscious": "Unconscious",
  "exhaustion": "Exhaustion",
  "diseased": "Diseased"
};

// Languages
CONFIG.languages = {
  "common": "Common",
  "abyssal": "Abyssal",
  "aklo": "Aklo",
  "aquan": "Aquan",
  "auran": "Auran",
  "celestial": "Celestial",
  "draconic": "Draconic",
  "druidic": "Druidic",
  "dwarvish": "Dwarvish",
  "elven": "Elven",
  "gnomish": "Gnomish",
  "goblin": "Goblin",
  "gnoll": "Gnoll",
  "halfling": "Halfling",
  "ignan": "Ignan",
  "jotun": "Jotun",
  "infernal": "Infernal",
  "orcish": "Orcish",
  "necril": "Necril",
  "sylvan": "Sylvan",
  "shadowtongue": "Shadowtongue",
  "terran": "Terran",
  "undercommon": "Undercommon"
};
