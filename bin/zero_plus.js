// Module = {};
// Module['noExitRuntime'] = true;

let mainworker = new Worker("bin/mainworker_plus.js");

let walletworkerList = null;
let createwalletworkerList = function() {
    if (walletworkerList)
        return;
    walletworkerList = [];
    let cores = 4;
    if (navigator.hardwareConcurrency)
        cores = navigator.hardwareConcurrency;
    console.log("navigator.hardwareConcurrency=", navigator.hardwareConcurrency);
    for (let i = 0; i < cores; i++) {
        let w = new Worker('bin/walletworker_plus.js');
        w.onmessage = function wallet_worker_onmessage(msg) {
            //  	  	console.log("wallet_worker_onmessage", msg.data.func);
            if (msg.data.func === "on_block_prepared" || msg.data.func === "on_transaction_prepared") {
                let worker_id = msg.data.worker_id;
                let work_amount = msg.data.work_amount;
                walletworkerList[worker_id].work_amount -= work_amount;
                let transferObject = msg.data;
                mainworker.postMessage(transferObject, [ transferObject.data.buffer ]);
            } else
                throw "Unknown function will not be called in worker context ";
        };
        walletworkerList.push({ worker : w, work_amount : 0 });
    }
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

let http_server_calls = new Map();
let last_call_handle = 0;

let cn_walletd_start = function(argv) { // restarting walletd cancels all outstanding http requests
    let transferObject = {
        'func' : "walletd_start",
        'argv' : argv
    };
    if (argv.length > 5)
        throw "Only up to 5 parameters supported (sorry, emscripten is a mess)";
    mainworker.postMessage(transferObject);
    // We cancel after postMessage so that new calls will be in queue after "walletd_start"
    let prev = http_server_calls;
    http_server_calls = new Map();
    prev.forEach(function(value, key, map) {
        value(555, "Walletd Restarted");
    });
};

let cn_http_server_call = function(method, uri, body, cb) { // (string, string, string, function(int, string))
    last_call_handle += 1;
    http_server_calls.set(last_call_handle, cb);
    let transferObject = {
        'func' : "worker_http_request",
        'handle' : last_call_handle,
        'method' : method,
        'uri' : uri,
        'body' : body
    };
    mainworker.postMessage(transferObject);
    return { "handle" : last_call_handle, "cancel" : function() {
                http_server_calls.delete(this.handle);
            } };
};

mainworker.onmessage = function info_worker_onmessage(msg) {
    if (msg.data.func === "worker_block_prepare" || msg.data.func === "worker_transaction_prepare") {
        createwalletworkerList(); // Create workers on first message
        let worker_id = find_least_busy_worker_id();
        let work_amount = msg.data.work_amount;
        let transferObject = msg.data;
        transferObject.worker_id = worker_id;
        walletworkerList[worker_id].work_amount += work_amount;
        walletworkerList[worker_id].worker.postMessage(transferObject, [ transferObject.data.buffer ]);
    } else if (msg.data.func === "worker_http_request") {
        let handle = msg.data.handle;
        let status = msg.data.status;
        let body = msg.data.body;
        let ha = http_server_calls.get(handle);
        if (ha === undefined)
            return;
        http_server_calls.delete(handle);
        ha(status, body);
    }
};
