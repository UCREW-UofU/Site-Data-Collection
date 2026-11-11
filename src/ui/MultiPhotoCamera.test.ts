// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MultiPhotoCamera } from './MultiPhotoCamera'

let root: Root
let container: HTMLDivElement
const stop = vi.fn()
const getUserMedia = vi.fn()
const camera = { getTracks: () => [{ stop, onended: null }], getVideoTracks: () => [] }

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } })
  getUserMedia.mockResolvedValue(camera)
  // jsdom does not implement the native dialog method.
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: vi.fn() })
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  vi.spyOn(HTMLVideoElement.prototype, 'videoWidth', 'get').mockReturnValue(1920)
  vi.spyOn(HTMLVideoElement.prototype, 'videoHeight', 'get').mockReturnValue(1080)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(new Blob(['photo'], { type: 'image/jpeg' })))
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

async function mount(onPhoto = vi.fn().mockResolvedValue(undefined), onDone = vi.fn(), onFallback = vi.fn()) {
  await act(async () => root.render(createElement(MultiPhotoCamera, { onPhoto, onDone, onFallback })))
  await act(async () => container.querySelector('video')!.dispatchEvent(new Event('loadeddata')))
  return { onPhoto, onDone, onFallback }
}
function button(text: string) {
  return [...container.querySelectorAll('button')].find((element) => element.textContent === text)!
}

describe('continuous camera', () => {
  it('takes multiple shots without reopening the stream and releases it on exit', async () => {
    const { onPhoto } = await mount()
    await act(async () => button('Take photo').click())
    await act(async () => button('Take photo').click())
    expect(onPhoto).toHaveBeenCalledTimes(2)
    expect(onPhoto.mock.calls[0][0]).toBeInstanceOf(File)
    expect(getUserMedia).toHaveBeenCalledTimes(1)
    expect(container.textContent).toContain('2 photos added')
    expect(stop).not.toHaveBeenCalled()
    await act(async () => root.unmount())
    expect(stop).toHaveBeenCalledTimes(1)
  })

  it('prevents closing or double captures while a photo is being added', async () => {
    let finish!: () => void
    const onPhoto = vi.fn(() => new Promise<void>((resolve) => { finish = resolve }))
    const { onDone } = await mount(onPhoto)
    await act(async () => button('Take photo').click())
    expect(button('Done').disabled).toBe(true)
    expect(button('Adding photo…').disabled).toBe(true)
    await act(async () => container.querySelector('dialog')!.dispatchEvent(new Event('cancel', { cancelable: true })))
    expect(onDone).not.toHaveBeenCalled()
    await act(async () => finish())
    expect(container.textContent).toContain('1 photo added')
    await act(async () => button('Done').click())
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('offers the existing picker when permission is denied', async () => {
    getUserMedia.mockRejectedValue(new Error('Permission denied'))
    const { onFallback } = await mount()
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('permission denied')
    await act(async () => button('Use phone camera / choose photos').click())
    expect(onFallback).toHaveBeenCalledTimes(1)
  })

  it('does not count a failed save and allows another attempt', async () => {
    const onPhoto = vi.fn().mockRejectedValueOnce(new Error('Full storage')).mockResolvedValue(undefined)
    await mount(onPhoto)
    await act(async () => button('Take photo').click())
    expect(container.textContent).toContain('0 photos added')
    expect(container.textContent).toContain('photo was not added')
    await act(async () => button('Take photo').click())
    expect(container.textContent).toContain('1 photo added')
  })

  it('stops a stream that arrives after the dialog was closed', async () => {
    let resolveCamera!: (value: typeof camera) => void
    getUserMedia.mockImplementationOnce(() => new Promise((resolve) => { resolveCamera = resolve }))
    await mount()
    await act(async () => root.unmount())
    await act(async () => resolveCamera(camera))
    expect(stop).toHaveBeenCalledTimes(1)
  })
})
