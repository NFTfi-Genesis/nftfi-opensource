export function findLabelsToShow(availableWidth: number, labels: string[]): number[] {
  // Calculate the maximum width of all labels
  const maxLabelLength = Math.max(...labels.map(label => label.length))
  // Estimate width based on character count (average character width in pixels)
  const charWidth = 7 // Approximate width of each character in pixels
  const labelWidth = maxLabelLength * charWidth
  const spaceBetweenLabels = 15 // Space between labels in pixels
  const totalLabelWidth = labelWidth + spaceBetweenLabels
  const availableLabelWidth = availableWidth / labels.length
  // If the available width for one label is less than the total label width, return all labels
  if (availableLabelWidth > totalLabelWidth) {
    return labels.map((_, index) => index)
  }
  const indexesToShow = []
  const step = totalLabelWidth / availableLabelWidth
  let currentWidth = 0
  for (let i = 0; i < labels.length && (currentWidth + totalLabelWidth) < availableWidth; i += Math.ceil(step)) {
    indexesToShow.push(i)
    currentWidth += totalLabelWidth
  }

  return indexesToShow
}
