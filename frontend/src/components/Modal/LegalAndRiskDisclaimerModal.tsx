import { Button, Stack, Box, Link } from '@mui/material'
import { Modal } from 'src/components/Modal/Modal'
import { useTranslation } from 'src/modules/translation/useTranslation'
import { Modals } from 'src/modules/modals/Modals'
import { useModals } from 'src/modules/modals/useModals'
import { setLegalAndRiskDisclaimerConsent } from 'src/utils/legalAndRiskDisclaimer'

export type LegalAndRiskDisclaimerModalProps = {
  onProceed: () => void
}

export function LegalAndRiskDisclaimerModal({ onProceed }: LegalAndRiskDisclaimerModalProps) {
  const { t } = useTranslation()
  const { close } = useModals(Modals.LegalAndRiskDisclaimer)

  function handleProceed() {
    setLegalAndRiskDisclaimerConsent(true)
    close()
    onProceed()
  }

  return (
    <Modal
      modal={Modals.LegalAndRiskDisclaimer}
      title={t('common.legal-and-risk-disclaimer')}
      sx={{
        '& .MuiDialog-paper': {
          maxWidth: {
            xs: '632px',
            sm: '1200px',
          },
        },
      }}
    >
      <>
        <Box
          sx={{
            maxHeight: '60vh',
            overflowY: 'auto',
            backgroundColor: 'customPallette.nftfi.paperRecess',
            padding: 3,
            borderRadius: 1,
          }}
        >
          <div className='content'>
            <p>
              You are accessing NFTfi's interface to the decentralized NFTfi liquidity protocol. This protocol enables NFT
              owners to collateralize certain real-world asset backed, or purely digital, NFT assets to seek loans.
              Borrowers and lenders can enter into lending arrangements directly with each other, in a peer-to-peer manner.
            </p>

            <p>
              The use of NFTfi's interface for whatever reason, and the display of any content therein, is subject to this
              disclaimer ("Disclaimer") and the{' '}
              <Link href='https://nftfi.com/terms-and-conditions/' target='_blank' rel='noreferrer'>
                Terms & Conditions
              </Link>
              . In the event of any contradiction or inconsistency between this Disclaimer and the Terms & Conditions, the
              terms set out in this Disclaimer shall prevail. You must agree to this Disclaimer prior to using NFTfi's
              services.
            </p>

            <div className='heading'>Please read and accept the following Disclaimer before proceeding:</div>

            <ol>
              <li>
                <strong>Loan Default and Transfer of Ownership:</strong>
                <ul>
                  <li>
                    If you are a borrower, in the event you default on your loan, ownership of the asset used as collateral
                    for the loan transfers to the lender.
                    <ul>
                      <li>
                        Where the collateral for the loan involves a digital asset (as opposed to a physical asset), you
                        agree to transfer the entire digital asset (along with any of your claims on that digital asset) to
                        the lender.
                      </li>
                      <li>
                        Where the collateral for the loan involves a physical asset (as opposed to a digital asset), you
                        agree to transfer any of your claims on the underlying physical asset to the lender.
                      </li>
                    </ul>
                  </li>
                </ul>
              </li>
              <li>
                <strong>Disclaimer of Liability:</strong>
                <ul>
                  <li>
                    NFTfi functions as a peer-to-peer protocol, facilitating agreements directly between users. NFTfi has no
                    control over any user assets used on the protocol, and NFTfi never encourages users to enter (or not
                    enter) into any financial transaction. As such, NFTfi disclaims all liability regarding any claims that
                    arise as a result of your decision to engage in any financial transaction through the NFTfi interface,
                    to the fullest extent permitted by law.
                  </li>
                  <li>NFTfi does not underwrite or service any loans.</li>
                  <li>
                    NFTfi does not guarantee the accuracy or economic value of any NFTs, the borrower's repayment ability,
                    or any other aspect of the loan transaction or information provided by NFTfi's interface.
                  </li>
                </ul>
              </li>
              <li>
                <strong>Risk Disclosures:</strong>
                <ul>
                  <li>
                    You must understand the substantial risks involved with using NFT loans. These differ slightly for
                    real-world asset backed and digital-only NFTs, and include, but are not limited to, default risk, market
                    and liquidity risk, regulatory and compliance risk, legal and title risks, storage, maintenance, and
                    environmental risks, and platform risk, among others.
                  </li>
                  <li>
                    Real-world asset backed NFTs involve additional considerations such as, but not limited to, the
                    condition and maintenance of the real-world asset, insurance and security risks, and potential
                    regulatory, tax, and additional cost implications, among others. The ownership and/or redemption of such
                    physical assets may have implications for the holder of the NFT. You must do your own research and
                    understand these NFT-specific implications before engaging in asset-backed loan transactions. If you
                    have any doubts, contact the respective asset-issuer for further information, seek advice from an
                    independent financial advisor or best still, abstain from partaking in the loan transaction. NFTfi does
                    not vouch for the accuracy or completeness of any information about any NFTs listed on the NFTfi
                    interface.
                  </li>
                </ul>
              </li>

              <li>
                <strong>Due Diligence and Professional Advice:</strong>
                <ul>
                  <li>
                    You must conduct thorough research and, where necessary, seek professional advice before using NFTfi's
                    services. This includes assessing the NFT's value, understanding any associated legal and financial
                    obligations and considering personal risk tolerance.
                  </li>
                </ul>
              </li>
              <li>
                <strong>Acknowledgements and Agreements by User:</strong>
                <br />
                <ul>
                  <li>
                    By using NFTfi's interface, you confirm that you have read, understood, and accept the risks and terms
                    outlined in this Disclaimer. You understand that NFTfi, its affiliates, officers, or employees will not
                    be responsible for any loss that you incur from your use of NFTfi's interface, including your entering
                    into any loan transaction.
                  </li>
                  <li>
                    You acknowledge that the NFTfi protocol facilitates loan transactions peer-to-peer and that NFTfi does
                    not vouch for any transaction's legality - you are solely responsible for complying with any and all
                    applicable laws and regulations.
                  </li>
                  <li>
                    You agree to bear any and all risks associated with their loan transactions and will not in any
                    situation hold NFTfi, its affiliates, officers, or employees liable for any issues arising from the use
                    of NFTfi's interface and/or protocol.
                  </li>
                </ul>
              </li>
            </ol>

            <p>
              <strong>Conclusion:</strong>
              <br />
              NFTfi strongly recommends interacting only with assets you are prepared to lose, acknowledging that NFT
              lending carries significant risk.
            </p>

            <p>
              <strong>User Confirmation:</strong>
              <br />
              By proceeding, you confirm your understanding and acceptance of the terms and risks outlined in this
              Disclaimer.
            </p>
          </div>
        </Box>

        <Stack direction='row' gap={2} justifyContent='flex-end' mt={2}>
          <Button variant='outlined' onClick={close} sx={{ flex: 1 }}>
            {t('common.cancel')}
          </Button>
          <Button variant='contained' color='primary' onClick={handleProceed} sx={{ flex: 1 }}>
            {t('common.proceed')}
          </Button>
        </Stack>
      </>
    </Modal>
  )
}
