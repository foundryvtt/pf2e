/**
 * Database object
 *
 * This object is merged with the language file (default en.json) by the PF2e System.
 * The language file is turned into a translated object by Foundry VTT.
 *
 * E.g. the lines in the en.json file:
 *   "PF2E.condition.blinded.name": "Blinded",
 *   "PF2E.condition.blinded.summary": "You’re unable to see.",
 *
 * Are turned into an object like this:
 *  condition: { blinded: { name: "Blinded", summary: "You’re unable to see." } }
 *
 * If you want the Database to contain other static information that's not translatable, you can put them into the object below.
 */
export const DB = {
    condition: {
        _groups: {
            detection: ['observed', 'hidden', 'undetected', 'unnoticed'],
            senses: ['blinded', 'concealed', 'dazzled', 'deafened', 'invisible'],
            death: ['doomed', 'dying', 'unconscious', 'wounded'],
            attitudes: ['hostile', 'unfriendly', 'indifferent', 'friendly', 'helpful'],
            loweredAbilities: ['clumsy', 'drained', 'enfeebled', 'stupefied'],
        },
        blinded: {
            overrides: ['dazzled'],
        },
        clumsy: {
            hasValue: true,
        },
        confused: {
            alsoSets: ['flatFooted'],
        },
        doomed: {
            hasValue: true,
        },
        drained: {
            hasValue: true,
        },
        dying: {
            hasValue: true,
        },
        encumbered: {
            alsoSets: ['clumsy:1'],
        },
        enfeebled: {
            hasValue: true,
        },
        friendly: {
            overrides: ['helpful', 'hostile', 'indifferent', 'unfriendly'],
        },
        frightened: {
            hasValue: true,
        },
        grabbed: {
            alsoSets: ['flatFooted', 'immobilized'],
        },
        helpful: {
            overrides: ['friendly', 'hostile', 'indifferent', 'unfriendly'],
        },
        hidden: {
            alsoSets: ['flatFooted'],
        },
        hostile: {
            overrides: ['friendly', 'helpful', 'indifferent', 'unfriendly'],
        },
        indifferent: {
            overrides: ['friendly', 'helpful', 'hostile', 'unfriendly'],
        },
        invisible: {
            alsoSets: ['undetected'],
        },
        paralyzed: {
            alsoSets: ['flatFooted'],
        },
        prone: {
            alsoSets: ['flatFooted'],
        },
        restrained: {
            alsoSets: ['flatFooted', 'immobilized'],
            overrides: ['grabbed'],
        },
        sickened: {
            hasValue: true,
        },
        slowed: {
            hasValue: true,
        },
        stunned: {
            hasValue: true,
            // , overrides: ['slowed'] //special type of override
        },
        stupefied: {
            hasValue: true,
        },
        unconscious: {
            alsoSets: ['blinded', 'flatFooted'], // also sets prone, but prone isnt removed automatically when you wake up
        },
        undetected: {
            alsoSets: ['flatFooted'],
        },
        unfriendly: {
            overrides: ['friendly', 'helpful', 'hostile', 'indifferent'],
        },
        wounded: {
            hasValue: true,
        },
    },
    status: {
        shieldBlock: {
            name: 'Shield Block',
        },
    },
};
