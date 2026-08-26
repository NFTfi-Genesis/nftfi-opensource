import { gridDensitySelector, GridDensity, useGridApiContext, useGridSelector } from '@mui/x-data-grid'

export function useTableDensity() {
  const apiRef = useGridApiContext()
  const density = useGridSelector(apiRef, gridDensitySelector)

  return density as GridDensity
}
