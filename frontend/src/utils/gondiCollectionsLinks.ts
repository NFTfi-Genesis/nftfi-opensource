import { Address } from 'src/entities/base/Address'
import { isBetween } from './numbers'

export const GONDI_VAULT_ADDRESSES = {
  vault_v2: '0x823de2c44369e94cac3da789ad4b6493e27e4bfe',
  vault: '0x14a6dcebb2bb73aae1b199ccaada75247b81976d',
}

export const getGondiLinkFromProjectContractAddress = (
  projectContractAddress?: Address,
  nftId?: bigint
) => {
  switch (projectContractAddress?.toLowerCase()) {
    // Gondi vaults
    case GONDI_VAULT_ADDRESSES.vault_v2:
      return 'https://www.gondi.xyz/collections/gondi-user-vault-v2'
    case GONDI_VAULT_ADDRESSES.vault:
      return 'https://www.gondi.xyz/collections/gondi-user-vault'

    // XCOPY collections
    case '0x905e7e152ecd7315f03d8d671578ea72684cca99':
      return 'https://www.gondi.xyz/collections/xcopy-editions-905e'
    case '0x3696cd00618a08c8793208385ae526677c889d4a':
      return 'https://www.gondi.xyz/collections/xcopy-editions-3696'
    case '0xd652d2633cdbfd5f27f50cddb098e708fa8433f3':
      return 'https://www.gondi.xyz/collections/xcopy-editions'
    case '0xfd04e14334d876635e7ea46ae636d4a45d8ffdde':
      return 'https://www.gondi.xyz/collections/xcopy-editions-fd04'
    case '0xc4560031bf20e5c930e77a61a4de9794db51e504':
      return 'https://www.gondi.xyz/collections/xcopy'
    case '0x8a939fd297fab7388d6e6c634eee3c863626be57':
      return 'https://www.gondi.xyz/collections/xcopy-editions-8a93'
    case '0x42df42a471e1db2d4e4a1545b2f4b951f2da06e4':
      return 'https://www.gondi.xyz/collections/xcopy-editions-42df'
    case '0xc04e0000726ed7c5b9f0045bc0c4806321bc6c65':
      return 'https://www.gondi.xyz/collections/icxn-by-xcopy'

    // Rest Gondi collection slugs
    case '0xb7f7f6c52f2e2fdb1963eab30438024864c313f6':
      return 'https://www.gondi.xyz/collections/wrapped-cryptopunks'
    case '0x7a63d17f5a59bca04b6702f461b1f1a1c59b100b':
      return 'https://www.gondi.xyz/collections/winds-of-yawanawa'
    case '0x4440732b0d85e2a77dcb2caedfd940154241249a':
      return 'https://www.gondi.xyz/collections/sam-spratt-masks-of-luci'
    case '0x8a90cab2b38dba80c64b7734e58ee1db38b8992e':
      return 'https://www.gondi.xyz/collections/doodles-official'
    case '0x000000000000003607fce1ac9e043a86675c5c2f':
      return 'https://www.gondi.xyz/collections/cryptopunks-721'
    case '0xa3f5998047579334607c47a6a2889bf87a17fc02':
      return 'https://www.gondi.xyz/collections/wrapped-ether-rock'
    case '0xc0ec4e4ba06dfb2dfaf21a69fc78310d80fc5497':
      return 'https://www.gondi.xyz/collections/wrappedsuperrare'
    case '0xc9041f80dce73721a5f6a779672ec57ef255d27c':
      return 'https://www.gondi.xyz/collections/skulls-of-luci'
    case '0xed5af388653567af2f388e6224dc7c4b3241c544':
      return 'https://www.gondi.xyz/collections/azuki'
    case '0x7bd29408f11d2bfc23c34f18275bbf23bb716bc7':
      return 'https://www.gondi.xyz/collections/meebits'
    case '0xd4e4078ca3495de5b1d4db434bebc5a986197782':
      return 'https://www.gondi.xyz/collections/autoglyphs'
    case '0xb097fba49a679a61b18b7079b99a953ca2691c9d':
      return 'https://www.gondi.xyz/collections/dataland-biomelumina'
    case '0xfbeef911dc5821886e1dda71586d90ed28174b7d':
      return 'https://www.gondi.xyz/collections/known-origin'
    case '0x12f28e2106ce8fd8464885b80ea865e98b465149':
      return 'https://www.gondi.xyz/collections/beeple-special-edition'
    case '0x60e4d786628fea6478f785a6d7e704777c86a7c6':
      return 'https://www.gondi.xyz/collections/mutant-ape-yacht-club'
    case '0x45882f9bc325e14fbb298a1df930c43a874b83ae':
      return 'https://www.gondi.xyz/collections/pebbles-by-zeblocks'
    case '0xb6a37b5d14d502c3ab0ae6f3a0e058bc9517786e':
      return 'https://www.gondi.xyz/collections/azukielementals'
    case '0x23581767a106ae21c074b2276d25e5c3e136a68b':
      return 'https://www.gondi.xyz/collections/proof-moonbirds'
    case '0xda1bf9b5de160cecde3f9304b187a2f5f5b83707':
      return 'https://www.gondi.xyz/collections/chronophotograph'
    case '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d':
      return 'https://www.gondi.xyz/collections/boredapeyachtclub'
    case '0xc143bbfcdbdbed6d454803804752a064a622c1f3':
      return 'https://www.gondi.xyz/collections/grifters-by-xcopy'
    case '0x79fcdef22feed20eddacbb2587640e45491b757f':
      return 'https://www.gondi.xyz/collections/mfers'
    case '0x036721e5a769cc48b3189efbb9cce4471e8a48b1':
      return 'https://www.gondi.xyz/collections/vv-checks-originals'
    case '0xc3f733ca98e0dad0386979eb96fb1722a1a05e69':
      return 'https://www.gondi.xyz/collections/acclimatedmooncats'
    case '0x524cab2ec69124574082676e6f654a18df49a048':
      return 'https://www.gondi.xyz/collections/lilpudgys'
    case '0x1a92f7381b9f03921564a437210bb9396471050c':
      return 'https://www.gondi.xyz/collections/cool-cats-nft'
    case '0xd1169e5349d1cb9941f3dcba135c8a4b9eacfdde':
      return 'https://www.gondi.xyz/collections/max-pain-and-frens-by-xcopy-d116'
    case '0x18a62e93ff3ab180e0c7abd4812595bf2be3405f':
      return 'https://www.gondi.xyz/collections/max-pain-and-frens-by-xcopy'
    case '0x68e23700e1ba3770263831fd97266382178b2fd8':
      return 'https://www.gondi.xyz/collections/aiimaginedfaces-on-chain-by-van-arman'
    case '0xd4b7d9bb20fa20ddada9ecef8a7355ca983cccb1':
      return 'https://www.gondi.xyz/collections/quirkiesoriginals'
    case '0x80336ad7a747236ef41f47ed2c7641828a480baa':
      return 'https://www.gondi.xyz/collections/chimpersnft'
    case '0x211899f45856e22df75623a2c6abe7997802ebc3':
      return 'https://www.gondi.xyz/collections/xcopy-editions-2118'
    case '0xb932a70a57673d89f4acffbe830e8ed7f75fb9e0':
      return 'https://www.gondi.xyz/collections/superrare'
    case '0xaadc2d4261199ce24a4b0a57370c4fcf43bb60aa':
      return 'https://www.gondi.xyz/collections/thecurrency'
    case '0xdfde78d2baec499fe18f2be74b6c287eed9511d7':
      return 'https://www.gondi.xyz/collections/life-in-west-america-by-roope-rainisto'
    case '0x7f9ebfa1d41d138ba0be61088de0fb59966a4b30':
      return 'https://www.gondi.xyz/collections/lifeinjapaneditions'
    case '0x062e691c2054de82f28008a8ccc6d7a1c8ce060d':
      return 'https://www.gondi.xyz/collections/pudgyrods'
    case '0xd3f9551e9bc926cc180ac8d3e27364f4081df624':
      return 'https://www.gondi.xyz/collections/servantsofthemuse'
    case '0x49129a186169ecebf3c1ab036d99d4ecb9a95c67':
      return 'https://www.gondi.xyz/collections/the-flowers-project-v2'
    case '0xd90829c6c6012e4dde506bd95d7499a04b9a56de':
      return 'https://www.gondi.xyz/collections/brokenkeys'
    case '0xb6dae651468e9593e4581705a09c10a76ac1e0c8':
      return 'https://www.gondi.xyz/collections/async-art'
    case '0x44541d1ff5e8a1ed22566df771995fff9139f122':
      return 'https://www.gondi.xyz/collections/beeple-everydays-v2'
    case '0x7d0874f682c42f0fe907baf7785d9dcb5a0b1285':
      return 'https://www.gondi.xyz/collections/ack-pfp'
    case '0x8cdbd7010bd197848e95c1fd7f6e870aac9b0d3c':
      return 'https://www.gondi.xyz/collections/signature-by-jack-butcher'

    // Artblocks collections
    case '0x059edd72cd353df5106d2b9cc5ab83a52287ac3a': {
      if (isBetween(nftId, 0, 999999)) {
        return 'https://www.gondi.xyz/collections/chromie-squiggle-by-snowfro'
      }
      break
    }
    case '0x99a9b7c1116f9ceeb1652de04d5969cce509b069': {
      if (isBetween(nftId, 407000000, 407999999)) {
        return 'https://www.gondi.xyz/collections/the-harvest-by-per-kristian-stoveland'
      }
      if (isBetween(nftId, 426000000, 426000999)) {
        return 'https://www.gondi.xyz/collections/cargo-by-kim-asendorf'
      }
      break
    }
    case '0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270': {
      if (isBetween(nftId, 78000000, 78999999)) {
        return 'https://www.gondi.xyz/collections/fidenza-by-tyler-hobbs'
      }
      if (isBetween(nftId, 13000000, 13999999)) {
        return 'https://www.gondi.xyz/collections/ringers-by-dmitri-cherniak'
      }
      if (isBetween(nftId, 163000000, 163999999)) {
        return 'https://www.gondi.xyz/collections/meridian-by-matt-deslauriers'
      }
      if (isBetween(nftId, 159000000, 159999999)) {
        // name: 'Fragments of an Infinite Field by Monica Rizzolli',
        return 'https://www.gondi.xyz/collections/'
      }
      if (isBetween(nftId, 23000000, 23999999)) {
        return 'https://www.gondi.xyz/collections/archetype-by-kjetil-golid'
      }
      if (isBetween(nftId, 138000000, 138999999)) {
        // name: 'Geometry Runners by Rich Lord',
        return 'https://www.gondi.xyz/collections/'
      }
      if (isBetween(nftId, 215000000, 215999999)) {
        return 'https://www.gondi.xyz/collections/gazers-by-matt-kane'
      }
      if (isBetween(nftId, 143000000, 143999999)) {
        // name: 'phase by Loren Bednar',
        return 'https://www.gondi.xyz/collections/'
      }
      if (isBetween(nftId, 129000000, 129999999)) {
        // name: 'Pigments by Darien Brito',
        return 'https://www.gondi.xyz/collections/'
      }
      if (isBetween(nftId, 173000000, 173999999)) {
        // name: 'Skulptuur by Piter Pasma',
        return 'https://www.gondi.xyz/collections/'
      }
      if (isBetween(nftId, 53000000, 53999999)) {
        return 'https://www.gondi.xyz/collections/subscapes-by-matt-deslauriers'
      }
      if (isBetween(nftId, 119000000, 119999999)) {
        // name: 'Ecumenopolis by Joshua Bagley',
        return 'https://www.gondi.xyz/collections/'
      }
      if (isBetween(nftId, 304000000, 304999999)) {
        return 'https://www.gondi.xyz/collections/anticyclone-by-william-mapan'
      }
      if (isBetween(nftId, 204000000, 204999999)) {
        // name: 'Edifice by Ben Kovach',
        return 'https://www.gondi.xyz/collections/'
      }
      if (isBetween(nftId, 98000000, 98999999)) {
        // name: 'sail-o-bots by sturec',
        return 'https://www.gondi.xyz/collections/'
      }
      if (isBetween(nftId, 282000000, 282999999)) {
        return 'https://www.gondi.xyz/collections/memories-of-qilin-by-emily-xie'
      }
      if (isBetween(nftId, 8000000, 8999999)) {
        return 'https://www.gondi.xyz/collections/singularity-by-hideki-tsukamoto'
      }
      if (isBetween(nftId, 7000000, 7999999)) {
        // name: 'Elevated Deconstructions by luxpris',
        return 'https://www.gondi.xyz/collections/'
      }
      if (isBetween(nftId, 255000000, 255999999)) {
        // name: 'Screens by Thomas Lin Pedersen',
        return 'https://www.gondi.xyz/collections/'
      }
      if (isBetween(nftId, 22000000, 22999999)) {
        return 'https://www.gondi.xyz/collections/the-eternal-pump-by-dmitri-cherniak'
      }
      if (isBetween(nftId, 233000000, 233999999)) {
        // name: 'Chimera by mpkoz',
        return 'https://www.gondi.xyz/collections/'
      }
      if (isBetween(nftId, 131000000, 131999999)) {
        // name: 'Scribbled Boundaries by William Tan',
        return 'https://www.gondi.xyz/collections/'
      }
      if (isBetween(nftId, 214000000, 214999999)) {
        // name: 'Bent by ippsketch',
        return 'https://www.gondi.xyz/collections/'
      }
      break
    }
    default:
      return null
  }
}

