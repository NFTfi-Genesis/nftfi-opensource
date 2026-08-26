import { config } from 'src/config/config'
import { TKey } from 'src/modules/translation/TKey'

export type TestIdAttributes = Record<`data-${string}`, string | number | TKey>

/**
 * A utility function that returns a data-test-id attribute object only when SHOW_DATA_TEST_IDS is enabled.
 * Optionally, it can also return a data-raw-value attribute if rawValue is provided.
 *
 * @param testId - The test ID to use, following a structured approach like "component.element.state"
 * @param rawValue - (optional) The raw value to store for testing purposes
 * @returns An object with data-test-id property if enabled, and data-raw-value if provided, or an empty object if disabled
 *
 * @example
 * // Basic usage
 * <div {...getTestId('overviewPanel.currencySplit.usdc')}>
 *
 * // With raw value
 * <div {...getTestId('overviewPanel.currencySplit.usdc', 12345)}>
 *
 * // With conditional ID components
 * <div {...getTestId(`table.row.${rowIndex}`)}>
 *
 * // Nested components
 * <Table {...getTestId('loanTable')}>
 *   <TableRow {...getTestId('loanTable.row')}>
 *     <TableCell {...getTestId('loanTable.cells.principal')}>
 */
export function getTestId(testId: string | TKey, rawValue?: string | number): TestIdAttributes {
  if (!config.featureFlags.showDataTestIds) return {}
  // replaces whitespace with hyphens
  const normalizedTestId = String(testId).replace(/\s+/g, '-')
  return rawValue !== undefined
    ? { 'data-test-id': normalizedTestId, 'data-raw-value': rawValue }
    : { 'data-test-id': normalizedTestId }
}

/**
 * Returns an object with a data-raw-value attribute if rawValue is provided, otherwise an empty object.
 *
 * @param rawValue - The raw value to store for testing purposes
 * @returns An object with data-raw-value if provided, or an empty object
 *
 * @example
 * <div {...getRawValue(12345)}>
 */
export function getRawValue(rawValue?: string | number): Record<string, string | number> {
  if (!config.featureFlags.showDataTestIds) return {}
  return rawValue !== undefined
    ? { 'data-raw-value': rawValue }
    : {}
}

/**
 * Returns an object with data-raw-* attributes for each key in the record, if the feature flag is enabled.
 *
 * @param rawValues - Record of raw values to expose as data attributes
 * @returns An object with data-raw-{key} for each defined value, or an empty object
 *
 * @example
 * <div {...getRawValues({ eth: 1, usd: 2 })}>
 */
export function getRawValues(
  rawValues?: Record<string, string | number | undefined>
): Record<string, string | number> {
  if (!config.featureFlags.showDataTestIds || !rawValues) return {}
  return Object.entries(rawValues).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[`data-raw-${key}`] = value
    }
    return acc
  }, {} as Record<string, string | number>)
}
