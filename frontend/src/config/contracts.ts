import { z } from 'zod'
import { Address } from 'src/entities/base/Address'
import { zAddress } from './utils'

export const contractsSchema = z.object({
  nftfi: z.object({
    v3: z.object({
      erc20Manager: z.object({
        address: zAddress(),
      }),
      refinance: z.object({
        address: zAddress(),
      }),
      escrow: z.object({
        address: zAddress(),
      }),
      coordinator: z.object({
        address: zAddress(),
      }),
      assetOfferLoan: z.object({
        address: zAddress(),
      }),
      collectionOfferLoan: z.object({
        address: zAddress(),
      }),
      obligationReceipt: z.object({
        address: zAddress(),
      }),
      adapters: z.object({
        gondi: z.object({ address: zAddress() }),
      }),
    }),
    v2_3: z.object({
      assetLoan: z.object({
        address: zAddress(),
      }),
      collectionLoan: z.object({
        address: zAddress(),
      }),
    }),
    collection: z.object({
      cryptopunks: z.object({
        address: zAddress(),
      }),
    }),
  }),
})

export const contracts: z.infer<typeof contractsSchema> = {
  nftfi: {
    v3: {
      erc20Manager: {
        address: '0x6730697f33d6d2490029b32899e7865c0d902ca0' as Address,
      },
      refinance: {
        address: '0x4bc5fa56f2931e7a37417fa55dda71e4b7c2f2a3' as Address,
      },
      escrow: {
        address: '0x2ae3e46290ade43593eabd15642ebd67157f5351' as Address,
      },
      coordinator: {
        address: '0xa6d93abc54268cf849a93e867c129786f04fd2e6' as Address,
      },
      assetOfferLoan: {
        address: '0x9f10d706d789e4c76a1a6434cd1a9841c875c0a6' as Address,
      },
      collectionOfferLoan: {
        address: '0xb6adec2acc851d30d5fb64f3137234bcdcbbad0d' as Address,
      },
      obligationReceipt: {
        address: '0x48ed998e778ab2663b6c49bd09dfff8efd16b934' as Address,
      },
      adapters: {
        gondi: { address: '0x4d72CFB5b8F642dD86cD48Dd8830f74095a52B4C' as Address },
      },
    },
    v2_3: {
      assetLoan: {
        address: '0x88341d1a8f672d2780c8dc725902aae72f143b0c' as Address,
      },
      collectionLoan: {
        address: '0xd0c6e59b50c32530c627107f50acc71958c4341f' as Address,
      },
    },
    collection: {
      cryptopunks: {
        address: '0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb' as Address,
      },
    },
  },
}
