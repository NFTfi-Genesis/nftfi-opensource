import { Modals } from 'src/modules/modals/Modals'
import { ModalActions } from '../common/ModalActions'

export type MakeOfferModalActionProps = {
  modal: Modals.MakeAssetOffer | Modals.MakeCollectionOffer
  onSubmit?: () => void | Promise<void>
  isMutating: boolean
}

export function MakeOfferModalAction({ modal, onSubmit, isMutating }: MakeOfferModalActionProps) {
  return (
    <ModalActions
      modal={modal}
      onAction={onSubmit}
      actionLabel='lend.confirm-offer'
      isDisabled={isMutating}
    />
  )
}
