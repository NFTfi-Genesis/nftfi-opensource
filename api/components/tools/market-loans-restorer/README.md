```bash
yarn nx serve market-loans-restorer \
--args=\
"--label=tmp",\
"--protocol=nftfi",\
"--db-uri=postgres://root:admin1234@localhost:5432/nftfi",\
"--cache-uri=redis://localhost:6389/",\
"--ethereum-provider-uri=https://eth-mainnet.g.alchemy.com/v2/<secret>"
```

## Migration Strategy

run "market-loans-restorer --label=tmp"
run "market-loans-restorer-finisher --label=tmp"
