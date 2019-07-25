// Copyright 2019 The Bytecoin developers.
// Licensed under the GNU Affero General Public License, version 3.

import React from 'react';
import styles from './css/ReceiveForm.module.css';
import * as loop from './lib/loop';
import Avatar from './Avatar';

const ReceiveForm = React.memo((props: {addresses: loop.IAddress[], cancel: () => void}) => {
  return (
    <div className={styles.receiveForm}>
      {
        props.addresses.map((addr) =>
          <div key={addr.address} className={styles.address}>
            <div className={styles.addressIcon} title={addr.address}>
              <Avatar message={addr.address}/>
            </div>
            <div className={styles.addressText}>
              {addr.address}
            </div>
          </div>
        )
      }
    </div>
  );
});

export default ReceiveForm;
