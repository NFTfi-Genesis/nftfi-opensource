import { createContext, ReactNode, useMemo } from 'react'
import { Backdrop, useTheme, alpha } from '@mui/material'
import { StartLoanModal, StartLoanModalProps } from 'src/components/Modal/start/StartLoanModal'
import { LiquidateLoanModal, LiquidateLoanModalProps } from 'src/components/Modal/liquidate/LiquidateLoanModal'
import { EditProfileModal, EditProfileModalProps } from 'src/components/Modal/editProfile/EditProfileModal'
import { MakeAssetOfferModal, MakeAssetOfferModalProps } from 'src/components/Modal/offer/MakeAssetOfferModal'
import { MakeCollectionOfferModal, MakeCollectionOfferModalProps } from 'src/components/Modal/offer/MakeCollectionOfferModal'
import { RefiLoanModalNftfi, RefiLoanModalNftfiProps } from 'src/components/Modal/refinance/RefiLoanModalNftfi'
import { RefiLoanModalGondi, RefiLoanModalGondiProps } from 'src/components/Modal/refinance/RefiLoanModalGondi'
import { RepayLoanModal, RepayLoanModalProps } from 'src/components/Modal/repay/RepayLoanModal'
import { SuccessLoanModal, SuccessLoanModalProps } from 'src/components/Modal/SuccessLoanModal'
import { LegalAndRiskDisclaimerModal, LegalAndRiskDisclaimerModalProps } from 'src/components/Modal/LegalAndRiskDisclaimerModal'
import { LoanExtensionModal, LoanExtensionModalProps } from 'src/components/Modal/loanExtension/LoanExtensionModal'
import { AcceptLoanExtensionModal, AcceptLoanExtensionModalProps } from 'src/components/Modal/loanExtension/AcceptLoanExtensionModal'
import { useCreateModal, CreateModalResult } from './useCreateModal'
import { Modals } from './Modals'

export type ModalsContextType = {
  [Modals.StartLoan]: CreateModalResult<StartLoanModalProps>
  [Modals.Liquidate]: CreateModalResult<LiquidateLoanModalProps>
  [Modals.EditProfile]: CreateModalResult<EditProfileModalProps>
  [Modals.MakeAssetOffer]: CreateModalResult<MakeAssetOfferModalProps>
  [Modals.MakeCollectionOffer]: CreateModalResult<MakeCollectionOfferModalProps>
  [Modals.RefiLoanGondi]: CreateModalResult<RefiLoanModalGondiProps>
  [Modals.RefiLoanNftfi]: CreateModalResult<RefiLoanModalNftfiProps>
  [Modals.Repay]: CreateModalResult<RepayLoanModalProps>
  [Modals.SuccessLoan]: CreateModalResult<SuccessLoanModalProps>
  [Modals.LegalAndRiskDisclaimer]: CreateModalResult<LegalAndRiskDisclaimerModalProps>
  [Modals.LoanExtension]: CreateModalResult<LoanExtensionModalProps>
  [Modals.AcceptLoanExtension]: CreateModalResult<AcceptLoanExtensionModalProps>
}

export const ModalsContext = createContext<ModalsContextType | null >(null)

