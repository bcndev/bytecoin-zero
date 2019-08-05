Module = {};
Module['noExitRuntime'] = true;

importScripts('mainworker.js');

(function() {
let db;
let db_initialized = false;

// Message passing
let messageBuffer = null;

function flushMessages()
{
    if (!messageBuffer)
        return;
    if (runtimeInitialized && db_initialized) {
        let temp = messageBuffer;
        messageBuffer = null;
        temp.forEach(function(message) {
            onmessage(message);
        });
    }
}

function messageResender()
{
    flushMessages();
    if (messageBuffer) {
        setTimeout(messageResender, 100); // still more to do
    }
}

// Data transfer to Wasm
let wasm_transfer_buffer;
let wasm_transfer_buffer_size = 0;
let set_wasm_transfer_buffer = function(data) {
    if (!data.byteLength) {
        console.log('Main Worker strange');
        data = new Uint8Array(data);
    }
    if (!wasm_transfer_buffer || wasm_transfer_buffer_size < data.length) {
        if (wasm_transfer_buffer)
            _free(wasm_transfer_buffer);
        wasm_transfer_buffer = null;
        wasm_transfer_buffer = _malloc(data.length);
        wasm_transfer_buffer_size = data.length;
    }
    HEAPU8.set(data, wasm_transfer_buffer);
}

let pass_worker_reply
    = function(msg) {
          let data = msg.data.data;
          let func = Module[msg.data.func];
          set_wasm_transfer_buffer(data);
          func(wasm_transfer_buffer, data.length);
      };

let walletworkerList = null;
if (self.Worker) {
    walletworkerList = [];
    let cores = 1;
    if (navigator.hardwareConcurrency)
        cores = navigator.hardwareConcurrency;
    console.log('navigator.hardwareConcurrency=', navigator.hardwareConcurrency);

    for (let i = 0; i < cores; i++) {
        let w = new Worker('walletworker_plus.js');
        w.onmessage = function wallet_worker_onmessage(msg) {
            if (msg.data.func === 'on_block_prepared' || msg.data.func === 'on_transaction_prepared') {
                let worker_id = msg.data.worker_id;
                let work_amount = msg.data.work_amount;
                walletworkerList[worker_id].work_amount -= work_amount;
                pass_worker_reply(msg);
            } else
                throw 'Unknown function will not be called in worker context ';
        };
        walletworkerList.push({ worker : w, work_amount : 0 });
    }
} else {
    console.log('Worker in Worker NOT supported (Safari is a new IE?)');
    // We will pass prepare* messages up to zero_plus.js
    // which will create its own set of workers, pass messages to them, then
    // respond to us
}

let worker_http_request_respond_fun = function(handle, status, body) {
    let transferObject = {
        'handle' : handle,
        'status' : status,
        'body' : body,
        'func' : 'worker_http_request'
    };
    postMessage(transferObject);
};

let find_least_busy_worker_id = function() {
    let worker_id = 0;
    let work_amount = walletworkerList[worker_id].work_amount;
    for (let i = 1; i < walletworkerList.length; i++) {
        if (walletworkerList[i].work_amount < work_amount) {
            work_amount = walletworkerList[i].work_amount;
            worker_id = i;
        }
    }
    return worker_id;
};

// Async File Ops, C++ counterpart in platform/IndexDB*
let db_init_req = indexedDB.open('Files', 1);
db_init_req.onupgradeneeded = function(e) {
    let db = e.target.result;
    objectStore = db.createObjectStore('Files');
    console.log('Successfully upgraded db');
};
db_init_req.onsuccess = function(e) {
    console.log('Success opening db');
    db = db_init_req.result;
    db_initialized = true;
};
db_init_req.onerror = function(e) {
    console.log('Error opening db');
    db_initialized = true;
};

let file_ops = new Map();
let next_file_op = 0;
let cn_file_op = function(me, cb, verb, filename, data, size) {
    next_file_op += 1;
    file_ops.set(next_file_op, { 'me' : me, 'cb' : getFuncWrapper(cb, 'viiiii') });
    let jverb = UTF8ToString(verb);
    let jfilename = UTF8ToString(filename);
    //     console.log('cn_file_op', jverb, jfilename);
    if (jverb == 'open') {
        let my_file_op = next_file_op; // for capture below
        if (!db) {
            setTimeout(function() { // We must not call cb immediately
                let ha = file_ops.get(my_file_op);
                if (ha === undefined)
                    return;
                file_ops.delete(my_file_op);
                ha.cb(my_file_op, ha.me, 0, 0, allocateUTF8OnStack('Error opening DB'));
            }, 0);
        } else {
            let request = db.transaction([ 'Files' ]).objectStore('Files').get(jfilename)
            request.onsuccess = function(event) {
                let result = request.result;
                //         console.log("Success opening db", result);
                let ha = file_ops.get(my_file_op);
                if (ha === undefined)
                    return;
                file_ops.delete(my_file_op);
                if (result == undefined) {
                    ha.cb(my_file_op, ha.me, 0, 0, 0);
                } else {
                    set_wasm_transfer_buffer(result);
                    ha.cb(my_file_op, ha.me, wasm_transfer_buffer, result.length, 0);
                }
            };
            request.onerror = function(event) {
                console.log('Error opening db', event);
                let ha = file_ops.get(my_file_op);
                if (ha === undefined)
                    return;
                file_ops.delete(my_file_op);
                ha.cb(my_file_op, ha.me, 0, 0, allocateUTF8OnStack('Error opening DB'));
            };
        }
    } else if (jverb == 'save') {
        let my_file_op = next_file_op; // for capture below
        if (!db) {
            setTimeout(function() { // We must not call cb immediately
                let ha = file_ops.get(my_file_op);
                if (ha === undefined)
                    return;
                file_ops.delete(my_file_op);
                ha.cb(my_file_op, ha.me, 0, 0, 0);
            }, 0);
        } else {
            let jdata = new Uint8Array(HEAPU8.subarray((data), (data + size)))
            let request = db.transaction([ 'Files' ], 'readwrite')
                              .objectStore('Files')
                              .put(jdata, jfilename);
            request.onsuccess = function(event) {
                //         console.log("Success saving db");
                let ha = file_ops.get(my_file_op);
                if (ha === undefined)
                    return;
                file_ops.delete(my_file_op);
                ha.cb(my_file_op, ha.me, 0, 0, 0);
            };
            request.onerror = function(event) {
                console.log('Error saving db', event);
                let ha = file_ops.get(my_file_op);
                if (ha === undefined)
                    return;
                file_ops.delete(my_file_op);
                ha.cb(my_file_op, ha.me, 0, 0, allocateUTF8OnStack('Error saving DB'));
            };
        }
    } else
        throw 'cn_file_op unknown verb ' + jverb;
    //     console.log('cn_file_op return', next_file_op);
    return next_file_op;
};
let cn_file_cancel = function(fetch) {
    file_ops.delete(fetch);
};
Module.cn_file_op = cn_file_op;
Module.cn_file_cancel = cn_file_cancel;
// Async fetch, C++ counterpart in http/Agent*
let fetches = new Map();
let next_fetch = 0;
let cn_fetch = function(
    me, cb, method, uri, timeout_msec, user, pass, headers, data, size) {
    next_fetch += 1;
    let jcb = getFuncWrapper(cb, 'viiiiii');
    let jmethod = UTF8ToString(method);
    let juri = UTF8ToString(uri);
    let juser = user ? UTF8ToString(user) : undefined;
    let jpass = pass ? UTF8ToString(pass) : undefined;
    //     console.log("cn_fetch", jmethod, juri, timeout_msec, juser, jpass);
    let xhr = new XMLHttpRequest();
    xhr.open(jmethod, juri, true, juser, jpass);
    xhr.timeout = timeout_msec; // XHR timeout field is only accessible in async XHRs, and
        // must be set after .open() but before .send().
    xhr.responseType = 'arraybuffer';
    //     xhr.overrideMimeType();
    if (headers) {
        for (;;) {
            let key = HEAPU32[headers >> 2];
            if (!key)
                break;
            let value = HEAPU32[(headers + 4) >> 2];
            if (!value)
                break;
            headers += 8;
            let keyStr = UTF8ToString(key);
            let valueStr = UTF8ToString(value);
            //         console.log("cn_fetch header", keyStr, valueStr);
            xhr.setRequestHeader(keyStr, valueStr);
        }
    }
    let jdata = data ? new Uint8Array(HEAPU8.subarray((data), (data + size))) : undefined;
    let my_fetch = next_fetch; // for capture below
    xhr.onreadystatechange = function() {
        //       console.log("onreadystatechange", xhr.readyState);
        if (xhr.readyState != 4)
            return;
        let ha = fetches.get(my_fetch);
        if (ha === undefined)
            return;
        fetches.delete(my_fetch);
        let data = new Uint8Array(xhr.response);
        //       console.log("onreadystatechange success", data.length);
        set_wasm_transfer_buffer(data);
        ha.cb(
            my_fetch, ha.me, xhr.status,
            allocateUTF8OnStack(xhr.statusText.substring(0, 256)),
            wasm_transfer_buffer, data.length);
    };
    fetches.set(my_fetch, { 'me' : me, 'cb' : jcb, 'xhr' : xhr });
    try {
        xhr.send(jdata);
    } catch (e) {
        console.log('fetch exception', e.message, e);
        setTimeout(function() { // We must not call cb immediately
            let ha = fetches.get(my_fetch);
            if (ha === undefined)
                return;
            fetches.delete(my_fetch);
            ha.cb(
                my_fetch, ha.me, allocateUTF8OnStack('fetch exception ' + e.message),
                0, 0);
        }, 0);
        //       jcb(my_fetch, me, 0, 0, 0, 0);
    }
    return next_fetch;
};
let cn_fetch_cancel = function(fetch) {
    let ha = fetches.get(fetch);
    if (ha === undefined)
        return;
    fetches.delete(fetch);
    ha.xhr.abort();
};
Module.cn_fetch = cn_fetch;
Module.cn_fetch_cancel = cn_fetch_cancel;

let worker_block_prepare = function(work_amount, data, size) {
    let transferObject = {
        'func' : 'worker_block_prepare',
        'work_amount' : work_amount,
        'data' : new Uint8Array(HEAPU8.subarray((data), (data + size)))
    };
    if (walletworkerList) {
        let worker_id = find_least_busy_worker_id();
        transferObject.worker_id = worker_id;
        walletworkerList[worker_id].work_amount += work_amount;
        walletworkerList[worker_id].worker.postMessage(
            transferObject, [ transferObject.data.buffer ]);
    } else {
        postMessage(transferObject, [ transferObject.data.buffer ]);
    }
    let twoMB = new ArrayBuffer(88608); // trigger GC on some browsers
};
Module.worker_block_prepare = worker_block_prepare;
let worker_transaction_prepare = function(work_amount, data, size) {
    let transferObject = {
        'func' : 'worker_transaction_prepare',
        'work_amount' : work_amount,
        'data' : new Uint8Array(HEAPU8.subarray((data), (data + size)))
    };
    if (walletworkerList) {
        let worker_id = find_least_busy_worker_id();
        transferObject.worker_id = worker_id;
        walletworkerList[worker_id].work_amount += work_amount;
        walletworkerList[worker_id].worker.postMessage(
            transferObject, [ transferObject.data.buffer ]);
    } else {
        postMessage(transferObject, [ transferObject.data.buffer ]);
    }
    let twoMB = new ArrayBuffer(88608); // trigger GC on some browsers
};
Module.worker_transaction_prepare = worker_transaction_prepare;

onmessage = function onmessage(msg) {
    // if main has not yet been called (mem init file, other async things), buffer
    // messages
    if (!runtimeInitialized || !db_initialized) {
        if (!messageBuffer) {
            messageBuffer = [];
            setTimeout(messageResender, 100);
        }
        messageBuffer.push(msg);
        return;
    }
    flushMessages();

    let func = Module[msg.data.func];
    if (!func)
        throw 'invalid worker function to call: ' + msg.data.func;

    if (msg.data.func === 'on_block_prepared' || msg.data.func === 'on_transaction_prepared') {
        pass_worker_reply(msg);
    } else if (msg.data.func === 'walletd_start') {
        let argv = msg.data.argv;
        let arg0 = argv.length > 0 ? argv[0] : '';
        let arg1 = argv.length > 1 ? argv[1] : '';
        let arg2 = argv.length > 2 ? argv[2] : '';
        let arg3 = argv.length > 3 ? argv[3] : '';
        let arg4 = argv.length > 4 ? argv[4] : '';
        //         console.log('walletd_start', arg0, arg1, arg2, arg3, arg4);
        func(arg0, arg1, arg2, arg3, arg4);
    } else if (msg.data.func === 'worker_http_request') {
        let handle = msg.data.handle;
        let method = msg.data.method;
        let uri = msg.data.uri;
        let body = msg.data.body;
        func(worker_http_request_respond_fun, handle, method, uri, body);
    } else
        throw 'Unknown function will not be called in worker context';
}
})();
