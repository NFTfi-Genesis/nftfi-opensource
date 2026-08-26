import { useMemo, useCallback } from 'react'
import { useForm, useController } from 'react-hook-form'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { useAccount } from 'src/services/hooks/account/useAccount'
import { useUpdateAccount } from 'src/services/hooks/account/useUpdateAccount'

type FormValues = {
  email: string
}

export function useReceiveNotificationsEmail() {
  const { t } = useTranslation()
  const { data: userProfile } = useAccount()
  const { email: initialEmail } = userProfile || {}
  const { send: updateAccount } = useUpdateAccount()

  const form = useForm<FormValues>({
    defaultValues: {
      email: initialEmail || '',
    },
    mode: 'onChange',
  })

  const { field, fieldState } = useController({
    control: form.control,
    name: 'email',
    rules: {
      pattern: {
        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
        message: t('contacts.invalidEmail'),
      },
    },
  })

  const shouldShow = useMemo(() => {
    if (userProfile !== null) {
      return !userProfile.email
    }
    return false
  }, [userProfile])

  const submitEmail = useCallback(async (): Promise<boolean> => {
    const currentEmail = field.value
    if (!currentEmail || currentEmail === initialEmail) {
      return true // No email to submit, consider it successful
    }

    const isValid = await form.trigger('email')
    if (!isValid) {
      return false // Invalid email, don't submit
    }
    const { success } = await updateAccount({ email: currentEmail })
    return success
  }, [field.value, form, updateAccount, initialEmail])

  return {
    field,
    fieldState,
    shouldShow,
    submitEmail,
  }
}
