declare module 'write-file-atomic' {
  type WriteFileAtomicOptions =
    | string
    | {
        chown?:
          | {
              uid: number
              gid: number
            }
          | false
        encoding?: string | null
        fsync?: boolean
        mode?: number | false
        tmpfileCreated?: (tmpfilePath: string) => void | Promise<void>
      }

  function writeFileAtomic(
    filename: string,
    data: string | ArrayBufferView | null | undefined,
    options?: WriteFileAtomicOptions
  ): Promise<void>

  namespace writeFileAtomic {
    function sync(
      filename: string,
      data: string | ArrayBufferView | null | undefined,
      options?: WriteFileAtomicOptions
    ): void
  }

  export = writeFileAtomic
}
