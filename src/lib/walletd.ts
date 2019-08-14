// Copyright 2019 The Bytecoin developers.
// Licensed under the GNU Affero General Public License, version 3.

type ModuleHTTPHandle = number;

declare function cn_walletd_start(argv: string[]): void;
declare function cn_http_server_call(method: string, path: string, body: string, callback: (status: number, body: string) => void): ModuleHTTPHandle;
declare function cn_http_server_cancel(handle: ModuleHTTPHandle): void;

interface IWalletCreateReq {
  mnemonic: string;
  creation_timestamp: number;
}

interface IWalletCreateResp {
  readonly wallet_file: string;
}

export class Walletd {
  private n: number = 0;
  private closed = false;

  private constructor(bytecoindAddr: string) {
    cn_walletd_start([`--bytecoind-remote-address=${bytecoindAddr}`]);
  }

  static async create(bytecoindAddr: string, description: string, timestamp: number): Promise<Walletd> {
    console.info('opening wallet:', new Date(timestamp * 1000));

    const w = new Walletd(bytecoindAddr);

    const resp = await w.createWallet({
      mnemonic: description,
      creation_timestamp: timestamp,
    });

    console.log('opened wallet, filename:', resp.wallet_file);

    return w;
  }

  async close(): Promise<void> {
    if (!this.closed) {
      this.closed = true;
      return this.closeWallet();
    }
  }

  private createWallet(req: IWalletCreateReq): Promise<IWalletCreateResp> {
    return this.rpc('ext_create_wallet', req);
  }

  private closeWallet(): Promise<void> {
    return this.rpc('ext_close_wallet', {});
  }

  getStatus(req: IGetStatusReq): Promise<IGetStatusResp> {
    return this.rpc('get_status', req);
  }

  getBalance(req: IGetBalanceReq): Promise<IGetBalanceResp> {
    return this.rpc('get_balance', req);
  }

  getWalletRecords(req: IGetWalletRecordsReq): Promise<IGetWalletRecordsResp> {
    return this.rpc('get_wallet_records', req);
  }

  getTransfers(req: IGetTransfersReq): Promise<IGetTransfersResp> {
    return this.rpc('get_transfers', req);
  }

  createAddresses(req: ICreateAddressesReq): Promise<ICreateAddressesResp> {
    return this.rpc('create_addresses', req);
  }

  createSendproof(req: ICreateSendproofReq): Promise<ICreateSendproofResp> {
    return this.rpc('create_sendproof', req);
  }

  createTransaction(req: ICreateTransactionReq): Promise<ICreateTransactionResp> {
    return this.rpc('create_transaction', req);
  }

  sendTransaction(req: ISendTransactionReq): Promise<ISendTransactionResp> {
    return this.rpc('send_transaction', req);
  }

  private rpc<TReq, TResp>(method: string, params: TReq): Promise<TResp> {
    return new Promise((resolve, reject) => {
      const json = {
        jsonrpc: '2.0',
        id: '0',
        method: method,
        params: params,
      };

      const label = `RPC ${method} #${this.n}`;
      this.n++;

      console.time(label);
      Walletd.postJSON(method, '/json_rpc', json, (resp) => {
        console.timeEnd(label);

        if (resp.hasOwnProperty('error')) {
          const msg = `[${method}] JSON-RPC error #${resp.error.code}: ${resp.error.message}`;
          console.warn(msg);
          reject(new Error(msg));
        } else {
          resolve(resp.result)
        }
      }, reject);
    });
  }

  private static postJSON(id: string, path: string, json: any, resolve: (value: any) => void, reject: (error: any) => void) {
    const params = JSON.stringify(json);
    const handle = cn_http_server_call('POST', path, params, (status: number, body: string) => {
      if (status === 200) {
        try {
          const result = JSON.parse(body);
          resolve(result);
        } catch (err) {
          console.warn(`[${id}] JSON reply parsing failed`, err);
          reject(err);
        }
      } else {
        const msg = `[${id}] HTTP status ${status}`;
        console.warn(msg);
        reject(new Error(msg));
      }
    });

    return () => {
      cn_http_server_cancel(handle);
    };
  }
}

export interface ITransfer {
  readonly address: string;
  readonly amount: number;
  readonly message?: string;
  readonly unlock_block_or_timestamp?: number;
  readonly ours?: boolean;
  readonly locked?: boolean;
  readonly transaction_hash?: string;
}

