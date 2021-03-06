/**
 * Author: DrowsyFlesh
 * Create: 2019/2/5
 * Description:
 */
export class DataBase {
    constructor(databaseName) {
        this.maxItemSize = 100 * 1024 * 1024;
        this.dbName = databaseName;
        this.db = null;
    }

    getDB = (objectName) => {
        return new Promise((resolve, reject) => {
            this.dbRequest = window.indexedDB.open(this.dbName);
            this.dbRequest.onsuccess = (event) => {
                this.db = event.target.result;
                return resolve(this.db);
            };
            this.dbRequest.onerror = () => {
                reject('数据库打开报错');
            };
            this.dbRequest.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(objectName)) {
                    db.createObjectStore(112, {keyPath: 'order'});
                    db.createObjectStore(80, {keyPath: 'order'});
                    db.createObjectStore(64, {keyPath: 'order'});
                    db.createObjectStore(32, {keyPath: 'order'});
                    db.createObjectStore(16, {keyPath: 'order'});
                }
            };
        });
    };

    get = ({order, quality}) => {
        return this.getDB(quality).then(db => {
            const objectStore = db.transaction(quality, 'readwrite').objectStore(quality);
            const chunks = [];
            return new Promise((resolve, reject) => {
                const response = objectStore.get(order + '/0');
                const onsuccess = (e) => {
                    if (!e.target.result) return reject(null);
                    const res = e.target.result;
                    chunks.push(res.blob);
                    if (chunks.length === res.chunkCount) resolve(chunks);
                    const response = objectStore.get(order + '/' + chunks.length);
                    response.onerror = reject;
                    response.onsuccess = onsuccess;
                };
                response.onerror = reject;
                response.onsuccess = onsuccess;
            });
        }).then(chunks => new Blob(chunks));
    };

    add = ({order, quality, blob}) => {
        if (!(blob instanceof Blob)) throw('Something add to indexedDB is not the type of Blob!');
        // 将blob数据分成100mb大小的chunk
        const chunkCount = Math.ceil(blob.size / this.maxItemSize);
        const chunks = [];
        for (let chunkIndex = 0; chunkIndex < chunkCount; ++chunkIndex) {
            chunks.push({
                order: order + '/' + chunkIndex,
                chunkIndex,
                chunkCount,
                blob: blob.slice(chunkIndex * this.maxItemSize, (chunkIndex + 1) * this.maxItemSize),
            });
        }
        return this.getDB(quality).then(db => {
            const objectStore = db.transaction(quality, 'readwrite').objectStore(quality);
            const addChunk = (resolve, reject) => {
                if (chunks.length === 0) resolve();
                const response = objectStore.add(chunks.shift());
                response.onsuccess = () => chunks.length !== 0 && addChunk(resolve, reject);
                response.onerror = reject;
            };
            return new Promise(addChunk).catch((e) => console.error(e));
        });
    };

    push = () => {

    };

    del = () => {

    };

    clear = (objectName) => {
        return this.getDB(objectName).then(db => {
            return new Promise((resolve, reject) => {
                const objectStore = db.transaction(objectName, 'readwrite').objectStore(objectName);
                if (objectStore) {
                    const response = objectStore.clear();
                    response.onsuccess = () => {
                        resolve();
                    };
                } else reject();
            });
        });
    };
}
