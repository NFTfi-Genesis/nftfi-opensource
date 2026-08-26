import { Box, Typography, useTheme, Stack, Collapse } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FuseResultMatch } from 'fuse.js'
import { Contact } from 'src/entities/domain/Contact'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { useUpdateContact } from 'src/services/hooks/account/useUpdateContact'
import { useDeleteContact } from 'src/services/hooks/account/useDeleteContact'
import { getTestId } from 'src/utils/testing'
import { ContactAvatar } from '../Common/ContactAvatar'
import { ConfirmationDialog } from '../Form/ConfirmationDialog'
import { EditMenu } from './EditMenu'
import { SocialIconList } from './SocialIconList'
import { WalletAddress } from './WalletAddress'
import { SocialHandle } from './SocialHandle'
import { SelectContactButton } from './SelectContactButton'
import { HighlightTypography } from './HighlightTypography'

interface ContactItemProps {
  index: number
  item: Contact
  matches?: readonly FuseResultMatch[]
  fullyExpanded: boolean
  onExpand: () => void
  onEdit: () => void
  refresh: () => void
}

export function ContactItem({
  index,
  item: contact,
  matches,
  fullyExpanded = false,
  onExpand,
  onEdit,
  refresh,
}: ContactItemProps) {
  const theme = useTheme()
  const { t } = useTranslation()

  const [semiExpanded, setSemiExpanded] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useEffect(() => {
    if (matches && matches.length > 0) {
      setSemiExpanded(true)
    } else {
      setSemiExpanded(false)
    }
  }, [matches])

  const expanded = fullyExpanded || semiExpanded

  const matchedFieldKeys = useMemo(() => {
    if (!semiExpanded || !matches) return []
    return matches.map(match => match.key)
  }, [semiExpanded, matches])

  const socials = useMemo(() => {
    return [
      {
        handle: contact.xHandle,
        icon: 'ph:x-logo',
        type: 'xHandle',
        url: `https://x.com/${contact.xHandle}`,
      },
      {
        handle: contact.email,
        icon: 'ph:envelope',
        type: 'email',
        url: `mailto:${contact.email}`,
      },
      {
        handle: contact.discordHandle,
        icon: 'ph:discord-logo',
        type: 'discordHandle',
      },
      {
        handle: contact.telegramHandle,
        icon: 'ph:telegram-logo',
        type: 'telegramHandle',
        url: `https://t.me/${contact.telegramHandle}`,
      },
    ].filter(({ handle }) => handle)
  }, [contact])

  const { send: deleteContact } = useDeleteContact()
  const { send: updateContact } = useUpdateContact()

  const handleDeleteClick = () => {
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    await deleteContact(contact.contactId)
    setShowDeleteDialog(false)
    refresh()
  }

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false)
  }

  const handleExpand = useCallback(() => {
    setSemiExpanded(false)
    onExpand()
  }, [onExpand])

  const handleFavouriteClick = async () => {
    await updateContact(contact.contactId, { ...contact, isFavourite: !contact.isFavourite })
    refresh()
  }

  return (
    <Stack
      sx={{
        borderRadius: '40px',
        background: theme.palette.customPallette.nftfi.paper,
        p: 1.5,
      }}
    >
      <Stack
        direction='row'
        spacing={2}
        onClick={handleExpand}
        {...getTestId(`contacts.contact.${index}`)}
        alignItems='center'
        sx={{ cursor: 'pointer' }}
      >
        <ContactAvatar
          address={contact.addresses[0].value}
          isFavourite={contact.isFavourite}
          onFavouriteClick={handleFavouriteClick}
          index={index}
        />
        <Typography
          variant='h5'
          noWrap
          sx={{ flex: 1 }}
          {...getTestId(`contacts.contact.${index}.name`)}
        >
          {contact.name}
        </Typography>
        {expanded && <EditMenu onDelete={handleDeleteClick} onEdit={onEdit} />}
        {!expanded && <SocialIconList contact={contact} index={index} />}
      </Stack>

      <Collapse in={expanded} timeout='auto'>
        <Box
          display='flex'
          flexDirection='column'
          px={1.5}
          mt={
            fullyExpanded
            || matchedFieldKeys?.filter(val => val !== 'name').length > 0
              ? 2.5
              : 0
          }
        >
          <Section
            inTransition={
              fullyExpanded
              || matches?.some(match => match.key?.includes('addresses'))
              || matches?.some(match => match.key?.includes('ens'))
            }
            shouldAnimate={expanded}
            delay={0}
          >
            <Typography variant='subtitle1' color='text.secondary'>
              {t('contacts.associatedWallets')}
            </Typography>
          </Section>
          <Stack direction='column'>
            {contact.addresses.map((address, i) => (
              <Section
                key={address.value}
                inTransition={
                  fullyExpanded
                  || matchedFieldKeys.includes(`ens-${i}`)
                  || matchedFieldKeys.includes(`addresses-${i}`)
                }
                shouldAnimate={expanded}
                delay={20 + i * 20}
                dataTestId={`contacts.contact.${index}.addresses.${i}`}
              >
                <WalletAddress
                  address={address}
                  match={matches?.find(
                    match =>
                      match.key === `ens-${i}`
                      || (!address.ens && match.key === `addresses-${i}`)
                  )}
                />
              </Section>
            ))}
          </Stack>

          <Section
            inTransition={
              (fullyExpanded && socials.length > 0)
              || matchedFieldKeys.includes('xHandle')
              || matchedFieldKeys.includes('email')
              || matchedFieldKeys.includes('discordHandle')
              || matchedFieldKeys.includes('telegramHandle')
            }
            shouldAnimate={expanded}
            delay={40 + contact.addresses.length * 20}
          >
            <Typography variant='subtitle1' color='text.secondary'>
              {t('contacts.contactDetails')}
            </Typography>
          </Section>
          <Stack direction='column'>
            {socials.map(({ handle, icon, type, url }, i) => {
              return (
                <Section
                  dataTestId={`contacts.contact.${index}.socials.${type}`}
                  key={type}
                  inTransition={
                    fullyExpanded || matchedFieldKeys.includes(type)
                  }
                  shouldAnimate={expanded}
                  delay={60 + contact.addresses.length * 20 + i * 20}
                >
                  <SocialHandle
                    handle={handle}
                    icon={icon}
                    match={matches?.find(match => match.key === type)}
                    url={url}
                  />
                </Section>
              )
            })}
          </Stack>

          <Section
            inTransition={
              (fullyExpanded && !!contact.notes)
              || (semiExpanded && matchedFieldKeys.includes('notes'))
            }
            shouldAnimate={expanded}
            delay={80 + contact.addresses.length * 20 + socials.length * 20}
          >
            <Typography variant='subtitle1' mb={1.5} color='text.secondary'>
              {t('contacts.notes')}
            </Typography>

            <Box
              borderRadius={1}
              border={`1px solid ${alpha(theme.palette.grey[500], 0.2)}`}
              p={2}
              maxHeight='250px'
              overflow='auto'
              color='text.secondary'
              {...getTestId(`contacts.contact.${index}.notes`)}
            >
              <HighlightTypography
                text={contact.notes}
                highlights={[
                  ...(matches?.find(match => match.key === 'notes')?.indices
                    || []),
                ]}
              />
            </Box>
          </Section>

          <Section
            inTransition={fullyExpanded}
            shouldAnimate={expanded}
            delay={100 + contact.addresses.length * 20 + socials.length * 20}
          >
            <SelectContactButton contact={contact} />
          </Section>
        </Box>
      </Collapse>

      <ConfirmationDialog
        open={showDeleteDialog}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        titleKey='contacts.deleteConfirmation.title'
        descriptionKey='contacts.deleteConfirmation.description'
        cancelKey='contacts.deleteConfirmation.cancel'
        confirmKey='contacts.deleteConfirmation.delete'
        confirmVariant='contained'
      />
    </Stack>
  )
}

const Section = ({
  children,
  inTransition,
  shouldAnimate,
  delay = 0,
  dataTestId,
}: {
  children: React.ReactNode
  inTransition?: boolean
  shouldAnimate: boolean
  delay?: number
  dataTestId?: string
}) => {
  if (!shouldAnimate) {
    return (
      <Box {...(dataTestId && getTestId(dataTestId))} sx={{ mb: 1.5 }}>
        {children}
      </Box>
    )
  }

  return (
    <Collapse
      {...(dataTestId && getTestId(dataTestId))}
      in={inTransition}
      timeout={{
        enter: 200,
        exit: 200,
      }}
      easing={{
        enter: 'cubic-bezier(0.4, 0, 0.2, 1)',
        exit: 'cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      sx={{
        mb: inTransition
          ? 1.5
          : 0,
        transitionDelay: `${delay}ms`,
        '& .MuiCollapse-wrapper': {
          transitionDelay: `${delay}ms`,
        },
        '& .MuiCollapse-wrapperInner': {
          transitionDelay: `${delay}ms`,
        },
      }}
    >
      {children}
    </Collapse>
  )
}
