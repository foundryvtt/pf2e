import {calculateTravelDuration, DetectionOptions, Length, speedToVelocity, Terrain, Trip} from './travel-speed';

type DetectionModeData = 'none' | 'everything' | 'before';
type SpeedUnitData = 'feet' | 'miles';
type TerrainData = 'normal' | 'difficult' | 'greaterDifficult';

interface FormData {
    detectionMode: DetectionModeData[];
    speed: string[];
    speedUnit: SpeedUnitData[];
    explorationActivity: string[];
    distance: number;
    distanceUnit: SpeedUnitData;
    terrain: TerrainData;
    normalTerrainPenalty;
    difficultTerrainPenalty: string;
    greaterDifficultTerrainPenalty: string;
}

class TravelSpeedSheet extends FormApplication {
    private travelPlan: FormData = undefined;

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.id = 'travel-speed';
        options.classes = [];
        options.title = game.i18n.localize('PF2E.TravelSpeed.Title');
        options.template = 'systems/pf2e/templates/gm/travel/travel-speed-sheet.html';
        options.width = 'auto';
        options.submitOnChange = true;
        options.closeOnSubmit = false;
        return options;
    }

    async _updateObject(event: Event, formData: FormData) {
        this.travelPlan = formData;
        this.render(true);
    }

    getData() {
        // TODO: assign previous state as well
        const sheetData = super.getData();
        // TODO: find better solution for these values, translation
        sheetData.explorationActivities = [
            'Full Speed',
            'Half Speed',
            'Anticipate Ambush',
            'Avoid Notice',
            'Cover Tracks',
            'Defend',
            'Detect Magic',
            'Investigate',
            'Repeat a Spell',
            'Scout',
            'Search',
            'Track',
        ];
        sheetData.actors = this.options.actors.map((actor: Actor) => {
            return {
                speed: actor.data.data.attributes.speed.total,
                name: actor.name,
            };
        });
        if (this.travelPlan !== undefined) {
            const journey: Trip[] = [
                {
                    terrainCost: {
                        difficult: parseTerrainCost(this.travelPlan.difficultTerrainPenalty),
                        greaterDifficult: parseTerrainCost(this.travelPlan.greaterDifficultTerrainPenalty),
                        normal: parseTerrainCost(this.travelPlan.normalTerrainPenalty),
                    },
                    terrain: parseTerrainData(this.travelPlan.terrain),
                    distance: {
                        value: this.travelPlan.distance,
                        unit: parseDistanceUnit(this.travelPlan.distanceUnit),
                    },
                },
            ];
            // FIXME: get lowest actor speed here
            const velocity = speedToVelocity(30);
            sheetData.travelDuration = calculateTravelDuration(journey, velocity);
        }
        return sheetData;
    }
}

function parseDistanceUnit(unit: SpeedUnitData): Length {
    if (unit === 'feet') {
        return Length.FEET;
    } else {
        return Length.MILES;
    }
}

function parseTerrainData(terrain: TerrainData): Terrain {
    if (terrain === 'normal') {
        return Terrain.NORMAL;
    } else if (terrain === 'difficult') {
        return Terrain.DIFFICULT;
    } else {
        return Terrain.GREATER_DIFFICULT;
    }
}

// FIXME: keep fractions instead of numbers
function parseTerrainCost(value: string) {
    if (/^[\d\/]+$/.test(value)) {
        return 1 / eval(value);
    } else {
        return 1;
    }
}

function parseDetectionModeData(detectionMode: DetectionModeData): DetectionOptions {
    if (detectionMode === 'none') {
        return DetectionOptions.NONE;
    } else if (detectionMode === 'before') {
        return DetectionOptions.DETECT_BEFORE_WALKING_INTO_IT;
    } else {
        return DetectionOptions.DETECT_EVERYTHING;
    }
}

export function launchTravelSheet(actors: Actor[]): void {
    new TravelSpeedSheet(null, { actors }).render(true);
}
