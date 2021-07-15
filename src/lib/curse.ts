/**
 * @File   : curse.ts
 * @Author : Dencer (tdaddon@163.com)
 * @Link   : https://dengsir.github.io
 * @Date   : 10/29/2019, 5:50:08 PM
 */

import * as fs from 'fs-extra';
import * as FormData from 'form-data';
import Got from 'got';

export interface GameVersion {
    id: number;
    name: string;
    gameVersionTypeID: number;
    slug: string;
}

export class Curse {
    private base = 'https://wow.curseforge.com/api';

    constructor(private curseId: number, private token: string) {}

    async gameVersions() {
        const url = `${this.base}/game/versions`;

        const resp = await Got.get(url, {
            headers: {
                'X-Api-Token': this.token,
                'user-agent': '',
            },
        });
        return JSON.parse(resp.body) as GameVersion[];
    }

    async getGameVersionIdByName(name: string) {
        for (const item of await this.gameVersions()) {
            if (item.name === name) {
                return item.id;
            }
        }
        return 0;
    }

    async uploadFile(filePath: string, version: string, wowVersion: number, changelog = '') {
        if (!this.curseId) {
            console.error('error curse id');
            return;
        }
        const url = `${this.base}/projects/${this.curseId}/upload-file`;
        const form = new FormData();

        form.append(
            'metadata',
            JSON.stringify({
                changelog: changelog,
                changelogType: ['markdown'],
                gameVersions: [wowVersion],
                releaseType: 'release',
                displayName: version,
            })
        );
        form.append('file', fs.createReadStream(filePath));

        const resp = await Got.post(url, {
            body: form,
            headers: {
                'X-Api-Token': this.token,
                'user-agent': '',
            },
        });

        if (resp.statusCode !== 200 || !resp.body) {
            throw Error('upload file failed');
        }

        const body = JSON.parse(resp.body);
        if (!body || !body.id) {
            throw Error('upload file failed');
        }

        console.log('file id ' + body.id);
    }

    async importLocale(lang: string, data: string) {
        const form = new FormData();

        form.append('metadata', JSON.stringify({ language: lang }));
        form.append('localizations', data);

        const url = `${this.base}/projects/${this.curseId}/localization/import`;

        const resp = await Got.post(url, {
            body: form,
            headers: {
                'X-Api-Token': this.token,
                'user-agent': '',
            },
        });

        if (resp.statusCode !== 200 || !resp.body) {
            throw Error('upload locale failed');
        }

        const body = JSON.parse(resp.body);
        if (!body || !body.message || body.message !== 'Imported Successfully.') {
            throw Error('upload locale failed');
        }
    }
}
