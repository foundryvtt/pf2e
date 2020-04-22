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
        group: {
            detection: [
                'observed',
                'hidden',
                'undetected',
                'unnoticed'
            ],
            senses: [
                'blinded',
                'concealed',
                'dazzled',
                'deafened',
                'invisible'
            ],
            death: [
                'doomed',
                'dying',
                'unconscious',
                'wounded'
            ],
            attitudes: [
                'hostile',
                'unfriendly',
                'indifferent',
                'friendly',
                'helpful'
            ],
            loweredAbilities: [
                'clumsy',
                'drained',
                'enfeebled',
                'stupefied'
            ]
        },
        blinded: {
            overrides: ['dazzled']
        },
        friendly: {
            overrides: ['helpful', 'hostile', 'indifferent', 'unfriendly']
        },
        helpful: {
            overrides: ['friendly', 'hostile', 'indifferent', 'unfriendly']
        },
        hostile: {
            overrides: ['friendly', 'helpful', 'indifferent', 'unfriendly']
        },
        indifferent: {
            overrides: ['friendly', 'helpful', 'hostile', 'unfriendly']
        },
        restrained: {
            overrides: ['grabbed']
        },
        unfriendly: {
            overrides: ['friendly', 'helpful', 'hostile', 'indifferent']
        }
    }

}