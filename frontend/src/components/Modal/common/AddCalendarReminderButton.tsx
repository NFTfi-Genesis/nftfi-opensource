import { useState, useMemo, useCallback } from 'react'
import { format } from 'date-fns'
import { Button, Menu, MenuItem, Typography, Box } from '@mui/material'
import { Iconify } from 'src/components/Iconify'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { formatWei } from 'src/utils/amounts'
import { getCurrencyTicker } from 'src/utils/currencies'
import GoogleCalLogo from 'src/assets/images/svg/google-cal-logo.svg'
import OutlookLogo from 'src/assets/images/svg/outlook-logo.svg'
import { NftInfo } from 'src/entities/app/NftInfo'
import { NftExtended } from 'src/entities/app/NftExtended'
import { Offer } from 'src/entities/domain/Offer'

type AddCalendarReminderButtonProps = {
  nft: NftExtended<NftInfo>
  offer: Offer
}

// TODO: move to utils
const formatDateForCalendar = (date: Date): string => {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const seconds = String(date.getUTCSeconds()).padStart(2, '0')
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
}

export function AddCalendarReminderButton({ nft, offer }: AddCalendarReminderButtonProps) {
  const { t } = useTranslation()
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)

  const currency = offer.terms.currency
  const ticker = getCurrencyTicker(currency)

  // Calculate due date: now + offer duration
  const dueDate = useMemo(() => {
    const date = new Date()
    date.setSeconds(date.getSeconds() + offer.terms.duration)
    return date
  }, [offer.terms.duration])

  const repaymentAmount = useMemo(() => {
    return formatWei(offer.terms.repayment, currency)
  }, [offer.terms.repayment, currency])

  const dueDateFormatted = useMemo(() => {
    const utcYear = dueDate.getUTCFullYear()
    const utcMonth = dueDate.getUTCMonth()
    const utcDay = dueDate.getUTCDate()
    const utcHours = dueDate.getUTCHours()
    const utcMinutes = dueDate.getUTCMinutes()

    const utcDateForFormatting = new Date(Date.UTC(utcYear, utcMonth, utcDay, utcHours, utcMinutes))

    const timeFormatted = format(utcDateForFormatting, 'h:mm a')
    const dateFormatted = format(utcDateForFormatting, 'd MMMM yyyy')

    return `${timeFormatted}, ${dateFormatted} (GMT+0)`
  }, [dueDate])

  const description = useMemo(() => {
    return t('borrow.calendar-event-description', {
      nftDisplayName: nft.info.name,
      repaymentAmount,
      ticker,
      dueDateFormatted,
    })
  }, [t, nft.info.name, repaymentAmount, ticker, dueDateFormatted])

  const eventTitle = t('borrow.calendar-event-title')

  const googleCalendarUrl = useMemo(() => {
    const startDate = formatDateForCalendar(dueDate)
    const endDate = formatDateForCalendar(new Date(dueDate.getTime() + 60 * 60 * 1000)) // 1 hour later

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: eventTitle,
      dates: `${startDate}/${endDate}`,
      details: description,
    })

    return `https://calendar.google.com/calendar/render?${params.toString()}`
  }, [dueDate, eventTitle, description])

  const outlookCalendarUrl = useMemo(() => {
    const startDate = dueDate.toISOString()
    const endDate = new Date(dueDate.getTime() + 60 * 60 * 1000).toISOString()

    const params = new URLSearchParams({
      subject: eventTitle,
      startdt: startDate,
      enddt: endDate,
      body: description,
    })

    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
  }, [dueDate, eventTitle, description])

  const generateIcsFile = useCallback(() => {
    const startDate = formatDateForCalendar(dueDate)
    const endDate = formatDateForCalendar(new Date(dueDate.getTime() + 60 * 60 * 1000))
    const now = formatDateForCalendar(new Date())

    // Escape description for .ics format (replace newlines with \n, escape special chars)
    const escapedDescription = description
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//NFTfi//Loan Reminder//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@nftfi.com`,
      `DTSTAMP:${now}`,
      `DTSTART:${startDate}`,
      `DTEND:${endDate}`,
      `SUMMARY:${eventTitle}`,
      `DESCRIPTION:${escapedDescription}`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')

    return icsContent
  }, [dueDate, description, eventTitle])

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget)
  }, [])

  const handleMenuClose = useCallback(() => {
    setMenuAnchorEl(null)
  }, [])

  const handleAppleCalendar = useCallback(() => {
    const icsContent = generateIcsFile()
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'loan-repayment-reminder.ics'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    handleMenuClose()
  }, [generateIcsFile, handleMenuClose])

  const calendarOptions = useMemo(() => [
    {
      label: 'Google',
      icon: GoogleCalLogo,
      href: googleCalendarUrl,
    },
    {
      label: 'Outlook',
      icon: OutlookLogo,
      href: outlookCalendarUrl,
    },
    {
      label: 'iCal File',
      icon: 'ph:calendar-dots',
      onClick: handleAppleCalendar,
    },
  ], [googleCalendarUrl, outlookCalendarUrl, handleAppleCalendar])

  const menuWidth = useMemo(() => {
    if (!menuAnchorEl) return undefined
    return menuAnchorEl.offsetWidth
  }, [menuAnchorEl])

  return (
    <>
      <Button
        variant='contained'
        color='primary'
        startIcon={<Iconify icon='ph:calendar-dots' width={20} />}
        sx={{ flex: 1 }}
        onClick={handleMenuOpen}
      >
        {t('borrow.add-calendar-reminder')}
      </Button>
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              border: '1px solid',
              borderColor: 'divider',
              width: menuWidth,
              mt: 0.5,
              padding: 0,
              bgcolor: 'background.paperOffset',
            },
          },
        }}
      >
        {calendarOptions.map(option => (
          <MenuItem
            key={option.label}
            component={option.href
              ? 'a'
              : 'div'}
            href={option.href}
            onClick={()=>{
              option.onClick?.()
              handleMenuClose()
            }}
            onAuxClick={(event: React.MouseEvent<HTMLElement>) => {
              // Middle mouse button (wheel click) opens in new tab
              // Close menu when middle-clicking
              if (event.button === 1 && option.href) {
                handleMenuClose()
              }
            }}
            target={option.href
              ? '_blank'
              : undefined}
            rel={option.href
              ? 'noopener noreferrer'
              : undefined}
            sx={{
              gap: 2,
              px: 2,
              py: 1.25,
              minHeight: 'auto',
              borderRadius: 0,
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            {typeof option.icon === 'string'
              ? (
                <Iconify icon={option.icon} width={20} sx={{ flexShrink: 0 }} />
              )
              : (
                <Box
                  component={option.icon}
                  sx={{
                    width: 20,
                    height: 20,
                    flexShrink: 0,
                  }}
                />
              )}
            <Typography
              variant='body2'
              sx={{
                fontWeight: 700,
                fontSize: 14,
                lineHeight: '24px',
              }}
            >
              {option.label}
            </Typography>
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
