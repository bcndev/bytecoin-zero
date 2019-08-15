// Copyright 2019 The Bytecoin developers.
// Licensed under the GNU Affero General Public License, version 3.

import React, {useEffect, useState} from 'react';
import * as walletd from './lib/walletd';
import * as sync from './lib/sync';
import * as util from './lib/util';
import {Status, Controls} from './Header';
import History from './History';
import styles from './css/Wallet.module.css';

const initialStatus: sync.IStatus = {
  topBlockHeight: 0,
  topBlockTime: new Date(0), // TODO use date just before wallet creation timestamp
  topBlockHash: '',
  topKnownBlockHeight: 0,
  lowerLevelError: '',
};

const initialBalance: sync.IBalance = {
  spendable: 0,
  lockedOrUnconfirmed: 0,
};

const Wallet = React.memo((props: {description: string, isNew: boolean, viewOnly: boolean, onClose: () => void}) => {
  const [wallet, setWallet] = useState<walletd.Walletd | null>(null);
  const [status, setStatus] = useState<sync.IStatus>(initialStatus);
  const [balance, setBalance] = useState<sync.IBalance>(initialBalance);
  const [addresses, setAddresses] = useState<sync.IAddress[]>([]);
  const [history, setHistory] = useState<sync.IDay[]>([]);

  useEffect(() => {
    sync.start(props.description, props.isNew, props.viewOnly, setWallet, setStatus, setBalance, setAddresses, setHistory).then(() => {
      console.info('wallet closed');
      props.onClose();
    });
  }, [props]);

  return (
    <div className={styles.wallet}>
      <util.WalletContext.Provider value={wallet}>
        <Status {...status}/>
        <Controls {...status} {...balance} viewOnly={props.viewOnly} addresses={addresses} setAddresses={setAddresses}/>

        <History history={history}/>
      </util.WalletContext.Provider>
    </div>
  );
});

export default Wallet;
