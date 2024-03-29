// These are copied over from @frequency-chain/api-augment for simplicity of this example code.
// Implementors should use the latest package at
// https://www.npmjs.com/package/@frequency-chain/api-augment

// @ts-ignore
import { Bytes, Struct, u16, u32, u64 } from "https://cdn.jsdelivr.net/npm/@polkadot/api@10.12.4/+esm";

export interface MessageSourceId extends u64 {}

export interface SchemaId extends u16 {}

export type ItemizedSignaturePayload = {
  msaId: MessageSourceId;
  schemaId: SchemaId;
  targetHash: u32;
  expiration: any;
  actions: Array<any>;
};

export interface ItemizedStoragePageResponse extends Struct {
  readonly msa_id: MessageSourceId;
  readonly schema_id: SchemaId;
  readonly content_hash: PageHash;
  readonly nonce: PageNonce;
  readonly items: Array<ItemizedStorageResponse>;
}

/** @name ItemizedStorageResponse */
export interface ItemizedStorageResponse extends Struct {
  readonly index: u16;
  readonly payload: Bytes;
}

/** @name PageHash */
export interface PageHash extends u32 {}

/** @name PageId */
export interface PageId extends u16 {}

/** @name PageNonce */
export interface PageNonce extends u16 {}

/** @name PaginatedStorageResponse */
export interface PaginatedStorageResponse extends Struct {
  readonly page_id: PageId;
  readonly msa_id: MessageSourceId;
  readonly schema_id: SchemaId;
  readonly content_hash: PageHash;
  readonly nonce: PageNonce;
  readonly payload: Bytes;
}
