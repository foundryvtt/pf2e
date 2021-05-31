// @ts-nocheck

import { populateFoundryUtilFunctions } from '../fixtures/foundryshim';
import { ActorDataPF2e, CharacterData } from '@actor/data';
import { MigrationRunner } from '@module/migration-runner';
import { MigrationBase } from '@module/migrations/base';
import { FakeActor } from 'tests/fakes/fake-actor';
import { FakeItem } from 'tests/fakes/fake-item';
import { FakeMacro } from 'tests/fakes/fake-macro';
import { FakeRollTable } from 'tests/fakes/fake-roll-table';
import { FakeUser } from 'tests/fakes/fake-user';
import { FakeScene } from 'tests/fakes/scene';
import { FakeChatMessage } from 'tests/fakes/fake-chat-message';

import characterJSON from '../../packs/data/iconics.db/amiri-level-1.json';
import armorJSON from '../../packs/data/equipment.db/scale-mail.json';
import { ArmorData } from '@item/data';
import { FoundryUtils } from 'tests/utils';
import { FakeActors, FakeCollection, FakeEntityCollection } from 'tests/fakes/fake-collection';

const characterData = FoundryUtils.duplicate(characterJSON) as unknown as CharacterData;
const armorData = FoundryUtils.duplicate(armorJSON) as unknown as ArmorData;

declare let game: any;

