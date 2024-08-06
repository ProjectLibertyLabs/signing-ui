# signing-ui

A UI to demonstrate and help with testing extrinsics that send signed payloads to a Frequency parachain.

### Features

- Connect to local or Testnet Frequency Node.
- When connected to Testnet Frequency Node, automatically populates any needed signers with keys pulled from Polkadot extension
- When connected to Frequency on localhost, populates the needed signers with Alice through Ferdie test accounts.
- Generate and display required payload signatures, given inputs
- Submit the extrinsic with the generated signature and provided inputs to the chosen chain
- Extrinsics:
  - handles.claim_handle
  - msa.create_sponsored_account_with_delegation
  - msa.grant_delegation
  - msa.add_public_key_to_msa
  - stateful_storage.apply_item_actions_with_signature
  - stateful_storage.upsert_page_with_signature
  - stateful_storage.delete_page_with_signature

## References

https://libertydsnp.github.io/frequency/

## To run locally:

Start a webserver, such as [Simple Web Server](https://simplewebserver.org/).

Load at http://localhost:8080

## Deployment

https://projectlibertylabs.github.io/signing-ui/
