import { AsyncPictureProps } from 'src/components/AsyncPicture'

export enum ReservoirSupportedSizes {
  Small = 250,
  Medium = 512,
  Large = 1000,
}

export const getOptimizedImageSrc = (src: AsyncPictureProps['src'], desiredSizePx: AsyncPictureProps['size']) => {
  if (!src) {
    return ''
  }

  let srcOptimized = src

  if (src.includes('img.reservoir')) {
    // Comment out for now and always use small size for reservoir
    // const reservoirSize = desiredSize <= 300 ? ReservoirSupportedSizes.Small : desiredSize <= 700 ? ReservoirSupportedSizes.Medium : ReservoirSupportedSizes.Large
    srcOptimized = src.replace(/width=(250|512|1000)/, `width=${ReservoirSupportedSizes.Small}`)
  }

  if (src.includes('lh3.googleusercontent.com')) {
    const sizeParamPos = src.lastIndexOf('=s')
    if (sizeParamPos !== -1) {
      srcOptimized = `${src.slice(0, sizeParamPos)}=s${desiredSizePx}`
    } else {
      srcOptimized = `${src}=s${desiredSizePx}`
    }
  }

  if (src.includes('i.seadn.io')) {
    const url = new URL(src)
    const qs = new URLSearchParams(url.search)
    qs.set('w', desiredSizePx.toString())
    url.search = qs.toString()
    srcOptimized = url.toString()
  }

  return srcOptimized
}

const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogg']

export function getPictureType(src: AsyncPictureProps['src']) {
  if (src.includes('.svg')) {
    return 'svg'
  }
  if (VIDEO_EXTENSIONS.some(ext => src.includes(ext))) {
    return 'video'
  }
  return 'image'
}
