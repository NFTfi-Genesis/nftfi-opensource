import { CircularProgress, CircularProgressProps, Stack } from '@mui/material'

export function Loading(props: CircularProgressProps) {
  return (
    <Stack
      sx={{
        width: props.size
          ? `${props.size}px`
          : '100%',
        height: props.size
          ? `${props.size}px`
          : '100vh',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <CircularProgress {...props} />
    </Stack>
  )
}