export interface INewTransaction {
  readonly unlock_block_or_timestamp?: number;
  readonly transfers?: ITransfer[];
  readonly payment_id?: string;
  readonly anonymity?: number;
}

export interface ICreatedTransaction extends INewTransaction {
  readonly hash: string;
  readonly fee: number;
  readonly public_key: string;
  readonly extra: string;
  readonly coinbase: boolean;
  readonly amount: number;
}

export interface IBlockTransaction extends ICreatedTransaction {
  readonly block_height: number;
  readonly block_hash: string;
  readonly timestamp: number;
  readonly size?: number;
}

export interface IBlockHeader {
  readonly major_version: number;
  readonly minor_version: number;
  readonly timestamp: number;
  readonly previous_block_hash: string;
  readonly nonce: number;
  readonly binary_nonce: string;

  readonly height: number;
  readonly hash: string;
  readonly reward: number;
  readonly cumulative_difficulty: number;
  readonly cumulative_difficulty_hi: number;
  readonly difficulty: number;
  readonly base_reward: number;
  readonly block_size: number;
  readonly transactions_size: number;
  readonly already_generated_key_outputs: number;
  readonly already_generated_coins: number;
  readonly already_generated_transactions: number;
  readonly size_median: number;
  readonly effective_size_median: number;
  readonly timestamp_median: number;
  readonly block_capacity_vote: number;
  readonly block_capacity_vote_median: number;
  readonly transactions_fee: number;
}

export interface IBlock {
  readonly header: IBlockHeader;
  readonly transactions?: IBlockTransaction[];
  readonly unlocked_transfers?: ITransfer[];
}

export interface IBalance {
  readonly spendable: number;
  readonly spendable_dust: number;
  readonly locked_or_unconfirmed: number;
  readonly spendable_outputs: number;
  readonly spendable_dust_outputs: number;
  readonly locked_or_unconfirmed_outputs: number;
}

export interface IGetStatusReq {
  top_block_hash?: string;
  transaction_pool_version?: number;
  incoming_peer_count?: number;
  outgoing_peer_count?: number;
  lower_level_error?: string;
}

export interface IGetStatusResp {
  readonly top_block_hash: string;
  readonly top_block_difficulty: number;
  readonly top_block_cumulative_difficulty: number;
  readonly top_block_height: number;
  readonly top_block_timestamp: number;
  readonly top_block_timestamp_median: number;
  readonly top_known_block_height: number;
  readonly transaction_pool_version: number;
  readonly incoming_peer_count: number;
  readonly outgoing_peer_count: number;
  readonly lower_level_error: string;
  readonly next_block_effective_median_size: number;
  readonly recommended_fee_per_byte: number;
  readonly recommended_max_transaction_size: number;
}

export interface IGetBalanceReq {
  address?: string;
  height_or_depth?: number;
}

export interface IGetBalanceResp extends IBalance {
}

export interface IWalletRecord {
  readonly address: string;
  readonly label: string;
  readonly index: number;
  readonly public_spend_key: string;
  readonly secret_spend_key?: string;
}

export interface IGetWalletRecordsReq {
  need_secrets?: boolean;
  create?: boolean;
  index?: number;
  count?: number;
}

export interface IGetWalletRecordsResp {
  readonly records: IWalletRecord[];
  readonly total_count: number;
}

export interface IGetTransfersReq {
  address?: string;
  from_height: number;
  to_height: number;
  forward: boolean;
  desired_transaction_count: number;
}

export interface IGetTransfersResp {
  readonly blocks?: IBlock[];
  readonly next_from_height: number;
  readonly next_to_height: number;
}

export interface ICreateAddressesReq {
  secret_spend_keys: string[];
  creation_timestamp?: number;
}

export interface ICreateAddressesResp {
  readonly addresses: string[];
  readonly secret_spend_keys: string[];
}

export interface ICreateSendproofReq {
  transaction_hash: string;
  address: string;
  message?: string;
}

export interface ICreateSendproofResp {
  readonly sendproof: string;
}

export interface ICreateTransactionReq {
  transaction: INewTransaction;
  spend_addresses?: string[];
  any_spend_address: boolean;
  change_address: string;
  confirmed_height_or_depth: number;
  fee_per_byte?: number;
  optimization?: string;
  subtract_fee_from_amount?: boolean;
}

export interface ICreateTransactionResp {
  readonly transaction: ICreatedTransaction;
  readonly binary_transaction: string;
}

export interface ISendTransactionReq {
  binary_transaction: string;
}

export interface ISendTransactionResp {
}
