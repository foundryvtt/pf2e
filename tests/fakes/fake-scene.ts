export class FakeScene {
    data: Partial<SceneData>;
    constructor(data?: Partial<SceneData>) {
        this.data = data ?? {};
        this.data.tokens = [];
    }

    get name() {
        return this.data.name;
    }

    addToken(token: Partial<TokenData>) {
        if (this.data.tokens === undefined) {
            this.data.tokens = [];
        }

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
            obj = this.data.tokens?.find((x) => x._id === changes._id);
        }
        for (const [k, v] of Object.entries(changes)) {
            global.setProperty(obj, k, v);
        }
    }
}
