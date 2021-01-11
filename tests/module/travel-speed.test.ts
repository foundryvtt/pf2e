import {
    calculateCharacterSpeed,
    calculateTravelDuration,
    DetectionOptions,
    ExplorationOptions,
    Length,
    speedToVelocity,
    Terrain,
    TerrainCost,
    TravelActivities,
    Trip,
} from '../../src/module/travel-speed';

const terrainModifiers: TerrainCost = {
    normal: 1,
    difficult: 2,
    greaterDifficult: 3,
};

const defaultExplorationOptions: ExplorationOptions = {
    expeditiousSearch: false,
    expeditiousSearchLegendary: false,
    swiftSneak: false,
    legendarySneak: false,
    practicedDefender: false,
};

describe('test travel speed', () => {
    test('character speed', () => {
        expect(
            calculateCharacterSpeed(40, TravelActivities.FULL_SPEED, DetectionOptions.NONE, defaultExplorationOptions),
        ).toEqual(40);
    });

    test('character speed when defending', () => {
        expect(
            calculateCharacterSpeed(40, TravelActivities.DEFEND, DetectionOptions.NONE, defaultExplorationOptions),
        ).toEqual(20);
        expect(
            calculateCharacterSpeed(
                40,
                TravelActivities.DEFEND,
                DetectionOptions.NONE,
                Object.assign({}, defaultExplorationOptions, { practicedDefender: true }),
            ),
        ).toEqual(40);
    });

    test('character speed when avoiding notice', () => {
        expect(
            calculateCharacterSpeed(
                40,
                TravelActivities.AVOID_NOTICE,
                DetectionOptions.NONE,
                defaultExplorationOptions,
            ),
        ).toEqual(20);
        expect(
            calculateCharacterSpeed(
                40,
                TravelActivities.AVOID_NOTICE,
                DetectionOptions.NONE,
                Object.assign({}, defaultExplorationOptions, { legendarySneak: true }),
            ),
        ).toEqual(40);
        expect(
            calculateCharacterSpeed(
                40,
                TravelActivities.AVOID_NOTICE,
                DetectionOptions.NONE,
                Object.assign({}, defaultExplorationOptions, { swiftSneak: true }),
            ),
        ).toEqual(40);
    });

    test('character speed when searching', () => {
        expect(
            calculateCharacterSpeed(40, TravelActivities.SEARCH, DetectionOptions.NONE, defaultExplorationOptions),
        ).toEqual(20);
        expect(
            calculateCharacterSpeed(
                40,
                TravelActivities.SEARCH,
                DetectionOptions.DETECT_EVERYTHING,
                defaultExplorationOptions,
            ),
        ).toEqual(20);
        expect(
            calculateCharacterSpeed(
                70,
                TravelActivities.SEARCH,
                DetectionOptions.DETECT_EVERYTHING,
                defaultExplorationOptions,
            ),
        ).toEqual(30);
        expect(
            calculateCharacterSpeed(
                120,
                TravelActivities.SEARCH,
                DetectionOptions.DETECT_EVERYTHING,
                Object.assign({}, defaultExplorationOptions, { expeditiousSearch: true }),
            ),
        ).toEqual(60);
        expect(
            calculateCharacterSpeed(
                140,
                TravelActivities.SEARCH,
                DetectionOptions.DETECT_EVERYTHING,
                Object.assign({}, defaultExplorationOptions, { expeditiousSearchLegendary: true }),
            ),
        ).toEqual(70);
        expect(
            calculateCharacterSpeed(
                40,
                TravelActivities.SEARCH,
                DetectionOptions.DETECT_BEFORE_WALKING_INTO_IT,
                defaultExplorationOptions,
            ),
        ).toEqual(15);
    });

    test('travel time', () => {
        const journey: Trip[] = [
            {
                distance: {
                    value: 51,
                    unit: Length.MILES,
                },
                terrain: Terrain.NORMAL,
                terrainCost: terrainModifiers,
            },
        ];
        const velocity = speedToVelocity(25);
        expect(calculateTravelDuration(journey, velocity)).toEqual({
            days: 2,
            hours: 4,
            minutes: 24,
        });
    });
});
