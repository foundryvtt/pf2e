import { populateFoundryUtilFunctions } from '../fixtures/foundryshim';
import { ActorDataPF2e } from '../../src/module/actor/actorDataDefinitions';
import { MigrationRunner } from '../../src/module/migration-runner';
import { ItemData } from '../../src/module/item/dataDefinitions';
import { MigrationBase } from 'src/module/migrations/base';

const characterData = require('../../packs/data/iconics.db/amiri-level-1.json');
const itemData = require('../../packs/data/equipment.db/scale-mail.json');

declare let game: any;

class FakeActor {
    _data: Partial<ActorDataPF2e>;
    constructor(data: Partial<ActorDataPF2e>) {
        this._data = duplicate(data);
        this._data.items = this._data.items ?? [];
    }

    get data() {
        return this._data;
    }

    get name() {
        return this._data.name;
    }

    update(changes: object) {
        for (const [k, v] of Object.entries(changes)) {
            global.setProperty(this._data, k, v);
        }
    }

    updateEmbeddedEntity(type: string, data: any | any[]) {
        // make sure data is an array, since it expects multiple
        data = data instanceof Array ? data : [data];

        for (const itemChanges of data) {
            let obj;
            if (type == 'OwnedItem') {
                obj = this._data.items.find((x) => x._id === itemChanges._id);
            }

            for (const [k, v] of Object.entries(itemChanges)) {
                global.setProperty(obj, k, v);
            }
        }
    }

    createEmbeddedEntity(type: string, data: any | any[]) {
        // make sure data is an array, since it expects multiple
        data = data instanceof Array ? data : [data];

        if (type == 'OwnedItem') {
            for (const obj of data) {
                obj._id = 'item1';
                this._data.items.push(obj);
            }
        }
    }

    deleteEmbeddedEntity(type: string, data: string | string[]) {
        // make sure data is an array, since it expects multiple
        data = data instanceof Array ? data : [data];

        if (type == 'OwnedItem') {
            for (const id of data) {
                this._data.items = this._data.items.filter((x: any) => x._id !== id);
            }
        }
    }
}

class FakeItem {
    _data: Partial<ItemData>;
    constructor(data: Partial<ItemData>) {
        this._data = duplicate(data);
    }

    get data() {
        return this._data;
    }

    get name() {
        return this._data.name;
    }

    update(changes: object) {
        for (const [k, v] of Object.entries(changes)) {
            global.setProperty(this._data, k, v);
        }
    }
}

class FakeScene {
    data: Partial<SceneData>;
    constructor(data?: Partial<SceneData>) {
        this.data = data ?? {};
        this.data.tokens = [];
    }

    get name() {
        return this.data.name;
    }

    addToken(token: Partial<TokenData>) {
        this.data.tokens.push({
            _id: '',
            flags: [],
            x: 0,
            y: 0,
            height: 100,
            width: 100,
            locked: false,
            brightLight: 0,
            dimLight: 0,
            lightAlpha: 0,
            lightAngle: 0,
            lightAnimation: { type: '', speed: 0, intensity: 0 },
            lightColor: '',
            name: 'test',
            displayName: 1,
            img: '',
            scale: 1,
            elevation: 0,
            lockRotation: false,
            effects: [],
            overlayEffect: '',
            vision: false,
            dimSight: 0,
            brightSight: 0,
            sightAngle: 0,
            hidden: false,
            actorId: '',
            actorLink: false,
            actorData: {},
            disposition: 0,
            displayBars: 0,
            bar1: {},
            bar2: {},
            ...token,
        });
    }

    update(changes: object) {
        for (const [k, v] of Object.entries(changes)) {
            global.setProperty(this.data, k, v);
        }
    }

    updateEmbeddedEntity(entityType: string, changes: any) {
        let obj;
        if (entityType === 'Token') {
            obj = this.data.tokens.find((x) => x._id === changes._id);
        }
        for (const [k, v] of Object.entries(changes)) {
            global.setProperty(obj, k, v);
        }
    }
}

