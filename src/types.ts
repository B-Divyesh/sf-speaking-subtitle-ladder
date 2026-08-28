export type Cue = {
  id: string;
  start: number;
  end: number;
  text: string;
};

export type PracticeLoop = {
  id: string;
  start: number;
  end: number;
  cueIds: string[];
};

export type Project = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  mediaName: string;
  mediaType: string;
  mediaBlob: Blob;
  duration: number;
  targetLanguage: string;
  textDirection: 'auto' | 'ltr' | 'rtl';
  targetCues: Cue[];
  translationCues: Cue[];
  loops: PracticeLoop[];
  progress: Record<string, number[]>;
};

export type Recording = {
  id: string;
  projectId: string;
  loopId: string;
  stage: number;
  createdAt: string;
  mimeType: string;
  blob: Blob;
};

export type ExportBundle = {
  format: 'subtitle-ladder-backup';
  version: 1;
  exportedAt: string;
  projects: Array<Omit<Project, 'mediaBlob'> & { mediaBlob: string }>;
  recordings: Array<Omit<Recording, 'blob'> & { blob: string }>;
};
