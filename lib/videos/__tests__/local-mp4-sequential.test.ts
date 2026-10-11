import assert from "node:assert/strict"
import { after, before, beforeEach, describe, it } from "node:test"
import {
  importLocalMp4,
  listLocalCatalog,
  setNativeVideoFilesystemForTests,
  VIDEO_CATALOG_KEY,
} from "../local-catalog"
import { isExistingDirectoryError } from "../offline"

type FsState = {
  files: Map<string, string>
  mkdirCalls: number
  writeCalls: number
  failOnWrite: number | null
}

const fsState: FsState = {
  files: new Map(),
  mkdirCalls: 0,
  writeCalls: 0,
  failOnWrite: null,
}

function installMemoryWebStorage(): void {
  const store = new Map<string, string>()
  const memoryStorage = {
    get length() {
      return store.size
    },
    clear() {
      store.clear()
    },
    getItem(key: string) {
      return store.has(key) ? (store.get(key) ?? null) : null
    },
    key(index: number) {
      return [...store.keys()][index] ?? null
    },
    removeItem(key: string) {
      store.delete(key)
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
  }
  const win = {
    Capacitor: { isNativePlatform: () => true },
    localStorage: memoryStorage,
  }
  Object.defineProperty(globalThis, "window", {
    value: win,
    configurable: true,
    writable: true,
  })
  Object.defineProperty(globalThis, "localStorage", {
    value: memoryStorage,
    configurable: true,
    writable: true,
  })
}

function resetFs(): void {
  fsState.files.clear()
  fsState.mkdirCalls = 0
  fsState.writeCalls = 0
  fsState.failOnWrite = null
}

function mp4(name: string, payload: string): File {
  return new File([new TextEncoder().encode(payload)], name, { type: "video/mp4" })
}

describe("isExistingDirectoryError", () => {
  it("accepts Capacitor Android and the web plugin wording", () => {
    assert.equal(isExistingDirectoryError(new Error("Directory exists")), true)
    assert.equal(isExistingDirectoryError({ message: "Directory exists" }), true)
    assert.equal(isExistingDirectoryError({ errorMessage: "Directory exists" }), true)
    assert.equal(
      isExistingDirectoryError(new Error("Current directory does already exist.")),
      true,
    )
    assert.equal(isExistingDirectoryError(new Error("The file already exists.")), true)
  })

  it("keeps real mkdir failures", () => {
    assert.equal(isExistingDirectoryError(new Error("Parent folder doesn't exist")), false)
    assert.equal(isExistingDirectoryError(new Error("Directory does not exist")), false)
    assert.equal(
      isExistingDirectoryError(new Error("Unable to create directory, unknown reason")),
      false,
    )
    assert.equal(isExistingDirectoryError("disk full"), false)
  })
})

describe("importLocalMp4 sequential native adds", { concurrency: 1 }, () => {
  before(() => {
    installMemoryWebStorage()
    setNativeVideoFilesystemForTests({
      Directory: { Data: "DATA" },
      Filesystem: {
        async mkdir() {
          fsState.mkdirCalls += 1
          // Capacitor Android: mkdir wirft ab dem zweiten Aufruf "Directory exists".
          if (fsState.mkdirCalls > 1) throw new Error("Directory exists")
        },
        async writeFile(options: { path: string; data: string }) {
          fsState.writeCalls += 1
          if (fsState.failOnWrite != null && fsState.writeCalls === fsState.failOnWrite) {
            throw new Error("disk full")
          }
          fsState.files.set(options.path, options.data)
        },
        async getUri(options: { path: string }) {
          return { uri: `file:///data/user/0/com.famiapp.app/files/${options.path}` }
        },
      },
    })
  })

  beforeEach(() => {
    resetFs()
    localStorage.removeItem(VIDEO_CATALOG_KEY)
  })

  after(() => {
    setNativeVideoFilesystemForTests(null)
  })

  it("stores three mp4s in a row with distinct ids and paths", async () => {
    const first = await importLocalMp4(mp4("clip.mp4", "bytes-one"), "Eins")
    const second = await importLocalMp4(mp4("clip.mp4", "bytes-two"), "Zwei")
    const third = await importLocalMp4(mp4("clip.mp4", "bytes-three"), "Drei")

    assert.equal(first.ok, true)
    assert.equal(second.ok, true)
    assert.equal(third.ok, true)
    if (!first.ok || !second.ok || !third.ok) return

    assert.notEqual(first.entry.id, second.entry.id)
    assert.notEqual(second.entry.id, third.entry.id)
    assert.notEqual(first.entry.localOfflinePath, second.entry.localOfflinePath)
    assert.notEqual(second.entry.localOfflinePath, third.entry.localOfflinePath)
    assert.equal(first.entry.title, "Eins")
    assert.equal(second.entry.title, "Zwei")
    assert.equal(third.entry.title, "Drei")

    const listed = await listLocalCatalog()
    assert.deepEqual(
      listed.map((item) => item.title),
      ["Eins", "Zwei", "Drei"],
    )
    const paths = listed.map((item) => item.localOfflinePath ?? "")
    assert.equal(new Set(paths).size, 3)
    assert.equal(new Set(listed.map((item) => item.id)).size, 3)
    for (const path of paths) {
      assert.match(path, /\/videos\/[A-Za-z0-9._-]+\.mp4$/)
      assert.equal(path.endsWith("/video.mp4"), false)
    }

    assert.equal(fsState.files.size, 3)
    assert.equal(new Set(fsState.files.values()).size, 3)
    assert.equal(fsState.mkdirCalls, 3)
    for (const path of fsState.files.keys()) {
      assert.match(path, /^videos\/[A-Za-z0-9._-]+\.mp4$/)
      assert.equal(path.endsWith("/video.mp4") || path === "videos/video.mp4", false)
    }
  })

  it("keeps the first files when the third write fails", async () => {
    const first = await importLocalMp4(mp4("a.mp4", "keep-a"), "Alpha")
    const second = await importLocalMp4(mp4("b.mp4", "keep-b"), "Beta")
    assert.equal(first.ok, true)
    assert.equal(second.ok, true)
    if (!first.ok || !second.ok) return

    fsState.failOnWrite = fsState.writeCalls + 1
    const third = await importLocalMp4(mp4("c.mp4", "drop-c"), "Gamma")
    assert.equal(third.ok, false)

    const listed = await listLocalCatalog()
    assert.deepEqual(
      listed.map((item) => item.title),
      ["Alpha", "Beta"],
    )
    assert.equal(listed[0]?.id, first.entry.id)
    assert.equal(listed[1]?.id, second.entry.id)
    assert.equal(listed[0]?.localOfflinePath, first.entry.localOfflinePath)
    assert.equal(fsState.files.size, 2)
  })

  it("keeps earlier files when a later file is empty or not an mp4", async () => {
    const first = await importLocalMp4(mp4("a.mp4", "keep-a"), "Alpha")
    const second = await importLocalMp4(mp4("b.mp4", "keep-b"), "Beta")
    assert.equal(first.ok && second.ok, true)

    const empty = await importLocalMp4(mp4("empty.mp4", ""), "Leer")
    assert.equal(empty.ok, false)
    if (!empty.ok) assert.equal(empty.error, "empty_file")

    const text = new File([new TextEncoder().encode("nope")], "notes.txt", { type: "text/plain" })
    const wrong = await importLocalMp4(text, "Text")
    assert.equal(wrong.ok, false)
    if (!wrong.ok) assert.equal(wrong.error, "file_type")

    const listed = await listLocalCatalog()
    assert.deepEqual(
      listed.map((item) => item.title),
      ["Alpha", "Beta"],
    )
    assert.equal(fsState.files.size, 2)
  })
})
