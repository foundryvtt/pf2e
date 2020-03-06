export const monsterAbilities = () => {
    return {
        "All-Around Vision": {
            "actionType": "passive",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 342</i></a><br>This monster can see in all directions simultaneously, and therefore can’t be flanked."
        },
        "Aquatic Ambush": {
            "actionType": "action",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 342</i></a><br><b>Requirements</b> The monster is hiding in water and a creature that hasn’t detected it is within the listed number of feet. <b>Effect</b> The monster moves up to its swim Speed + 10 feet toward the triggering creature, traveling on water and on land. Once the creature is in reach, the monster makes a Strike against it. The creature is <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=16\">flat-footed</a> against this Strike."
        },
        "Attack of Opportunity": {
            "actionType": "reaction",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 342</i></a><br><b>Trigger</b> A creature within the monster’s reach uses a manipulate action or a move action, makes a ranged attack, or leaves a square during a move action it’s using. <b>Effect</b> The monster attempts a melee Strike against the triggering creature. If the attack is a critical hit and the trigger was a manipulate action, the monster disrupts that action. This Strike doesn’t count toward the monster’s multiple attack penalty, and its multiple attack penalty doesn’t apply to this Strike."
        },
        "At-Will Spells": {
            "actionType": "passive",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 342</i></a><br>The monster can cast its at-will spells any number of times without using up spell slots."
        },
        "Aura": {
            "actionType": "passive",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 342</i></a><br>A monster’s aura automatically affects everything within a specified emanation around that monster. The monster doesn’t need to spend actions on the aura; rather, the aura’s effects are applied at specific times, such as when a creature ends its turn in the aura or when creatures enter the aura.<br><br> If an aura does nothing but deal damage, its entry lists only the radius, damage, and saving throw. Such auras deal this damage to a creature when the creature enters the aura and when a creature starts its turn in the aura. A creature can take damage from the aura only once per round.<br><br> The GM might determine that a monster’s aura doesn’t affect its own allies. For example, a creature might be immune to a monster’s frightful presence if they have been around each other for a long time."
        },
        "Buck": {
            "actionType": "reaction",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 342</i></a><br>Most monsters that serve as mounts can attempt to\nbuck off unwanted or annoying riders, but most mounts\nwill not use this reaction against a trusted creature unless\nthe mounts are spooked or mistreated. <b>Trigger</b> A creature\nMounts or uses the Command an Animal action while riding\nthe monster. <b>Effect</b> The triggering creature must succeed\nat a Reflex saving throw against the listed DC or fall off the\ncreature and land prone. If the save is a critical failure, the\ntriggering creature also takes 1d6 bludgeoning damage in\naddition to the normal damage for the fall."
        },
        "Catch Rock": {
            "actionType": "reaction",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 342</i></a><br><b>Requirements</b> The monster must have a free hand but can Release anything it’s holding as part of this reaction. <b>Trigger</b> The monster is targeted with a thrown rock Strike or a rock would fall on the monster. <b>Effect</b> The monster gains a +4 circumstance bonus to its AC against the triggering attack or to any defense against the falling rock. If the attack misses or the monster successfully defends against the falling rock, the monster catches the rock, takes no damage, and is now holding the rock."
        },
        "Change Shape": {
            "actionType": "action",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 342</i></a><br>(<a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=32\">concentrate</a>, [magical tradition], <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=127\">polymorph</a>, <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=157\">transmutation</a>) The monster changes its shape indefinitely. It can use this action again to return to its natural shape or adopt a new shape. Unless otherwise noted, a monster cannot use Change Shape to appear as a specific individual. Using Change Shape counts as creating a disguise for the Impersonate use of Deception. The monster’s transformation automatically defeats Perception DCs to determine whether the creature is a member of the ancestry or creature type into which it transformed, and it gains a +4 status bonus to its Deception DC to prevent others from seeing through its disguise. Change Shape abilities specify what shapes the monster can adopt. The monster doesn’t gain any special abilities of the new shape, only its physical form. For example, in each shape, it replaces its normal Speeds and Strikes, and might potentially change its senses or size. Any changes are listed in its stat block."
        },
        "Constant Spells": {
            "actionType": "passive",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 342</i></a><br>A constant spell affects the monster without the monster needing to cast it, and its duration is unlimited. If a constant spell gets counteracted, the monster can reactivate it by spending the normal spellcasting actions the spell\u001crequires."
        },
        "Constrict": {
            "actionType": "action",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 342</i></a><br>The monster deals the listed amount of damage to any number of creatures grabbed or restrained by it. Each of those creatures can attempt a basic Fortitude save with the listed DC."
        },
        "Coven": {
            "actionType": "passive",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 342</i></a><br>(<a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=47\">divination</a>, <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=106\">mental</a>, <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=120\">occult</a>) This monster can form a coven with two or more other creatures who also have the coven ability. This involves performing an 8-hour ceremony with all prospective coven members. After the coven is formed, each of its members gains elite adjustments (page 6), adjusting their levels accordingly. Coven members can sense other members’ locations and conditions by spending a single action, which has the concentrate trait, and can sense what another coven member is sensing as a two-action activity, which has the concentrate trait as well.<br><br> Covens also grant spells and rituals to their members, but these can be cast only in cooperation between three coven members who are all within 30 feet of one another. A coven member can contribute to a coven spell with a single-action spellcasting activity that has a single verbal component. If two coven members have contributed these actions within the last round, a third member can cast a coven spell on her turn by spending the normal spellcasting actions. A coven can cast its coven spells an unlimited number of times but can cast only one coven spell each round. All covens grant the 8th-level <i><a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Spells.aspx?ID=17\">baleful polymorph</a></i> spell and all the following spells, which the coven can cast at any level up to 5th: <i><a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Spells.aspx?ID=15\">augury</a></i>, <i><a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Spells.aspx?ID=34\">charm</a></i>, <i><a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Spells.aspx?ID=39\">clairaudience</a></i>, <i><a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Spells.aspx?ID=40\">clairvoyance</a></i>, <i><a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Spells.aspx?ID=90\">dream message</a></i>, <i><a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Spells.aspx?ID=159\">illusory disguise</a></i>, <i><a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Spells.aspx?ID=161\">illusory scene</a></i>, <i><a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Spells.aspx?ID=239\">prying eye</a></i>, and <i><a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Spells.aspx?ID=329\">talking corpse</a></i>. Individual creatures with the coven ability also grant additional spells to any coven they join. A coven can also cast the <i><a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Rituals.aspx?ID=9\">control weather</a></i> ritual, with a DC of 23 instead of the standard DC.<br><br> If a coven member leaving the coven or the death of a coven member brings the coven below three members, the remaining members keep their elite adjustments for 24 hours, but without enough members to contribute the necessary actions, they can’t cast coven spells."
        },
        "Darkvision": {
            "actionType": "passive",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br>A monster with darkvision can see perfectly well in areas of darkness and dim light, though such vision is in black and white only. Some forms of magical darkness, such as a 4th-level <i><a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Spells.aspx?ID=59\">darkness</a></i> spell, block normal darkvision. A monster with greater darkvision, however, can see through even these forms of magical darkness."
        },
        "Disease": {
            "actionType": "passive",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br>When a creature is exposed to a monster’s disease, it attempts a Fortitude save or succumbs to the disease. The level of a disease is the level of the monster in\u001f icting the disease. The disease follows the <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Rules.aspx?ID=361\">rules for afflictions</a>."
        },
        "Engulf": {
            "actionType": "action",
            "actionCost": 2,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br>The monster Strides up to double its Speed and can move through the spaces of any creatures in its path. Any creature of the monster’s size or smaller whose space the monster moves through can attempt a Reflex save with the listed DC to avoid being engulfed. A creature unable to act automatically critically fails this save. If a creature succeeds at its save, it can choose to be either pushed aside (out of the monster’s path) or pushed in front of the monster to the end of the monster’s movement. The monster can attempt to Engulf the same creature only once in a single use of Engulf. The monster can contain as many creatures as can fit in its space.<br><br> A creature that fails its save is pulled into the monster’s body. It is grabbed, is <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=35\">slowed 1</a>, and has to hold its breath or start suffocating. The creature takes the listed amount of damage when first engulfed and at the end of each of its turns while it’s engulfed. An engulfed creature can get free by Escaping against the listed escape DC. An engulfed creature can attack the monster engulfing it, but only with unarmed attacks or with weapons of light Bulk or less. The engulfing creature is <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=16\">flat-footed</a> against the attack. If the monster takes piercing or slashing damage equaling or exceeding the listed Rupture value from a single attack or spell, the engulfed creature cuts itself free. A creature that gets free by either method can immediately breathe and exits the swallowing monster’s space.<br><br> If the monster dies, all creatures it has engulfed are automatically released as the monster’s form loses cohesion."
        },
        "Fast Healing": {
            "actionType": "passive",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br>A monster with this ability regains the given number of Hit Points each round at the beginning of its turn."
        },
        "Ferocity": {
            "actionType": "reaction",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br><b>Trigger</b> The monster is reduced to 0 HP. <b>Effect</b> The monster avoids being knocked out and remains at 1 HP, but its <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=42\">wounded</a> value increases by 1. When it is <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=42\">wounded 3</a>, it can no longer use this ability."
        },
        "Frightful Presence": {
            "actionType": "passive",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br>(<a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=206\">aura</a>, <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=60\">emotion</a>, <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=68\">fear</a>, <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=106\">mental</a>) A creature that first enters the area must attempt a Will save. Regardless of the result of the saving throw, the creature is temporarily immune to this monster’s Frightful Presence for 1 minute.<br><br> <b>Critical Success</b> The creature is unaffected by the presence.<br> <b>Success</b> The creature is <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=19\">frightened 1</a>.<br> <b>Failure</b> The creature is <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=19\">frightened 2</a>.<br> <b>Critical Failure</b> The creature is <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=19\">frightened 4</a>."
        },
        "Grab": {
            "actionType": "action",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br><b>Requirements</b> The monster’s last action was a success with a Strike that lists Grab in its damage entry, or it has a creature grabbed using this action. <b>Effect</b> The monster automatically Grabs the target until the end of the monster’s next turn. The creature is grabbed by whichever body part the monster attacked with, and that body part can’t be used to Strike creatures until the grab is ended.<br><br> Using Grab extends the duration of the monster’s Grab until the end of its next turn for all creatures grabbed by it. A grabbed creature can use the <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Actions.aspx?ID=79\">Escape</a> action to get out of the grab, and the Grab ends for a grabbed creatures if the monster moves away from it."
        },
        "Greater Constrict": {
            "actionType": "action",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br>The monster deals the listed amount of damage to any number of creatures grabbed or restrained by it. Each of those creatures can attempt a basic Fortitude save with the listed DC. A creature that fails this save falls <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=38\">unconscious</a>, and a creature that succeeds is then temporarily immune to falling <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=38\">unconscious</a> from Greater Constrict for 1 minute."
        },
        "Improved Grab": {
            "actionType": "free",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br>The monster can use Grab as a free action triggered by a hit with its initial attack. A monster with Improved Grab still needs to spend an action to extend the duration for creatures it already has grabbed."
        },
        "Improved Knockdown": {
            "actionType": "free",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br>The monster can use Knockdown as a free action triggered by a hit with its initial attack."
        },
        "Improved Push": {
            "actionType": "free",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br>The monster can use Push as a free action triggered by a hit with its initial attack."
        },
        "Knockdown": {
            "actionType": "action",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br><b>Requirements</b> The monster’s last action was a success with a Strike that lists Knockdown in its damage entry. <b>Effect</b> The monster knocks the target prone."
        },
        "Lifesense": {
            "actionType": "passive",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br>Lifesense allows a monster to sense the vital essence of living and undead creatures within the listed range. The sense can distinguish between the positive energy animating living creatures and the negative energy animating undead creatures, much as sight distinguishes colors."
        },
        "Light Blindness": {
            "actionType": "passive",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br>When first exposed to bright light, the monster is <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=1\">blinded</a> until the end of its next turn. After this exposure, light doesn’t blind the monster again until after it spends 1 hour in darkness. However, as long as the monster is in an area of bright light, it’s <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=7\">dazzled</a>."
        },
        "Low-Light Vision": {
            "actionType": "passive",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br>The monster can see in dim light as though it were bright light, so it ignores the <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=4\">concealed</a> condition due to dim light."
        },
        "Poison": {
            "actionType": "passive",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br>When a creature is exposed to a monster’s poison, it attempts a Fortitude save to avoid becoming poisoned. The level of a poison is the level of the monster inflicting the poison. The poison follows the <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Rules.aspx?ID=361\">rules for afflictions</a>."
        },
        "Push": {
            "actionType": "action",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br><b>Requirements</b> The monster’s last action was a success with a Strike that lists Push in its damage entry. <b>Effect</b> The monster automatically knocks the target away from the monster. Unless otherwise noted in the ability description, the creature is pushed 5 feet. If the attack was a critical hit, this distance is doubled."
        },
        "Regeneration": {
            "actionType": "passive",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br>This monster regains the listed number of Hit Points each round at the beginning of its turn. Its <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=11\">dying</a> condition never increases beyond <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=11\">dying 3</a> as long as its regeneration is active. However, if it takes damage of a type listed in the regeneration entry, its regeneration deactivates until the end of its next turn. Deactivate the regeneration before applying any damage of a listed type, since that damage might kill the monster by bringing it to <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=11\">dying 4</a>."
        },
        "Rend": {
            "actionType": "action",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 344</i></a><br>A Rend entry lists a Strike the monster has. <b>Requirements</b> The monster hit the same enemy with two consecutive Strikes of the listed type in the same round. <b>Effect</b> The monster automatically deals that Strike’s damage again to the enemy."
        },
        "Retributive Strike": {
            "actionType": "reaction",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 344</i></a><br><b>Trigger</b> An enemy damages the monster’s ally, and both are within 15 feet of the monster. <b>Effect</b> The ally gains resistance to all damage against the triggering damage equal to 2 + the monster’s level. If the foe is within reach, the monster makes a melee Strike against it."
        },
        "Scent": {
            "actionType": "passive",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 344</i></a><br>Scent involves sensing creatures or objects by smell, and is usually a vague sense. The range is listed in the ability, and it functions only if the creature or object being detected emits an aroma (for instance, incorporeal creatures usually do not exude an aroma).<br><br> If a creature emits a heavy aroma or is upwind, the GM can double or even triple the range of scent abilities used to detect that creature, and the GM can reduce the range if a creature is downwind."
        },
        "Shield Block": {
            "actionType": "reaction",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 344</i></a><br><b>Trigger</b> The monster has its shield raised and takes damage from a physical attack. <b>Effect</b> The monster snaps its shield into place to deflect a blow. The shield prevents the monster from taking an amount of damage up to the shield’s Hardness. The monster and the shield each take any remaining damage, possibly breaking or destroying the shield."
        },
        "Sneak Attack": {
            "actionType": "passive",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 344</i></a><br>When the monster Strikes a creature that has the <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=16\">flat-footed</a> condition with an <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=170\">agile</a> or <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=179\">finesse</a> melee weapon, an <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=170\">agile</a> or <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=179\">finesse</a> unarmed attack, or a ranged weapon attack, it also deals the listed precision damage. For a ranged attack with a thrown weapon, that weapon must also be an <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=170\">agile</a> or <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=179\">finesse</a> weapon."
        },
        "Swallow Whole": {
            "actionType": "action",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 344</i></a><br>(<a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=15\">attack</a>) The monster attempts to swallow a creature of the listed size or smaller that it has grabbed in its jaws or mouth. If a swallowed creature is of the maximum size listed, the monster can’t use Swallow Whole again. If the creature is smaller than the maximum, the monster can usually swallow more creatures; the GM determines the maximum. The monster attempts an <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Skills.aspx?ID=3\">Athletics</a> check opposed by the grabbed creature’s Reflex DC. If it succeeds, it swallows the creature. The monster’s mouth or jaws no longer grab a creature it has swallowed, so the monster is free to use them to Strike or Grab once again. The monster can’t attack creatures it has swallowed.<br><br> A swallowed creature is <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=20\">grabbed</a>, is <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=35\">slowed 1</a>, and has to hold its breath or start suffocating. The swallowed creature takes the listed amount of damage when first swallowed and at the end of each of its turns while it’s swallowed. If the victim Escapes this ability’s grabbed condition, it exits through the monster’s mouth. This frees any other creature grabbed in the monster’s mouth or jaws. A swallowed creature can attack the monster that has swallowed it, but only with unarmed attacks or with weapons of light Bulk or less. The engulfing creature is flat-footed against the attack. If the monster takes piercing or slashing damage equaling or exceeding the listed Rupture value from a single attack or spell, the engulfed creature cuts itself free. A creature that gets free by either Escaping or cutting itself free can immediately breathe and exits the swallowing monster’s space.<br><br> If the monster dies, a swallowed creature can be freed by creatures adjacent to the corpse if they spend a combined total of 3 actions cutting the monster open with a weapon or unarmed attack that deals piercing or slashing damage."
        },
        "Swarm Mind": {
            "actionType": "passive",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 344</i></a><br>This monster doesn’t have a single mind (typically because it’s a swarm of smaller creatures), and is immune to mental effects that target only a specific number of creatures. It is still subject to mental effects that affect all creatures in an area."
        },
        "Telepathy": {
            "actionType": "passive",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 344</i></a><br>(<a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=206\">aura</a>, <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=47\">divination</a>, <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=103\">magical</a>) A monster with telepathy can communicate mentally with any creatures within the listed radius, as long as they share a language. This doesn’t give any special access to their thoughts, and communicates no more information than normal speech would."
        },
        "Throw Rock": {
            "actionType": "action",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 344</i></a><br>The monster picks up a rock within reach or retrieves a stowed rock and throws it, making a ranged Strike."
        },
        "Trample": {
            "actionType": "action",
            "actionCost": 3,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 344</i></a><br>The monster Strides up to double its Speed and can move through the spaces of creatures of the listed size, Trampling each creature whose space it enters. The monster can attempt to Trample the same creature only once in a single use of Trample. The monster deals the damage of the listed Strike, but trampled creatures can attempt a basic Reflex save at the listed DC (no damage on a critical success, half damage on a success, double damage on a critical failure)."
        },
        "Tremorsense": {
            "actionType": "passive",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 344</i></a><br>Tremorsense allows a monster to feel the vibrations through a solid surface caused by movement. It is an imprecise sense with a limited range (listed in the ability). Tremorsense functions only if the monster is on the same surface as the subject, and only if the subject is moving along (or burrowing through) the surface."
        },
        "Wavesense": {
            "actionType": "passive",
            "actionCost": 1,
            "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 344</i></a><br>This sense allows a monster to feel vibrations caused by movement through a liquid. It’s an imprecise sense with a limited range (listed in the ability). Wavesense functions only if monster and the subject are in the same body of liquid, and only if the subject is moving through the liquid."
        }
    }
}