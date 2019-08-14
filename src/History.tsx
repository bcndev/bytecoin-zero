// Copyright 2019 The Bytecoin developers.
// Licensed under the GNU Affero General Public License, version 3.

import React, {useState, useContext, useEffect} from 'react';
import {CSSTransition, TransitionGroup} from 'react-transition-group';
import {flatMap} from 'lodash';
import * as sync from './lib/sync';
import * as util from './lib/util';
import Avatar from './Avatar';
import {ReactComponent as ArrowNE} from './img/Arrow_northeast.svg';
import {ReactComponent as ArrowSE} from './img/Arrow_southeast.svg';
import {ReactComponent as ArrowSW} from './img/Arrow_southwest.svg';
import styles from './css/History.module.css';
import {formatDateTime, formatTime} from './lib/util';

const History = React.memo((props: {history: sync.IDay[]}) => {
  const {history} = props;

  return (
    <div className={styles.history}>
      <TransitionGroup component={null}>
        {history.map((day) =>
          <CSSTransition key={day.date.valueOf()} timeout={1000} classNames='history-day'>
            <Day {...day} />
          </CSSTransition>
        )}
      </TransitionGroup>
    </div>
  );
});

const Day = React.memo((props: sync.IDay) => {
  return (
    <div className={styles.historyDay}>
      <div className={styles.historyDayHeader}>
        <div className={styles.historyDayDate}>
          {util.formatDate(props.date)}
        </div>
      </div>

      <div className={styles.historyDayRows}>
        <TransitionGroup component={null} appear={true}>
        {
          flatMap(props.blocks, (block) => {
            const txs = block.transactions.map((transaction) =>
              <CSSTransition key={transaction.hash} timeout={1000} classNames='history-row'>
                <Transaction {...transaction} confirmed={block.header.confirmed}/>
              </CSSTransition>
            );

            const transfers = block.unlockedTransfers.map((transfer) =>
              <CSSTransition key={`${transfer.amount}#${transfer.address}@${transfer.transactionHash}`} timeout={1000} classNames='history-row'>
                <div className={styles.unlockedTransferContainer}>
                  <Transfer {...transfer} isUnlock={true}/>
                </div>
              </CSSTransition>
            );

            return [...txs, ...transfers];
          })
        }
        </TransitionGroup>
      </div>
    </div>
  );
});

const Transaction = React.memo((props: sync.ITransaction & {confirmed: boolean}) => {
  const [expanded, setExpanded] = useState(false);
  const [detailsAnimating, setDetailsAnimating] = useState(false);

  const kindClass = sync.TxKind[props.kind];

  return (
    <div className={`${styles.tx} ${kindClass}`}>
      <div className={`${styles.txBody} ${expanded ? 'expanded' : ''} ${detailsAnimating ? 'details-animating' : ''} ${props.confirmed ? 'confirmed' : 'unconfirmed'}`} onClick={() => setExpanded(!expanded)}>
        {
          props.summary.map((t) =>
            <Transfer key={t.address} {...t} unconfirmed={!props.confirmed}/>
          )
        }
      </div>

      <CSSTransition in={expanded} unmountOnExit={true} timeout={300} classNames='history-tx-details' onExit={() => setDetailsAnimating(true)} onExited={() => setDetailsAnimating(false)}>
        <div className={styles.txDetails}>
          <div className={styles.txMetadata}>
            <span className={styles.txBlockTime}>
              {formatTime(props.time)}
            </span>
            <a className={styles.txHash} href={`https://explorer.bytecoin.org/tx?hash=${props.hash}`} title={props.hash} target='_blank' rel='noreferrer noopener'>
              {props.hash}
            </a>
            <span className={styles.txFee}>
              Fee {util.formatBCN(props.fee, 3)}
            </span>
          </div>
          {
            props.transfers.spend.map((t) =>
              <Transfer key={`spend-${t.address}`} detailed={true} {...t}/>
            )
          }
          {
            props.transfers.send.map((t) =>
              <Transfer key={`send-${t.address}`} detailed={true} genSendproof={true} {...t}/>
            )
          }
          {
            props.transfers.receive.map((t) =>
              <Transfer key={`receive-${t.address}`} detailed={true} {...t}/>
            )
          }
          {
            props.transfers.change.map((t) =>
              <Transfer key={`change-${t.address}`} detailed={true} {...t}/>
            )
          }
        </div>
      </CSSTransition>
    </div>
  );
});