describe('test migration runner', () => {
    populateFoundryUtilFunctions();

    const settings = {
        worldSchemaVersion: 10,
    };

    game = {
        settings: {
            get(context: string, key: string) {
                return settings[key];
            },
            set(context: string, key: string, value: any) {
                settings[key] = value;
            },
        },
        system: {
            data: {
                version: 1234,
            },
        },
        actors: {
            entities: [],
            get(id: string) {
                return this.entities.find((x: FakeActor) => x._data._id === id);
            },
            has(id: string) {
                return this.entities.some((x: FakeActor) => x._data._id === id);
            }
        },
        items: {
            entities: [],
            get(id: string) {
                return this.entities.find((x: FakeItem) => x._data._id === id);
            },
        },
        scenes: {
            entities: [],
        },
    };

    (global as any).ui = {
        notifications: {
            info(msg: string, other?: any) {},
        },
    };

    class Version10 extends MigrationBase {
        static version = 10;
    }

    class Version11 extends MigrationBase {
        static version = 11;
    }

    class ChangeNameMigration extends MigrationBase {
        static version = 12;
        async updateActor(actor: ActorDataPF2e) {
            actor.name = 'updated';
        }
    }

    class ChangeSizeMigration extends MigrationBase {
        static version = 12;
        async updateActor(actor: ActorDataPF2e) {
            actor.data.traits.size.value = 'sm';
        }
    }

    class UpdateItemName extends MigrationBase {
        static version = 13;
        async updateItem(item: any, actor?: any) {
            item.name = 'updated';
        }
    }

    class RemoveItemProperty extends MigrationBase {
        static version = 14;
        async updateItem(item: any, actor?: any) {
            delete item.data.someFakeProperty;
        }
    }

    beforeEach(() => {
        settings.worldSchemaVersion = 10;
    });

    test('expect needs upgrade when version older', () => {
        settings.worldSchemaVersion = 5;
        const migrationRunner = new MigrationRunner([new Version10(), new Version11()]);
        expect(migrationRunner.needsMigration()).toEqual(true);
    });

    test("expect doesn't need upgrade when version at latest", () => {
        settings.worldSchemaVersion = 11;
        const migrationRunner = new MigrationRunner([new Version10(), new Version11()]);
        expect(migrationRunner.needsMigration()).toEqual(false);
    });

    test("expect previous version migrations don't run", async () => {
        game.actors.entities.push(new FakeActor(characterData));
        settings.worldSchemaVersion = 20;

        const migrationRunner = new MigrationRunner([new ChangeNameMigration()]);
        await migrationRunner.runMigration();
        expect(game.actors.entities[0]._data.name).not.toEqual('updated');
    });

    test('expect update causes version to be updated', async () => {
        game.actors.entities.push(new FakeActor(characterData));

        const migrationRunner = new MigrationRunner([new ChangeNameMigration()]);
        await migrationRunner.runMigration();
        expect(settings.worldSchemaVersion).toEqual(12);
    });

    test('expect update actor name in world', async () => {
        game.actors.entities.push(new FakeActor(characterData));

        const migrationRunner = new MigrationRunner([new ChangeNameMigration()]);
        await migrationRunner.runMigration();
        expect(game.actors.entities[0]._data.name).toEqual('updated');
    });

    test('expect update actor deep property', async () => {
        game.actors.entities.push(new FakeActor(characterData));

        const migrationRunner = new MigrationRunner([new ChangeSizeMigration()]);
        await migrationRunner.runMigration();
        expect(game.actors.entities[0]._data.data.traits.size.value).toEqual('sm');
    });

    test('expect unlinked actor in scene gets migrated', async () => {
        characterData._id = 'actor1';
        game.actors.entities.push(new FakeActor(characterData));
        const scene = new FakeScene();
        scene.addToken({
            _id: 'token1',
            actorId: 'actor1',
            actorData: { name: 'original' },
            actorLink: false,
        });
        game.scenes.entities.push(scene);

        const migrationRunner = new MigrationRunner([new ChangeNameMigration()]);
        await migrationRunner.runMigration();
        expect(game.scenes.entities[0].data.tokens[0].actorData.name).toEqual('updated');
    });

    test('update world actor item', async () => {
        game.actors.entities.push(new FakeActor(characterData));

        const migrationRunner = new MigrationRunner([new UpdateItemName()]);
        await migrationRunner.runMigration();
        expect(game.actors.entities[0]._data.items[0].name).toEqual('updated');
    });

    test('update world item', async () => {
        game.items.entities.push(new FakeItem(itemData));

        const migrationRunner = new MigrationRunner([new UpdateItemName()]);
        await migrationRunner.runMigration();
        expect(game.items.entities[0]._data.name).toEqual('updated');
    });

    test('properties can be removed', async () => {
        game.items.entities.push(new FakeItem(itemData));
        game.items.entities[0]._data.data.someFakeProperty = 123123;

        const migrationRunner = new MigrationRunner([new RemoveItemProperty()]);
        await migrationRunner.runMigration();
        expect('someFakeProperty' in game.items.entities[0]._data.data).toEqual(false);
    });

    test('migrations run in sequence', async () => {
        class ChangeItemProp extends MigrationBase {
            static version = 13;
            async updateItem(item: any, actor?: any) {
                item.data.prop = 456;
            }
        }

        class UpdateItemNameWithProp extends MigrationBase {
            static version = 14;
            async updateItem(item: any, actor?: any) {
                item.name = `${item.data.prop}`;
            }
        }

        game.items.entities.push(new FakeItem(itemData));
        game.items.entities[0]._data.data.prop = 123;

        const migrationRunner = new MigrationRunner([new ChangeItemProp(), new UpdateItemNameWithProp()]);
        await migrationRunner.runMigration();
        expect(game.items.entities[0]._data.data.prop).toEqual(456);
        expect(game.items.entities[0]._data.name).toEqual('456');
    });

    test('migrations can remove items from actors', async () => {
        class RemoveItemsFromActor extends MigrationBase {
            static version = 13;
            async updateActor(actor: any) {
                actor.items = [];
            }
        }

        game.actors.entities.push(new FakeActor(characterData));

        const migrationRunner = new MigrationRunner([new RemoveItemsFromActor()]);
        await migrationRunner.runMigration();
        expect(game.actors.entities[0]._data.items.length).toEqual(0);
    });

    class AddItemToActor extends MigrationBase {
        static version = 13;
        requiresFlush = true;
        async updateActor(actor: any) {
            actor.items.push({
                name: 'sample item',
                type: 'melee',
                data: {},
            });
        }
    }

    test('migrations can add items to actors', async () => {
        game.actors.entities.push(new FakeActor(characterData));
        game.actors.entities[0]._data.items = [];

        const migrationRunner = new MigrationRunner([new AddItemToActor()]);
        await migrationRunner.runMigration();
        expect(game.actors.entities[0]._data.items.length).toEqual(1);
        expect(game.actors.entities[0]._data.items[0]._id).toEqual('item1');
    });

    class SetActorPropertyToAddedItem extends MigrationBase {
        static version = 14;
        async updateActor(actor: any) {
            actor.data.sampleItemId = actor.items.find((x: any) => x.name === 'sample item')._id;
        }
    }

    test('migrations can reference previously added items', async () => {
        game.actors.entities.push(new FakeActor(characterData));
        game.actors.entities[0]._data.items = [];

        const migrationRunner = new MigrationRunner([new AddItemToActor(), new SetActorPropertyToAddedItem()]);
        await migrationRunner.runMigration();
        expect(game.actors.entities[0]._data.data.sampleItemId).toEqual('item1');
    });

    test('migrations can reference previously added items on tokens', async () => {
        characterData._id = 'actor1';
        game.actors.entities.push(new FakeActor(characterData));
        game.actors.entities[0]._data.items = [];

        const scene = new FakeScene();
        scene.addToken({
            _id: 'token1',
            actorId: 'actor1',
            actorData: { name: 'original' },
            actorLink: false,
        });
        game.scenes.entities.push(scene);

        const migrationRunner = new MigrationRunner([new AddItemToActor(), new SetActorPropertyToAddedItem()]);
        await migrationRunner.runMigration();
        expect(game.actors.entities[0]._data.data.sampleItemId).toEqual('item1');
    });

    test('expect free migration function gets called', async () => {
        let called = false;
        class FreeFn extends MigrationBase {
            static version = 14;
            async migrate() {
                called = true;
            }
        }

        const migrationRunner = new MigrationRunner([new AddItemToActor(), new FreeFn()]);
        await migrationRunner.runMigration();
        expect(called).toEqual(true);
    });
});