export function ModalsProvider({ children }: { children: ReactNode }) {
  const theme = useTheme()
  const startLoanModal = useCreateModal<StartLoanModalProps>()
  const liquidateModal = useCreateModal<LiquidateLoanModalProps>()
  const editProfileModal = useCreateModal<EditProfileModalProps>()
  const makeAssetOfferModal = useCreateModal<MakeAssetOfferModalProps>()
  const makeCollectionOfferModal = useCreateModal<MakeCollectionOfferModalProps>()
  const refiLoanModalGondi = useCreateModal<RefiLoanModalGondiProps>()
  const refiLoanModalNftfi = useCreateModal<RefiLoanModalNftfiProps>()
  const repayLoanModal = useCreateModal<RepayLoanModalProps>()
  const successLoanModal = useCreateModal<SuccessLoanModalProps>()
  const legalAndRiskDisclaimerModal = useCreateModal<LegalAndRiskDisclaimerModalProps>()
  const loanExtensionModal = useCreateModal<LoanExtensionModalProps>()
  const acceptLoanExtensionModal = useCreateModal<AcceptLoanExtensionModalProps>()

  const isAnyModalOpen = useMemo(() => {
    return (
      startLoanModal.isOpen
      || liquidateModal.isOpen
      || editProfileModal.isOpen
      || makeAssetOfferModal.isOpen
      || makeCollectionOfferModal.isOpen
      || refiLoanModalGondi.isOpen
      || refiLoanModalNftfi.isOpen
      || repayLoanModal.isOpen
      || successLoanModal.isOpen
      || legalAndRiskDisclaimerModal.isOpen
      || loanExtensionModal.isOpen
      || acceptLoanExtensionModal.isOpen
    )
  }, [
    startLoanModal.isOpen,
    liquidateModal.isOpen,
    editProfileModal.isOpen,
    makeAssetOfferModal.isOpen,
    makeCollectionOfferModal.isOpen,
    refiLoanModalGondi.isOpen,
    refiLoanModalNftfi.isOpen,
    repayLoanModal.isOpen,
    successLoanModal.isOpen,
    legalAndRiskDisclaimerModal.isOpen,
    loanExtensionModal.isOpen,
    acceptLoanExtensionModal.isOpen,
  ])

  const shouldShowBackdrop = isAnyModalOpen

  return (
    <ModalsContext.Provider
      value={{
        [Modals.StartLoan]: startLoanModal,
        [Modals.Liquidate]: liquidateModal,
        [Modals.EditProfile]: editProfileModal,
        [Modals.MakeAssetOffer]: makeAssetOfferModal,
        [Modals.MakeCollectionOffer]: makeCollectionOfferModal,
        [Modals.RefiLoanGondi]: refiLoanModalGondi,
        [Modals.RefiLoanNftfi]: refiLoanModalNftfi,
        [Modals.Repay]: repayLoanModal,
        [Modals.SuccessLoan]: successLoanModal,
        [Modals.LegalAndRiskDisclaimer]: legalAndRiskDisclaimerModal,
        [Modals.LoanExtension]: loanExtensionModal,
        [Modals.AcceptLoanExtension]: acceptLoanExtensionModal,
      }}
    >
      {children}
      {startLoanModal.data && (
        <StartLoanModal {...startLoanModal.data} />
      )}
      {liquidateModal.data && (
        <LiquidateLoanModal {...liquidateModal.data}/>
      )}
      {editProfileModal.data && (
        <EditProfileModal {...editProfileModal.data}/>
      )}
      {makeAssetOfferModal.data && (
        <MakeAssetOfferModal {...makeAssetOfferModal.data}/>
      )}
      {makeCollectionOfferModal.data && (
        <MakeCollectionOfferModal {...makeCollectionOfferModal.data}/>
      )}
      {refiLoanModalGondi.data && (
        <RefiLoanModalGondi {...refiLoanModalGondi.data}/>
      )}
      {refiLoanModalNftfi.data && (
        <RefiLoanModalNftfi {...refiLoanModalNftfi.data}/>
      )}
      {repayLoanModal.data && (
        <RepayLoanModal {...repayLoanModal.data}/>
      )}
      {successLoanModal.data && (
        <SuccessLoanModal {...successLoanModal.data}/>
      )}
      {legalAndRiskDisclaimerModal.data && (
        <LegalAndRiskDisclaimerModal {...legalAndRiskDisclaimerModal.data}/>
      )}
      {loanExtensionModal.data && (
        <LoanExtensionModal {...loanExtensionModal.data}/>
      )}
      {acceptLoanExtensionModal.data && (
        <AcceptLoanExtensionModal {...acceptLoanExtensionModal.data}/>
      )}
      <Backdrop
        open={shouldShowBackdrop}
        sx={{
          zIndex: theme.zIndex.modal - 1,
          backgroundColor: alpha(theme.palette.grey[900], 0.5),
          pointerEvents: isAnyModalOpen
            ? 'auto'
            : 'none',
        }}
      />
    </ModalsContext.Provider>
  )
}
