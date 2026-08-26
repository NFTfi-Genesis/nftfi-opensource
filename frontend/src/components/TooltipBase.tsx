import { Tooltip, styled } from '@mui/material'
import { tooltipClasses, TooltipProps } from '@mui/material/Tooltip'

export const TooltipBase = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.palette.customPallette.nftfi.paper,
    padding: 20,
    // Elevation
    boxShadow: theme.shadows[3],
  },
}))
