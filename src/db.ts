import type { Project, Recording } from './types';

const DB_NAME = 'subtitle-ladder';
const DB_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('recordings')) {
        const store = db.createObjectStore('recordings', { keyPath: 'id' });
        store.createIndex('projectId', 'projectId');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local storage.'));
  });
}

async function request<T>(storeName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const result = action(tx.objectStore(storeName));
    result.onsuccess = () => resolve(result.result);
    result.onerror = () => reject(result.error ?? new Error('Local storage operation failed.'));
    tx.oncomplete = () => db.close();
  });
}

export const listProjects = () => request<Project[]>('projects', 'readonly', (store) => store.getAll());
export const getProject = (id: string) => request<Project | undefined>('projects', 'readonly', (store) => store.get(id));
export const saveProject = (project: Project) => request<IDBValidKey>('projects', 'readwrite', (store) => store.put(project));
export const deleteProject = (id: string) => request<undefined>('projects', 'readwrite', (store) => store.delete(id));
export const listRecordings = () => request<Recording[]>('recordings', 'readonly', (store) => store.getAll());
export const saveRecording = (recording: Recording) => request<IDBValidKey>('recordings', 'readwrite', (store) => store.put(recording));
export const deleteRecording = (id: string) => request<undefined>('recordings', 'readwrite', (store) => store.delete(id));

export async function deleteProjectData(id: string): Promise<void> {
  const recordings = (await listRecordings()).filter((item) => item.projectId === id);
  await Promise.all(recordings.map((item) => deleteRecording(item.id)));
  await deleteProject(id);
}

export async function clearAllData(): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['projects', 'recordings'], 'readwrite');
    tx.objectStore('projects').clear();
    tx.objectStore('recordings').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
