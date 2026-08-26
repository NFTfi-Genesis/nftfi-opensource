import { useCallback, useState, useEffect, ReactNode } from 'react'
import { Box, Stack, Tooltip, SxProps } from '@mui/material'

import { getOptimizedImageSrc, getPictureType } from 'src/utils/images'
import placeholderImage from 'src/assets/images/placeholder.png'

import { Iconify } from 'src/components/Iconify'

export type AsyncPictureProps = {
  src: string
  size: number
  alt: string
  showPreviewTooltip?: boolean
  sx?: SxProps
}

export function AsyncPicture({
  src,
  alt,
  size,
  showPreviewTooltip = false,
  sx,
}: AsyncPictureProps) {
  const [hasError, setHasError] = useState(false)

  // Reset error state when src changes, otherwise the error picture will be shown after an error has been triggered
  useEffect(() => {
    setHasError(false)
  }, [src])

  const onError = useCallback(() => {
    setHasError(true)
  }, [setHasError])

  if (hasError || !src) {
    return <ErrorPicture size={size} alt={alt} />
  }

  const pictureComponent = getPictureComponent({ src, alt, size, onError })
  const tooltipPictureComponent = getPictureComponent({
    src,
    alt,
    size: 300,
    onError,
  })

  return (
    <Box
      sx={{
        width: size,
        height: size,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 1,
        overflow: 'hidden',
        ...sx,
      }}
    >
      {showPreviewTooltip
        ? (
          <WithTooltip tooltipImage={tooltipPictureComponent}>
            {pictureComponent}
          </WithTooltip>
        )
        : (
          pictureComponent
        )}
    </Box>
  )
}

function getPictureComponent({
  src,
  alt,
  size,
  onError,
}: AsyncPictureProps & { onError: () => void }) {
  const optimizedImageSrc = getOptimizedImageSrc(src, size)
  const pictureType = getPictureType(src)

  switch (pictureType) {
    case 'svg':
      return (
        <SvgPicture
          src={optimizedImageSrc}
          alt={alt}
          size={size}
          onError={onError}
        />
      )
    case 'video':
      return (
        <VideoPicture
          src={optimizedImageSrc}
          alt={alt}
          size={size}
          onError={onError}
        />
      )
    default:
      return (
        <ImagePicture
          src={optimizedImageSrc}
          alt={alt}
          size={size}
          onError={onError}
        />
      )
  }
}

function ImagePicture({
  src,
  alt,
  size,
  onError,
}: AsyncPictureProps & { onError: () => void }) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const img = new Image()
    img.src = src

    if (img.complete) {
      // Image is already cached
      setIsLoading(false)
    } else {
      // Reset loading state only if image is not cached
      setIsLoading(true)

      // Add load event listener for non-cached images
      const handleLoad = () => {
        setIsLoading(false)
      }
      img.addEventListener('load', handleLoad)
      return () => img.removeEventListener('load', handleLoad)
    }
  }, [src])

  return (
    <Box
      sx={{
        position: 'relative',
        width: size,
        height: size,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 1,
        overflow: 'hidden',
        backgroundColor: 'background.paper',
      }}
    >
      {isLoading && <LoadingPicture size={size} />}
      <Box
        component='img'
        loading='lazy'
        src={src}
        alt={alt}
        onError={onError}
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          cursor: 'default',
          display: isLoading
            ? 'none'
            : 'block',
        }}
      />
    </Box>
  )
}

function LoadingPicture({ size }: Pick<AsyncPictureProps, 'size'>) {
  const iconSize = size < 100
    ? size / 3
    : size / 6.5

  return (
    <Stack
      width={size}
      height={size}
      alignItems='center'
      justifyContent='center'
    >
      <Iconify icon='ph:hourglass' width={iconSize} height={iconSize} />
    </Stack>
  )
}

function ErrorPicture({ size, alt }: Pick<AsyncPictureProps, 'size' | 'alt'>) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 1,
        overflow: 'hidden',
        backgroundColor: 'background.paper',
      }}
    >
      <Box
        component='img'
        src={placeholderImage}
        alt={alt}
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </Box>
  )
}

function SvgPicture({
  src,
  alt,
  size,
  onError,
}: AsyncPictureProps & { onError: () => void }) {
  const [svgDataUrl, setSvgDataUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const parser = new DOMParser()

    // Function to check if svg has images
    function hasImages(svgText: string) {
      const svgDoc = parser.parseFromString(svgText, 'image/svg+xml')
      return svgDoc.querySelectorAll('image').length > 0
    }

    async function embedImagesInSvg(svgText: string) {
      const svgDoc = parser.parseFromString(svgText, 'image/svg+xml')
      const images = svgDoc.querySelectorAll('image')

      // Process each <image> tag in the SVG
      await Promise.all(
        Array.from(images).map(async img => {
          const href
            = img.getAttribute('href') || img.getAttribute('xlink:href')
          if (href) {
            try {
              const imageResponse = await fetch(href)
              const blob = await imageResponse.blob()
              const reader = new FileReader()
              reader.readAsDataURL(blob)

              await new Promise(resolve => {
                reader.onloadend = () => {
                  img.setAttribute('href', reader.result as string) // Set base64 data URL as href
                  resolve(null)
                }
              })
            } catch (error) {
              console.error('Error embedding image:', error)
            }
          }
        })
      )

      // Serialize the updated SVG to a string
      const serializedSvg = new XMLSerializer().serializeToString(svgDoc)
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serializedSvg)}`
    }

    async function fetchSvgWithEmbeddedImages() {
      setIsLoading(true)
      try {
        // Fetch the SVG content
        const response = await fetch(src)
        const svgText = await response.text()
        if (!response.ok || !svgText) {
          throw new Error(`Can't embed SVG: ${src}`)
        }
        if (!hasImages(svgText)) {
          console.warn('SVG does not contain images:', src)
          setIsLoading(false)
          return
        }

        // Embed images and generate the final data URL
        const dataUrl = await embedImagesInSvg(svgText)
        setSvgDataUrl(dataUrl)
        setIsLoading(false)
      } catch (error) {
        console.error(error)
        onError()
        setIsLoading(false)
      }
    }

    fetchSvgWithEmbeddedImages()
  }, [src, onError])

  if (isLoading) {
    return <LoadingPicture size={size} />
  }

  return (
    <Box
      sx={{
        width: size,
        height: size,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 1,
        overflow: 'hidden',
        backgroundColor: 'background.paper',
      }}
    >
      <Box
        component='img'
        loading='lazy'
        src={svgDataUrl || src}
        alt={alt}
        onError={onError}
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          cursor: 'default',
        }}
      />
    </Box>
  )
}

