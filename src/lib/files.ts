/**
 * @File   : files.ts
 * @Author : Dencer (tdaddon@163.com)
 * @Link   : https://dengsir.github.io
 * @Date   : 10/28/2019, 2:09:40 PM
 */

import * as path from 'path';
import * as fs from 'fs-extra';

import { DOMParser } from 'xmldom';

export class FilesReader {
    private file: string;
    private files = new Set<string>();

    constructor(file: string) {
        this.file = file;
    }

    async parseToc(file: string) {
        const content = await fs.readFile(file, { encoding: 'utf-8' });
        const folder = path.dirname(path.resolve(file));

        for (let line of content.split(/[\r\n]+/)) {
            line = line.trim();
            if (line !== '' && !line.startsWith('#')) {
                await this.parseFile(path.resolve(folder, line));
            }
        }
    }

    async parseXml(file: string) {
        const folder = path.dirname(path.resolve(file));

        const parseNodes = async (nodes: HTMLCollectionOf<Element>) => {
            for (let i = 0; i < nodes.length; i++) {
                const element = nodes.item(i);
                if (element) {
                    const f = element.getAttribute('file');
                    if (f) {
                        await this.parseFile(path.resolve(folder, f));
                    }
                }
            }
        };

        const content = await fs.readFile(file, { encoding: 'utf-8' });
        const doc = new DOMParser().parseFromString(content);
        const ui = doc.getElementsByTagName('Ui');

        if (ui.length !== 1) {
            throw Error('xml error');
        }

        const root = ui[0];
        if (!root) {
            throw Error('xml error');
        }

        await parseNodes(root.getElementsByTagName('Include'));
        await parseNodes(root.getElementsByTagName('Script'));
    }

    async parseFile(file: string) {
        this.files.add(path.resolve(file));

        const ext = path.extname(file).toLowerCase();

        switch (ext) {
            case '.toc':
                await this.parseToc(file);
                break;
            case '.xml':
                await this.parseXml(file);
                break;
            case '.lua':
                break;
            default:
                throw Error('Unknown file type');
        }
    }

    async run() {
        await this.parseFile(this.file);
    }

    async getFiles() {
        await this.run();
        return this.files;
    }
}
