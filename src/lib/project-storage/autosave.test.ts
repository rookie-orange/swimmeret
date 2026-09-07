import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { TLEditorSnapshot } from 'tldraw'

import { ProjectAutosave } from './autosave.ts'
import type { ProjectFile, ProjectRepository } from './types.ts'

const snapshot = (x: number) =>
  ({
    document: { store: {} },
    session: { pageStates: [{ camera: { x, y: 0, z: 1 } }] },
  }) as unknown as TLEditorSnapshot
const project: ProjectFile = {
  id: 'one',
  name: 'one',
  trashed: false,
  updatedAt: 0,
  revision: 0,
  schemaVersion: 1,
  snapshot: null,
}

test('unmounted sessions stop before reading or writing their disposed editor', async () => {
  let current = snapshot(0)
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  let writes = 0
  let disposed = false
  const repository = {
    save: async () => {
      writes++
      return project
    },
  } as unknown as ProjectRepository
  const saver = new ProjectAutosave(
    project,
    repository,
    () => {
      assert.equal(disposed, false)
      return current
    },
    () => gate,
    () => {},
  )
  current = snapshot(1)
  const saving = saver.flush()
  saver.dispose()
  disposed = true
  release()
  await saving
  assert.equal(writes, 0)
})

test('serializes writes and captures edits made during an in-flight save', async () => {
  let current = snapshot(0)
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const writes: number[] = []
  const repository = {
    save: async (_id: string, value: TLEditorSnapshot, revision: number) => {
      writes.push(revision)
      if (revision === 0) await gate
      return { ...project, revision: revision + 1, snapshot: value }
    },
  } as ProjectRepository
  const saver = new ProjectAutosave(
    project,
    repository,
    () => current,
    async () => {},
    () => {},
  )
  current = snapshot(1)
  const first = saver.flush()
  await Promise.resolve()
  current = snapshot(2)
  const second = saver.flush()
  release()
  await Promise.all([first, second])
  assert.deepEqual(writes, [0, 1])
  assert.equal(saver.hasChanges(), false)
  saver.dispose()
})

test('failed save stays dirty and retry uses the uncommitted revision', async () => {
  let current = snapshot(0)
  let fail = true
  const revisions: number[] = []
  const statuses: string[] = []
  const repository = {
    save: async (_id: string, value: TLEditorSnapshot, revision: number) => {
      revisions.push(revision)
      if (fail) throw new Error('disk full')
      return { ...project, revision: revision + 1, snapshot: value }
    },
  } as ProjectRepository
  const saver = new ProjectAutosave(
    project,
    repository,
    () => current,
    async () => {},
    (status) => statuses.push(status),
  )
  current = snapshot(1)
  await assert.rejects(saver.flush(), /disk full/)
  assert.equal(saver.hasChanges(), true)
  fail = false
  await saver.flush()
  assert.deepEqual(revisions, [0, 0])
  assert.equal(saver.hasChanges(), false)
  assert.ok(statuses.includes('error'))
  saver.dispose()
})

test('waits for assets before persisting their canvas references', async () => {
  let current = snapshot(0)
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  let writes = 0
  const repository = {
    save: async () => {
      writes++
      return { ...project, revision: 1 }
    },
  } as unknown as ProjectRepository
  const saver = new ProjectAutosave(
    project,
    repository,
    () => current,
    () => gate,
    () => {},
  )
  current = snapshot(1)
  const saving = saver.flush()
  await Promise.resolve()
  assert.equal(writes, 0)
  release()
  await saving
  assert.equal(writes, 1)
  saver.dispose()
})
