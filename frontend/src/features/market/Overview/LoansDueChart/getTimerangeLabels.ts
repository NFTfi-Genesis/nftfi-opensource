export function getTimerangeLabels(availableWidth: number, dateLabels: string[], labelLength: number): Date[] {
  // Estimate width based on character count (average character width in pixels)
  const charWidth = 7 // Approximate width of each character in pixels
  const labelWidth = labelLength * charWidth
  const spaceBetweenLabels = 15 // Space between labels in pixels
  const totalLabelWidth = labelWidth + spaceBetweenLabels
  const availableLabelWidth = availableWidth / dateLabels.length
  // If the available width for one label is less than the total label width, return all labels
  if (availableLabelWidth > totalLabelWidth) {
    return dateLabels.map(label => new Date(label))
  }

  const maxLabelsToShow = Math.floor(availableWidth / totalLabelWidth) - 1
  const firstDate = dateLabels[0]
  const lastDate = dateLabels[dateLabels.length - 1]
  // Need to find evenly distributed dates between first and last date
  const dateRange = new Date(lastDate).getTime() - new Date(firstDate).getTime()
  const dateStep = dateRange / maxLabelsToShow
  const datesToShow = []
  for (let i = 0; i < maxLabelsToShow; i++) {
    datesToShow.push(new Date(new Date(firstDate).getTime() + i * dateStep))
  }

  datesToShow.push(new Date(lastDate))

  return datesToShow
}
