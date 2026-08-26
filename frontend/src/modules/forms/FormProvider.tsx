import {
  type UseFormReturn,
  type SubmitHandler,
  FormProvider as RhfFormProvider,
} from 'react-hook-form'

type Props = {
  children: React.ReactNode
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formMethods: UseFormReturn<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit?: SubmitHandler<any>
}

export function FormProvider({
  children,
  onSubmit,
  formMethods,
}: Props) {
  return (
    <RhfFormProvider {...formMethods}>
      <form
        onSubmit={e => {
          e.preventDefault()
          if (onSubmit) {
            formMethods.handleSubmit(onSubmit)(e)
          }
        }}
        style={{ height: '100%', paddingTop: '16px' }}
      >
        {children}
      </form>
    </RhfFormProvider>
  )
}
