// Copyright 2019 The Bytecoin developers.
// Licensed under the GNU Affero General Public License, version 3.

import React from 'react';
import styles from './css/ReceiveForm.module.css';
import * as loop from './lib/loop';
import Avatar from './Avatar';

const ReceiveForm = React.memo((props: {addresses: loop.IAddress[], dismiss: () => void}) => {
  const canShare = (navigator as any).share !== undefined;
  const share = (addr: string) => {
    (navigator as any).share({
      text: addr,
    });
  };

  return (
    <div className={styles.receiveForm}>
      {
        props.addresses.map((addr) =>
          <div key={addr.address} className={styles.address}>
            <div className={styles.addressIcon} title={addr.address}>
              <Avatar message={addr.address}/>
            </div>
            <div className={styles.addressData}>
              <div className={styles.addressText}>
                <span className={styles.addressOurs} role='img' aria-label='wallet address'>&#128091;</span> {addr.address}
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
      }
    </div>
  );
});

export default ReceiveForm;
