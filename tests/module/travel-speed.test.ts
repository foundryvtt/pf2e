import {
    calculateCharacterSpeed,
    calculateTravelDuration,
    calculateTravelSpeed,
    DetectionOptions,
    ExplorationOptions,
    Terrain,
    TerrainCost,
    TravelActivities,
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
    test('core rulebook examples', () => {
        expect(calculateTravelSpeed(10, Terrain.STANDARD, terrainModifiers)).toEqual({
            feetPerMinute: 100,
            milesPerHour: 1,
            milesPerDay: 8,
        });
        expect(calculateTravelSpeed(15, Terrain.STANDARD, terrainModifiers)).toEqual({
            feetPerMinute: 150,
            milesPerHour: 1.5,
            milesPerDay: 12,
        });
        expect(calculateTravelSpeed(20, Terrain.STANDARD, terrainModifiers)).toEqual({
            feetPerMinute: 200,
            milesPerHour: 2,
            milesPerDay: 16,
        });
        expect(calculateTravelSpeed(25, Terrain.STANDARD, terrainModifiers)).toEqual({
            feetPerMinute: 250,
            milesPerHour: 2.5,
            milesPerDay: 20,
        });
        expect(calculateTravelSpeed(30, Terrain.STANDARD, terrainModifiers)).toEqual({
            feetPerMinute: 300,
            milesPerHour: 3,
            milesPerDay: 24,
        });
        expect(calculateTravelSpeed(35, Terrain.STANDARD, terrainModifiers)).toEqual({
            feetPerMinute: 350,
            milesPerHour: 3.5,
            milesPerDay: 28,
        });
        expect(calculateTravelSpeed(40, Terrain.STANDARD, terrainModifiers)).toEqual({
            feetPerMinute: 400,
            milesPerHour: 4,
            milesPerDay: 32,
        });
        expect(calculateTravelSpeed(50, Terrain.STANDARD, terrainModifiers)).toEqual({
            feetPerMinute: 500,
            milesPerHour: 5,
            milesPerDay: 40,
        });
        expect(calculateTravelSpeed(60, Terrain.STANDARD, terrainModifiers)).toEqual({
            feetPerMinute: 600,
            milesPerHour: 6,
            milesPerDay: 48,
        });
    });

    test('terrain', () => {
        expect(calculateTravelSpeed(30, Terrain.DIFFICULT, terrainModifiers)).toEqual({
            feetPerMinute: 150,
            milesPerHour: 1.5,
            milesPerDay: 12,
        });

        expect(calculateTravelSpeed(30, Terrain.GREATER_DIFFICULT, terrainModifiers)).toEqual({
            feetPerMinute: 100,
            milesPerHour: 1,
            milesPerDay: 8,
        });
    });

    test('character speed', () => {
        expect(
            calculateCharacterSpeed(40, TravelActivities.FULL_SPEED, DetectionOptions.NONE, defaultExplorationOptions),
        ).toEqual(40);
    });

    test('character speed when defending', () => {
        expect(
            calculateCharacterSpeed(
                40,
                TravelActivities.DEFEND,
                DetectionOptions.NONE,
                defaultExplorationOptions,
            ),
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
        expect(calculateTravelDuration(51, 25, Terrain.STANDARD, terrainModifiers)).toEqual({
            days: 2,
            hours: 4,
            minutes: 24,
        });
    });
});