describe('test migration runner', () => {
    populateFoundryUtilFunctions();

    const settings = {
        worldSchemaVersion: 10,
    };

    game = {
        settings: {
            get<K extends keyof typeof settings>(_context: string, key: K): typeof settings[K] {
                return settings[key];
            },
            set<K extends keyof typeof settings>(_context: string, key: K, value: typeof settings[K]): void {
                settings[key] = value;
            },
        },
        system: {
            data: {
                version: '1.2.3',
                schema: 5,
            },
        },
        actors: new FakeActors(),
        items: new FakeEntityCollection<FakeItem>(),
        macros: new FakeEntityCollection<FakeMacro>(),
        messages: new FakeEntityCollection<FakeChatMessage>(),
        tables: new FakeEntityCollection<FakeRollTable>(),
        users: new FakeEntityCollection<FakeUser>(),
        packs: new FakeCollection(),
        scenes: new FakeEntityCollection<FakeScene>(),
    };

    (global as any).ui = {
        notifications: {
            info(_msg: string, _other?: any) {},
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
        async updateItem(item: any) {
            item.name = 'updated';
        }
    }

    class RemoveItemProperty extends MigrationBase {
        static version = 14;
        async updateItem(item: any) {
            delete item.data.someFakeProperty;
        }
    }

    beforeEach(() => {
        settings.worldSchemaVersion = 10;
    });

    test('expect needs upgrade when version older', () => {
        settings.worldSchemaVersion = 5;
        game.system.data.schema = 11;
        const migrationRunner = new MigrationRunner([new Version10(), new Version11()]);
        expect(migrationRunner.needsMigration()).toEqual(true);
    });

    test("expect doesn't need upgrade when version at latest", () => {
        settings.worldSchemaVersion = 11;
        game.system.data.schema = 11;
        const migrationRunner = new MigrationRunner([new Version10(), new Version11()]);
        expect(migrationRunner.needsMigration()).toEqual(false);
    });

    test("expect previous version migrations don't run", async () => {
        settings.worldSchemaVersion = 20;

        game.actors.set(characterData._id, new FakeActor(characterData));
        const migrationRunner = new MigrationRunner([new ChangeNameMigration()]);
        await migrationRunner.runMigration();
        expect(game.actors.contents[0]._data.name).not.toEqual('updated');
    });

    test('expect update causes version to be updated', async () => {
        game.actors.set(characterData._id, new FakeActor(characterData));
        game.system.data.schema = 12;

        const migrationRunner = new MigrationRunner([new ChangeNameMigration()]);
        await migrationRunner.runMigration();
        expect(settings.worldSchemaVersion).toEqual(12);
    });

    test('expect update actor name in world', async () => {
        game.actors.set(characterData._id, new FakeActor(characterData));

        const migrationRunner = new MigrationRunner([new ChangeNameMigration()]);
        await migrationRunner.runMigration();
        expect(game.actors.contents[0]._data.name).toEqual('updated');
    });

    test('expect update actor deep property', async () => {
        game.actors.set(characterData._id, new FakeActor(characterData));

        const migrationRunner = new MigrationRunner([new ChangeSizeMigration()]);
        await migrationRunner.runMigration();
        expect(game.actors.contents[0]._data.data.traits.size.value).toEqual('sm');
    });

    test.skip('expect unlinked actor in scene gets migrated', async () => {
        characterData._id = 'actor1';
        game.actors.set(characterData._id, new FakeActor(characterData));
        const scene = new FakeScene({});
        scene.addToken({
            _id: 'token1',
            actorId: 'actor1',
            actorData: { name: 'original' },
            actorLink: false,
        });
        game.scenes.set(scene.id, scene);

        const migrationRunner = new MigrationRunner([new ChangeNameMigration()]);
        await migrationRunner.runMigration();
        expect(game.scenes.entities[0].data.tokens[0].actorData.name).toEqual('updated');
    });

    test('update world actor item', async () => {
        game.actors.set(characterData._id, new FakeActor(characterData));

        const migrationRunner = new MigrationRunner([new UpdateItemName()]);
        await migrationRunner.runMigration();
        expect(game.actors.contents[0]._data.items[0].name).toEqual('updated');
    });

    test('update world item', async () => {
        game.items.set(armorData._id, new FakeItem(armorData));

        const migrationRunner = new MigrationRunner([new UpdateItemName()]);
        await migrationRunner.runMigration();
        expect(game.items.contents[0]._data.name).toEqual('updated');
    });

    test('properties can be removed', async () => {
        game.items.set(armorData._id, new FakeItem(armorData));
        game.items.contents[0]._data.data.someFakeProperty = 123123;

        const migrationRunner = new MigrationRunner([new RemoveItemProperty()]);
        await migrationRunner.runMigration();
        expect('someFakeProperty' in game.items.contents[0]._data.data).toEqual(false);
    });

    test('migrations run in sequence', async () => {
        class ChangeItemProp extends MigrationBase {
            static version = 13;
            async updateItem(item: any) {
                item.data.prop = 456;
            }
        }

        class UpdateItemNameWithProp extends MigrationBase {
            static version = 14;
            async updateItem(item: any) {
                item.name = `${item.data.prop}`;
            }
        }

        game.items.set(armorData._id, new FakeItem(armorData));
        game.items.contents[0]._data.data.prop = 123;

        const migrationRunner = new MigrationRunner([new ChangeItemProp(), new UpdateItemNameWithProp()]);
        await migrationRunner.runMigration();
        expect(game.items.contents[0]._data.data.prop).toEqual(456);
        expect(game.items.contents[0]._data.name).toEqual('456');
    });

    test('migrations can remove items from actors', async () => {
        class RemoveItemsFromActor extends MigrationBase {
            static version = 13;
            async updateActor(actor: any) {
                actor.items = [];
            }
        }

        game.actors.set(characterData._id, new FakeActor(characterData));

        const migrationRunner = new MigrationRunner([new RemoveItemsFromActor()]);
        await migrationRunner.runMigration();
        expect(game.actors.contents[0]._data.items.length).toEqual(0);
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
        game.actors.set(characterData._id, new FakeActor(characterData));
        game.actors.contents[0]._data.items = [];

        const migrationRunner = new MigrationRunner([new AddItemToActor()]);
        await migrationRunner.runMigration();
        expect(game.actors.contents[0]._data.items.length).toEqual(1);
        expect(game.actors.contents[0]._data.items[0]._id).toEqual('item1');
    });

    class SetActorPropertyToAddedItem extends MigrationBase {
        static version = 14;
        async updateActor(actor: any) {
            actor.data.sampleItemId = actor.items.find((x: any) => x.name === 'sample item')._id;
        }
    }

    test('migrations can reference previously added items', async () => {
        game.actors.set(characterData._id, new FakeActor(characterData));

        const migrationRunner = new MigrationRunner([new AddItemToActor(), new SetActorPropertyToAddedItem()]);
        await migrationRunner.runMigration();
        expect(game.actors.contents[0]._data.data.sampleItemId).toEqual('item1');
    });

    test.skip('migrations can reference previously added items on tokens', async () => {
        characterData._id = 'actor1';
        game.actors.clear();
        game.actors.set(characterData._id, new FakeActor(characterData));
        game.actors.entities[0]._data.items = [];

        const scene = new FakeScene({});
        scene.addToken({
            _id: 'token1',
            actorId: 'actor1',
            actorData: { name: 'original' },
            actorLink: false,
        });
        game.scenes.entities.push(scene);

        const migrationRunner = new MigrationRunner([new AddItemToActor(), new SetActorPropertyToAddedItem()]);
        await migrationRunner.runMigration();
        expect(game.actors.entities[0]._data.data.sampleItemId).toEqual('item2');
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