const Transfer = React.memo((props: sync.ITransfer & {unconfirmed?: boolean, genSendproof?: boolean, detailed?: boolean, isUnlock?: boolean}) => {
  const isSpend = props.kind === sync.TransferKind.Spend;
  const isSend = props.kind === sync.TransferKind.Send;
  const isReceive = props.kind === sync.TransferKind.Receive;

  const lockedUntil = props.unlockBlockOrTimestamp > 0 ?
    props.unlockBlockOrTimestamp > sync.MAX_BLOCK_NUMBER ?
      `Locked until ${formatDateTime(new Date(props.unlockBlockOrTimestamp * 1000))}` :
      `Locked until block #${props.unlockBlockOrTimestamp}` : '';

  const [sendproof, setSendproof] = useState('');
  const wallet = useContext(util.WalletContext);

  let help = props.isUnlock ? 'Unlocked transfer' : isReceive ? 'Received to' : isSend ? 'Sent to' : isSpend ? 'Sent from' : 'Change';
  if (props.locked) {
    help += ' (locked)'
  }

  const amountClass = props.isUnlock ? `Unlocked` : props.locked ? 'Locked' : '';

  useEffect(() => {
    if (!props.genSendproof || !wallet) {
      return;
    }

    wallet.createSendproof({
      transaction_hash: props.transactionHash,
      address: props.address,
    }).then((req) => {
      setSendproof(req.sendproof)
    });
  }, [wallet, props.genSendproof, props.transactionHash, props.address]);

  return (
    <div className={styles.transfer}>
      <div className={styles.transferLeft}>
        <div className={styles.transferKind}>
          {isReceive ? <ArrowSE/> : isSend ? <ArrowNE/> : isSpend ? <ArrowSW/> : <ArrowSE/>}
        </div>
        <div className={styles.transferDetails}>
          <div className={styles.transferIcon}>
            <AddressIcon address={props.address}/>
          </div>
          <div className={styles.transferDescription}>
            <div className={styles.transferHelp}>
              {help}
            </div>
            <div className={styles.transferAddress}>
              {props.ours && <span className={styles.transferAddressOurs} role='img' aria-label='wallet address'>&#128091;</span>} {props.address}
            </div>

            <div className={styles.transferMessage}>
              {props.message && <q>{props.message}</q>}
            </div>
          </div>
        </div>
      </div>
      <div className={styles.transferRight}>
        {
          props.detailed && props.locked &&
            <div className={styles.transferUnlockTime}>
              {lockedUntil}
            </div>
        }
        <div className={`${styles.transferAmount} ${amountClass}`}>
          {util.formatBCNDelta(props.amount, props.detailed ? 3 : 2, props.ours)}
          {props.locked && <span className={styles.transferAmountLocked}>&#128274;</span>}
          {props.isUnlock && <span className={styles.transferAmountUnlocked}>&#128275;</span>}
          {props.unconfirmed && <span className={styles.transferUnconfirmed}>&#9203;</span>}
        </div>
        {
          sendproof &&
          <div className={styles.transferSendproof}>
            <a href={`https://explorer.bytecoin.org/search?search=${sendproof}`} title='See sendproof in Bytecoin Explorer' target='_blank' rel='noreferrer noopener'>
              Sendproof
            </a>
          </div>
        }
      </div>
    </div>
  );
});

const AddressIcon = React.memo((props: {address: string}) => {
  return (
    <div className={styles.addressIcon} title={props.address}>
      <Avatar message={props.address}/>
    </div>
  );
});

export default History;
