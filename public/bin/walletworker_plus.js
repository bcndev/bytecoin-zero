Module = {};
Module['noExitRuntime'] = true;

importScripts("walletworker.js");

(function() {
// Message passing
var messageBuffer = null;

function flushMessages()
{
    if (!messageBuffer)
        return;
    if (runtimeInitialized) {
        var temp = messageBuffer;
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
var wasm_transfer_buffer;
var wasm_transfer_buffer_size = 0;
var set_wasm_transfer_buffer = function(data) {
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

let block_respond_fun
    = function(worker_id, work_amount, data, size) {
          var transferObject = {
              'func' : "on_block_prepared",
              'worker_id' : worker_id,
              'work_amount' : work_amount,
              'data' : new Uint8Array(HEAPU8.subarray((data), (data + size)))
          };
          // 		  console.log("block_respond_fun");
          postMessage(transferObject, [ transferObject.data.buffer ]);
          var twoMB = new ArrayBuffer(88608); // trigger GC on some browsers
      };
let transaction_respond_fun = function(worker_id, work_amount, data, size) {
    var transferObject = {
        'func' : "on_transaction_prepared",
        'worker_id' : worker_id,
        'work_amount' : work_amount,
        'data' : new Uint8Array(HEAPU8.subarray((data), (data + size)))
    };
    // 		  console.log("transaction_respond_fun");
    postMessage(transferObject, [ transferObject.data.buffer ]);
    var twoMB = new ArrayBuffer(88608); // trigger GC on some browsers
};

onmessage = function onmessage(msg) {
    // if main has not yet been called (mem init file, other async things), buffer messages
    if (!runtimeInitialized) {
        if (!messageBuffer) {
            messageBuffer = [];
            setTimeout(messageResender, 100);
        }
        messageBuffer.push(msg);
        return;
    }
    flushMessages();

    //   console.log("walletworker.onmessage", msg.data.func);
    let func = Module[msg.data.func];
    if (!func)
        throw 'invalid worker function to call: ' + msg.data.func;
    let data = msg.data.data;
    set_wasm_transfer_buffer(data);

    if (msg.data.func == "worker_block_prepare") {
        let work_amount = msg.data.work_amount;
        let worker_id = msg.data.worker_id;
        func(block_respond_fun, worker_id, work_amount, wasm_transfer_buffer, data.length);
    } else if (msg.data.func == "worker_transaction_prepare") {
        let work_amount = msg.data.work_amount;
        let worker_id = msg.data.worker_id;
        func(transaction_respond_fun, worker_id, work_amount, wasm_transfer_buffer, data.length);
    } else
        throw "Unknown function will not be called in worker context"
}
})();