export const gondiCollectionsLinks = [
  {
    protocolLabel: 'DATALAND — BIOME LUMINA',
    gondiLink: 'dataland-biomelumina',
  },
  {
    protocolLabel: 'Wrapped Cryptopunks',
    gondiLink: 'wrapped-cryptopunks',
  },
  {
    protocolLabel: 'CryptoPunks 721',
    gondiLink: 'cryptopunks-721',
  },
  {
    protocolLabel: 'Autoglyphs',
    gondiLink: 'autoglyphs',
  },
  {
    protocolLabel: 'Chromie Squiggle by Snowfro',
    gondiLink: 'chromie-squiggle-by-snowfro',
  },
  {
    protocolLabel: 'WrappedSuperRare',
    gondiLink: 'wrappedsuperrare',
  },
  {
    protocolLabel: 'Fidenza by Tyler Hobbs',
    gondiLink: 'fidenza-by-tyler-hobbs',
  },
  {
    protocolLabel: 'KnownOrigin',
    gondiLink: 'known-origin',
  },
  {
    protocolLabel: 'BEEPLE - GENESIS COLLECTION',
    gondiLink: 'beeple-special-edition',
  },
  {
    protocolLabel: 'Mutant Ape Yacht Club',
    gondiLink: 'mutant-ape-yacht-club',
  },
  {
    protocolLabel: 'Bored Ape Yacht Club',
    gondiLink: 'boredapeyachtclub',
  },
  {
    protocolLabel: 'Ringers by Dmitri Cherniak',
    gondiLink: 'ringers-by-dmitri-cherniak',
  },
  {
    protocolLabel: 'Skulls of Luci',
    gondiLink: 'skulls-of-luci',
  },
  {
    protocolLabel: 'Machine Hallucinations — NFT Collections by Refik Anadol',
    gondiLink: 'refik-anadol',
  },
  {
    protocolLabel: 'BEEPLE - SPRING/SUMMER COLLECTION 2021',
    gondiLink: 'beeple-spring-collection',
  },
  {
    protocolLabel: 'Pudgy Penguins',
    gondiLink: 'pudgypenguins',
  },
  {
    protocolLabel: 'Wrapped Ether Rock',
    gondiLink: 'wrapped-ether-rock',
  },
  {
    protocolLabel: 'Grifters',
    gondiLink: 'grifters-by-xcopy',
  },
  {
    protocolLabel: 'Doodles',
    gondiLink: 'doodles-official',
  },
  {
    protocolLabel: 'Memories of Qilin by Emily Xie',
    gondiLink: 'memories-of-qilin-by-emily-xie',
  },
  {
    protocolLabel: 'Anticyclone by William Mapan',
    gondiLink: 'anticyclone-by-william-mapan',
  },
  {
    protocolLabel: 'Milady Maker',
    gondiLink: 'milady',
  },
  {
    protocolLabel: 'Legalize Ground Beef',
    gondiLink: 'legalize-ground-beef',
  },
  {
    protocolLabel: 'Winds of Yawanawa by Yawanawa and Refik Anadol',
    gondiLink: 'winds-of-yawanawa',
  },
  {
    protocolLabel: 'Sam Spratt - Masks of Luci',
    gondiLink: 'sam-spratt-masks-of-luci',
  },
  {
    protocolLabel: 'BEEPLE: EVERYDAYS - THE 2020 COLLECTION',
    gondiLink: 'beeple-everydays',
  },
  {
    protocolLabel: 'Incomplete Control by Tyler Hobbs',
    gondiLink: 'incomplete-control-by-tyler-hobbs',
  },
  {
    protocolLabel: 'Creepz by OVERLORD',
    gondiLink: 'genesis-creepz-5946',
  },
  {
    protocolLabel: 'The Harvest by Per Kristian Stoveland',
    gondiLink: 'the-harvest-by-per-kristian-stoveland',
  },
  {
    protocolLabel: 'REMNANTS',
    gondiLink: 'xcopy-remnants',
  },
  {
    protocolLabel: 'Memeland MVP',
    gondiLink: 'memelandmvp',
  },
  {
    protocolLabel:
      'Themes and Variations by Vera Molnár, in collaboration with Martin Grasser',
    gondiLink: 'vera-molnar-themes-and-variations',
  },
  {
    protocolLabel: 'Sproto Gremlins',
    gondiLink: 'sproto-gremlins',
  },
  {
    protocolLabel: 'Construction Token by Jeff Davis',
    gondiLink: 'construction-token-by-jeff-davis',
  },
  {
    protocolLabel: 'Memeland Captainz',
    gondiLink: 'memelandcaptainz',
  },
  {
    protocolLabel: 'Life In West America by Roope Rainisto',
    gondiLink: 'life-in-west-america-by-roope-rainisto',
  },
  {
    protocolLabel: 'Singularity by Hideki Tsukamoto',
    gondiLink: 'singularity-by-hideki-tsukamoto',
  },
  {
    protocolLabel: 'CryptoPunks V1 (wrapped)',
    gondiLink: 'official-v1-punks',
  },
  {
    protocolLabel: 'CryptoDickbutts',
    gondiLink: 'cryptodickbutts-s3',
  },
  {
    protocolLabel: 'CrypToadz by GREMPLIN',
    gondiLink: 'cryptoadz-by-gremplin',
  },
  {
    protocolLabel: 'Unigrids by Zeblocks',
    gondiLink: 'unigrids-by-zeblocks',
  },
  {
    protocolLabel: 'Fontana by Harvey Rayner | patterndotco',
    gondiLink: 'fontana-by-harvey-rayner-patterndotco',
  },
  {
    protocolLabel: 'Signature by Jack Butcher',
    gondiLink: 'signature-by-jack-butcher',
  },
  {
    protocolLabel: 'Meridian by Matt DesLauriers',
    gondiLink: 'meridian-by-matt-deslauriers',
  },
  {
    protocolLabel: 'Azuki',
    gondiLink: 'azuki',
  },
  {
    protocolLabel: 'Gazers by Matt Kane',
    gondiLink: 'gazers-by-matt-kane',
  },
  {
    protocolLabel: 'BEEPLE - THE 5000 DAYS COLLECTION',
    gondiLink: 'beeple-5000',
  },
  {
    protocolLabel: "ACK Unique Editions / 1 of 1's",
    gondiLink: 'alpha-centauri-kid',
  },
  {
    protocolLabel: 'Sam Spratt - LUCI: Chapter 5 - The Monument Game',
    gondiLink: 'sam-spratt-luci-chapter-5-the-monument-game',
  },
  {
    protocolLabel: 'Meebits',
    gondiLink: 'meebits',
  },
  {
    protocolLabel: 'Terraforms by Mathcastles',
    gondiLink: 'terraforms',
  },
  {
    protocolLabel: 'Archetype by Kjetil Golid',
    gondiLink: 'archetype-by-kjetil-golid',
  },
  {
    protocolLabel: 'CyberKongz',
    gondiLink: 'cyberkongz',
  },
  {
    protocolLabel: 'alignDRAW',
    gondiLink: 'aligndraw',
  },
  {
    protocolLabel: 'Mocaverse',
    gondiLink: 'mocaverse',
  },
  {
    protocolLabel: 'mfers',
    gondiLink: 'mfers',
  },
  {
    protocolLabel: 'Azuki Elementals',
    gondiLink: 'azukielementals',
  },
  {
    protocolLabel: 'NextGen 6529 | Pebbles by Zeblocks',
    gondiLink: 'pebbles-by-zeblocks',
  },
  //
  {
    protocolLabel: 'SuperRare 1/1s: bottoproject',
    gondiLink: '',
  },

  {
    protocolLabel: 'WrappedSupeRare',
    gondiLink: '',
  },
  // {
  //   protocolLabel: 'XCOPY editions 2019-22',
  //   gondiLink: '',
  // },
  // {
  //   protocolLabel: 'XCOPY',
  //   gondiLink: '',
  // },
  {
    protocolLabel: 'BEEPLE:  EVERYDAYS',
    gondiLink: 'beeple-everydays-v2',
  },
  {
    protocolLabel: 'BEEPLE: EVERYDAYS',
    gondiLink: 'beeple-everydays-v2',
  },
  {
    protocolLabel: 'SuperRare 1/1s: Sam Spratt',
    gondiLink: 'superrare',
  },
  {
    protocolLabel: 'SuperRare 1/1s: XCOPY',
    gondiLink: '',
  },
  {
    protocolLabel: 'SuperRare 1/1s: manoloide',
    gondiLink: '',
  },
  {
    protocolLabel: 'The Eternal Pump by Dmitri Cherniak',
    gondiLink: '',
  },
  {
    protocolLabel: 'Async Art',
    gondiLink: '',
  },
  {
    protocolLabel: 'SuperRare 1/1s: Coldie',
    gondiLink: '',
  },
  {
    protocolLabel: 'everything vs nothing',
    gondiLink: '',
  },
  {
    protocolLabel: 'SuperRare 1/1s: Cath Simard',
    gondiLink: '',
  },
  {
    protocolLabel: 'Deafbeef',
    gondiLink: '',
  },
  {
    protocolLabel: 'Subscapes by Matt DesLauriers',
    gondiLink: '',
  },
  {
    protocolLabel: 'Off Script by Emily Xie',
    gondiLink: '',
  },
  {
    protocolLabel: 'CHRONOPHOTOGRAPH by 0xDEAFBEEF',
    gondiLink: 'chronophotograph',
  },
  {
    protocolLabel: 'FOLIO by Matt DesLauriers',
    gondiLink: '',
  },
  {
    protocolLabel: 'Moonbirds',
    gondiLink: 'proof-moonbirds',
  },
  {
    protocolLabel: 'Life In Japan Editions by Grant Yun',
    gondiLink: '',
  },
]

export const getGondiLinkFromProjectName = (projectName?: string) => {
  if (!projectName) {
    return null
  }

  const project = gondiCollectionsLinks.find(
    item => item.protocolLabel === projectName
  )
  if (project && project.gondiLink) {
    return `https://gondi.xyz/collections/${project.gondiLink}`
  } else {
    return null
  }
}