function VideoPicture({
  src,
  alt,
  size,
  onError,
}: AsyncPictureProps & { onError: () => void }) {
  const [isVideoReady, setIsVideoReady] = useState(false)

  // Reset error state when src changes, otherwise the error picture will be shown after an error has been triggered
  useEffect(() => {
    setIsVideoReady(false)
  }, [src])

  const video = (
    <Box
      sx={{
        position: 'relative',
        width: size,
        height: size,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 1,
        overflow: 'hidden',
        backgroundColor: 'background.paper',
      }}
    >
      {!isVideoReady && <LoadingPicture size={size} />}
      <Box
        component='video'
        src={src}
        autoPlay
        muted
        loop
        onLoadedData={() => setIsVideoReady(true)}
        onError={onError}
        sx={{
          width: '100%',
          height: '100%',
          display: isVideoReady
            ? 'block'
            : 'none',
          objectFit: 'cover',
          cursor: 'default',
        }}
      >
        {alt}
      </Box>
    </Box>
  )

  return video
}

function WithTooltip({
  children,
  tooltipImage,
}: {
  children: ReactNode
  tooltipImage: ReactNode
}) {
  return (
    <Tooltip
      title={
        <Box
          sx={{
            maxWidth: 300,
            maxHeight: 300,
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          {tooltipImage}
        </Box>
      }
      placement='top-start'
      slotProps={{
        tooltip: {
          sx: {
            bgcolor: 'background.paper',
            p: 1,
            maxWidth: 'none',
            borderRadius: 1,
            overflow: 'hidden',
            '& .MuiTooltip-arrow': {
              color: 'background.paper',
            },
          },
        },
      }}
    >
      <Box
        sx={{
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%',
        }}
      >
        {children}
      </Box>
    </Tooltip>
  )
}

// export const testImagesSrc = {
//   gifAnimation:
//     'https://img.reservoir.tools/images/v2/mainnet/hc%2BnPcLmWxs%2FDW99DlBQ42k40ZoyYV5jCIms5qHjwvvRf8BNkeCxQSKQZnV5r%2BRyRF4I6hajmeYjKk%2F8MEGNag2SuuYOr%2Bv8WU%2FMMiU%2BdouTPS574A172wPVoB%2Flm7jKtODZy6kzJv25%2FZJyH%2BrMuVDVMVIHb%2F5ImW94lt%2FbsV%2BExeHIUOjAkDT%2FDnWh2b4G.gif?width=1000',
//   svgA: 'https://img.reservoir.tools/images/v2/mainnet/Gusk3ZeskrM%2FXeNwE96T9rCUreAKKV7544gMhYK8HLRlBD%2Fbbix%2BpuzU8vyQrFeexyQsKj9Q3W7DuJ%2FhRxvXHw%3D%3D.svg?width=250',
//   svgB: 'https://raw.seadn.io/files/11244774d7eaaa994ae18018619edf2a.svg',
//   svgMultiple:
//     'https://img.reservoir.tools/images/v2/mainnet/7%2FrdF%2Fe%2F0iXY8HduhRCoIehkmFeXPeOQQFbbmIPfjCaHSAA6vjnCJOoYk2OAqvCFG5Kwu8BJeBH9IEvIn6xW9zJDobaa1Nnr02%2FptxSgPIBwaAL%2FJThZeas8Uw8i7T4MlLD5%2BDoR6g4Q8sU7VouhQsBYOtyQ%2BVpuOUFHDd%2BShhY%3D.svg?width=250',
//   jpegLarge: 'https://vastphotos.com/files/uploads/photos/10306/high-resolution-mountains-and-lakes-l.jpg?v=20220712073521',
//   video: 'https://storage.googleapis.com/mintpass/mintpass.mp4',
//   pngA: 'https://lh3.googleusercontent.com/nIKP5LplnHVutPiNSWASclLi2N32Qy1rDp8Z8bL9x2WerCadXDrmRCye4u6X8DOunQcmVAd5ujr6qhp2dg-aoStKioNTlo22h9CR=s40',
//   pngB: 'https://img.reservoir.tools/images/v2/mainnet/i9YO%2F4yHXUdJsWcTqhqvf04t%2BhOmyNk%2B0MWSEOJQ6qHq2rPP1AbMtfDWH6KJ8mYCxb7fMPaeYwzWW4bhGzl4y0g8YdzeQxRRPtWTqYscz1ikR%2BqYnN9sG76EU%2FIF8Cbs.png?width=1000',
//   pngC: 'https://i.seadn.io/s/raw/files/ca3a828cb95f43a01eaea3633a003b1a.png?auto=format&dpr=1&w=300',
// }
