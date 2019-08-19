// Copyright 2019 The Bytecoin developers.
// Licensed under the GNU Affero General Public License, version 3.

import React, {useContext, useState} from 'react';
import styles from './css/ReceiveForm.module.css';
import * as util from './lib/util';
import * as sync from './lib/sync';
import Avatar from './Avatar';

const ReceiveForm = React.memo((props: {
  viewOnly: boolean,
  addresses: sync.IAddress[],
  setAddresses: (addresses: sync.IAddress[]) => void,
  dismiss: () => void,
}) => {
  const wallet = useContext(util.WalletContext);

  const [creatingAddress, setCreatingAddress] = useState(false);

  const canShare = (navigator as any).share !== undefined;
  const share = (addr: string) => {
    (navigator as any).share({
      text: addr,
    });
  };

  const addAddress = async () => {
    setCreatingAddress(true);
    await doAddAddress();
    setCreatingAddress(false);
  };

  const doAddAddress = async () => {
    if (wallet === null) {
      return;
    }

    const [resp, errCreate] = await util.try_(wallet.createAddresses({
      secret_spend_keys: [''],
    }));
    if (resp === undefined) {
      alert(`Failed to create address: ${errCreate}`);
      return;
    }

    props.setAddresses([...props.addresses, {
      address: resp.addresses[0],
      label: '',
    }]);
  };

  return (
    <div className={styles.receiveForm}>
      <div className={styles.addresses}>{
        props.addresses.map((addr) =>
          <div key={addr.address} className={styles.address}>
            <div className={styles.addressIcon} title={addr.address}>
              <Avatar message={addr.address}/>
            </div>
            <div className={styles.addressData}>
              <div className={styles.addressText}>
                {addr.address}
              </div>
            </div>
            { canShare &&
              <div className={styles.share}>
                <button className='link-like' onClick={() => share(addr.address)}>
                  Share
                </button>
              </div>
            }
          </div>
        )
      }</div>

      <div className={styles.controls}>
        <button className={styles.addAddress} onClick={addAddress} disabled={props.viewOnly || creatingAddress}>
          Add address
        </button>

        <button className={styles.cancel} onClick={props.dismiss}>
          Cancel
        </button>
      </div>
    </div>
  );
});

export default ReceiveForm;
