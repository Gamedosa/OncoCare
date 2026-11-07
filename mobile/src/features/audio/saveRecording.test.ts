import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import * as diary from '@/features/diary/diaryRepository';
import type { DiaryEntry } from '@/features/diary/schemas';
import * as storage from './audioRepository';
import type { RecordedAudio } from './recordingFile';
import { AudioCleanupPendingError, AudioSaveRecoveryError, createRecordingSaver } from './saveRecording';

jest.mock('@/features/diary/diaryRepository', () => ({
  createEntry: jest.fn(), updateEntry: jest.fn(), getEntry: jest.fn(), getEntryByAudioPath: jest.fn(),
}));
jest.mock('./audioRepository', () => ({
  uploadAudio: jest.fn(), removeUnattachedAudio: jest.fn(),
  AudioUploadRecoveryError: class extends Error { constructor(readonly path: string) { super('cleanup failed'); } },
}));

const upload = jest.mocked(storage.uploadAudio);
const remove = jest.mocked(storage.removeUnattachedAudio);
const create = jest.mocked(diary.createEntry);
const update = jest.mocked(diary.updateEntry);
const find = jest.mocked(diary.getEntryByAudioPath);
const get = jest.mocked(diary.getEntry);
const PATIENT = '00000000-0000-4000-8000-000000000001';
const OBJECT = '00000000-0000-4000-8000-000000000010';
const path = `${PATIENT}/${OBJECT}.m4a`;
const audio: RecordedAudio = {
  uri: 'file:///synthetic.m4a', bytes: new ArrayBuffer(2),
  contentType: 'audio/mp4', extension: 'm4a', dispose: jest.fn(),
};
const entry: DiaryEntry = {
  id: OBJECT, patientId: PATIENT, content: null, mood: null, hasAudio: true,
  audioPath: path, createdAt: new Date(), updatedAt: new Date(),
};
const draft = { content: null, mood: null };

