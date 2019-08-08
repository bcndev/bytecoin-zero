// Copyright 2019 The Bytecoin developers.
// Licensed under the GNU Affero General Public License, version 3.

import React, {useContext, useState} from 'react';
import {checkAddress} from '@bcndev/bytecoin';
import styles from './css/SendForm.module.css';
import * as util from './lib/util';
import * as loop from './lib/loop';

// TODO: messages
// TODO: multiple recipients
// TODO: custom fee
const SendForm = React.memo((props: {dismiss: () => void}) => {
  const wallet = useContext(util.WalletContext);

  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState(0);
  const [addressValid, setAddressValid] = useState(false);
  const [amountValid, setAmountValid] = useState(false);
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    await doSend();
    setSending(false);
  };

  const doSend = async () => {
    // TODO derive username from wallet
    const ok = await util.bioApprove('Bytecoin Zero', 'bytecoin-zero-user', 'Bytecoin Zero User');
    if (!ok || !wallet) {
      return;
    }

    const [txResp, errCreate] = await util.try_(wallet.createTransaction({
      transaction: {
        transfers: [{
          address,
          amount,
        }],
      },
      any_spend_address: true,
      change_address: '',
      confirmed_height_or_depth: loop.CONFIRMED_DEPTH,
    }));
    if (txResp === undefined) {
      alert(`Failed to create transaction: ${errCreate}`);
      return;
    }

    const [sendResp, errSend] = await util.try_(wallet.sendTransaction({
      binary_transaction: txResp.binary_transaction,
    }));
    if (sendResp === undefined) {
      alert(`Failed to send transaction: ${errSend}`);
      return;
    }

    props.dismiss();
  };

  return (
    <div className={styles.sendForm}>
      <div className={styles.transfer}>
        <div className={styles.addressGroup}>
          <label htmlFor='toAddress'>Address</label>
          <input className={`${addressValid ? 'valid' : 'invalid'}`}
                 type='text'
                 placeholder='bcnZ… or 2…'
                 id='toAddress'
                 onChange={(e) => {
                   const addr = e.target.value;
                   const ok = checkAddress(addr);
                   setAddressValid(ok);
                   if (ok) {
                     setAddress(addr);
                   }
                 }}
          />
        </div>
        <div className={styles.amountGroup}>
          <label htmlFor='toAmount'>Amount</label>
          <input className={`${amountValid ? 'valid' : 'invalid'}`}
                 type='number'
                 placeholder='0'
                 id='toAmount'
                 min='0.01'
                 step='0.01'
                 onChange={(e) => {
                   const am = Math.round(parseFloat(e.target.value) * 1e8); // TODO: exact calculation
                   const ok = am > 0; // TODO: check upper bound
                   setAmountValid(ok);
                   if (ok) {
                     setAmount(am);
                   }
                 }}
          />
        </div>
      </div>
      <div className={styles.controls}>
        <button className={styles.cancelButton} onClick={props.dismiss}>
          Cancel
        </button>
        <button className={styles.sendButton} onClick={send} disabled={sending || !addressValid || !amountValid}>
          Send
        </button>
      </div>
    </div>
  );
});

export default SendForm;