describe('recording save recovery', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    upload.mockResolvedValue({ id: OBJECT, path });
    remove.mockResolvedValue(undefined);
    find.mockResolvedValue(null);
    create.mockResolvedValue(entry);
    update.mockResolvedValue(entry);
  });

  it('uploads first and attaches only the server object ID', async () => {
    const save = createRecordingSaver(PATIENT);
    expect(await save(draft, audio)).toBe(entry);
    expect(create).toHaveBeenCalledWith(PATIENT, draft, OBJECT);
    expect(remove).not.toHaveBeenCalled();
  });

  it('adds audio to an existing text entry without creating a new entry', async () => {
    const previous = { ...entry, audioPath: null, hasAudio: false, content: 'Texto' };
    const save = createRecordingSaver(PATIENT, previous);
    await save(draft, audio);
    expect(update).toHaveBeenCalledWith(OBJECT, draft, OBJECT);
    expect(create).not.toHaveBeenCalled();
  });

  it('does not write the entry if upload fails', async () => {
    upload.mockRejectedValue(new Error('upload failed'));
    await expect(createRecordingSaver(PATIENT)(draft, audio)).rejects.toThrow('upload failed');
    expect(create).not.toHaveBeenCalled();
  });

  it('cleans up the new upload if the write did not persist', async () => {
    create.mockRejectedValue(new Error('write failed'));
    await expect(createRecordingSaver(PATIENT)(draft, audio)).rejects.toThrow('write failed');
    expect(remove).toHaveBeenCalledWith(path);
  });

  it('recovers a write whose response was lost, without deleting the attached file', async () => {
    create.mockRejectedValue(new TypeError('Network request failed'));
    find.mockResolvedValue(entry);
    expect(await createRecordingSaver(PATIENT)(draft, audio)).toBe(entry);
    expect(remove).not.toHaveBeenCalled();
  });

  it('reconciles on retry before making any new upload', async () => {
    const save = createRecordingSaver(PATIENT);
    create.mockRejectedValueOnce(new Error('response lost'));
    find.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(entry);
    await expect(save(draft, audio)).rejects.toBeInstanceOf(AudioSaveRecoveryError);
    expect(await save(draft, audio)).toBe(entry);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('keeps cleanup failures visible and retries cleanup before uploading again', async () => {
    const save = createRecordingSaver(PATIENT);
    create.mockRejectedValueOnce(new Error('write failed'));
    remove.mockRejectedValueOnce(new Error('cleanup failed'));
    await expect(save(draft, audio)).rejects.toBeInstanceOf(AudioSaveRecoveryError);
    await save(draft, audio);
    expect(remove).toHaveBeenCalledTimes(2);
    expect(upload).toHaveBeenCalledTimes(2);
  });

  it('replaces the attachment before deleting the old audio', async () => {
    const oldPath = `${PATIENT}/old.m4a`;
    const save = createRecordingSaver(PATIENT, { ...entry, audioPath: oldPath });
    expect(await save(draft, audio)).toBe(entry);
    expect(update).toHaveBeenCalledWith(OBJECT, draft, OBJECT);
    expect(remove).toHaveBeenCalledWith(oldPath);
    expect(update.mock.invocationCallOrder[0]).toBeLessThan(remove.mock.invocationCallOrder[0]);
  });

  it('does not delete the original when the replacement fails', async () => {
    const previous = { ...entry, audioPath: `${PATIENT}/old.m4a` };
    update.mockRejectedValue(new Error('write failed'));
    get.mockResolvedValue(previous);
    await expect(createRecordingSaver(PATIENT, previous)(draft, audio)).rejects.toThrow('write failed');
    expect(remove).toHaveBeenCalledWith(path);
    expect(remove).not.toHaveBeenCalledWith(previous.audioPath);
  });

  it('reconciles a lost replacement response before deleting the original', async () => {
    const previous = { ...entry, audioPath: `${PATIENT}/old.m4a` };
    update.mockRejectedValue(new Error('response lost'));
    get.mockResolvedValue(entry);
    expect(await createRecordingSaver(PATIENT, previous)(draft, audio)).toBe(entry);
    expect(remove).toHaveBeenCalledWith(previous.audioPath);
    expect(remove).not.toHaveBeenCalledWith(path);
  });

  it('removes the attachment before deleting the file and keeps the text', async () => {
    const textDraft = { content: 'Texto mantido', mood: 3 };
    const withoutAudio = { ...entry, ...textDraft, audioPath: null, hasAudio: false };
    update.mockResolvedValue(withoutAudio);
    expect(await createRecordingSaver(PATIENT, entry)(textDraft, null)).toBe(withoutAudio);
    expect(update).toHaveBeenCalledWith(OBJECT, textDraft, null);
    expect(remove).toHaveBeenCalledWith(path);
    expect(update.mock.invocationCallOrder[0]).toBeLessThan(remove.mock.invocationCallOrder[0]);
    expect(upload).not.toHaveBeenCalled();
  });

  it('blocks removal if it would leave the entry empty', async () => {
    await expect(createRecordingSaver(PATIENT, entry)(draft, null)).rejects.toThrow('vazio');
    await expect(createRecordingSaver(PATIENT, entry)({ content: '  ', mood: 4 }, null)).rejects.toThrow('vazio');
    expect(update).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('does not delete the audio when removal fails to persist', async () => {
    update.mockRejectedValue(new Error('write failed'));
    get.mockResolvedValue(entry);
    await expect(createRecordingSaver(PATIENT, entry)({ content: 'Texto', mood: 3 }, null)).rejects.toThrow('write failed');
    expect(remove).not.toHaveBeenCalled();
  });

  it('recovers removal when the write response was lost', async () => {
    const textDraft = { content: 'Texto', mood: 3 };
    const withoutAudio = { ...entry, ...textDraft, hasAudio: false, audioPath: null };
    update.mockRejectedValue(new Error('response lost'));
    get.mockResolvedValue(withoutAudio);
    expect(await createRecordingSaver(PATIENT, entry)(textDraft, null)).toBe(withoutAudio);
    expect(remove).toHaveBeenCalledWith(path);
  });

  it('retries only cleanup after a replacement has already been saved', async () => {
    const save = createRecordingSaver(PATIENT, { ...entry, audioPath: `${PATIENT}/old.m4a` });
    remove.mockRejectedValueOnce(new Error('cleanup offline'));
    await expect(save(draft, audio)).rejects.toBeInstanceOf(AudioCleanupPendingError);
    expect(await save(draft, audio)).toBe(entry);
    expect(remove).toHaveBeenCalledTimes(2);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('retries only cleanup after removal has already been saved', async () => {
    const textDraft = { content: 'Texto', mood: null };
    const withoutAudio = { ...entry, ...textDraft, hasAudio: false, audioPath: null };
    update.mockResolvedValue(withoutAudio);
    remove.mockRejectedValueOnce(new Error('cleanup offline'));
    const save = createRecordingSaver(PATIENT, entry);
    const result = await save(textDraft, null).catch((error: unknown) => error);
    expect(result).toBeInstanceOf(AudioCleanupPendingError);
    if (result instanceof AudioCleanupPendingError) expect(result.entry).toBe(withoutAudio);
    expect(await save(textDraft, null)).toBe(withoutAudio);
    expect(update).toHaveBeenCalledTimes(1);
    expect(upload).not.toHaveBeenCalled();
  });
});
