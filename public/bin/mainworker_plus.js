Module = {};
Module['noExitRuntime'] = true;

var walletworkerList = null;
var walletworker_buffer;
var walletworker_buffer_size = 0;

var pass_worker_reply = function(msg) {
        let data = msg.data.data;
        let func = Module[msg.data.func];
           if (!data.byteLength) data = new Uint8Array(data);
           if (!walletworker_buffer || walletworker_buffer_size < data.length) {
             if (walletworker_buffer) _free(walletworker_buffer);
             walletworker_buffer = null;
             walletworker_buffer = _malloc(data.length);
             walletworker_buffer_size = data.length;
           }
           HEAPU8.set(data, walletworker_buffer);
        func(walletworker_buffer, data.length);
};

if (self.Worker) {
  console.log("Worker in Worker supported");
  walletworkerList = [];

  for (let i = 0; i < navigator.hardwareConcurrency; i++) {
    let w = new Worker('walletworker_plus.js');
    w.onmessage = function wallet_worker_onmessage(msg) {
//  	  	console.log("wallet_worker_onmessage", msg.data.func);
      if (msg.data.func === "on_block_prepared" || msg.data.func === "on_transaction_prepared") {
        let worker_id = msg.data.worker_id;
        let work_amount = msg.data.work_amount;
        walletworkerList[worker_id].work_amount -= work_amount;
        pass_worker_reply(msg);
  	  }else
    		throw "Unknown function will not be called in worker context ";
    };
    walletworkerList.push({worker: w, work_amount: 0});
  }
}else{
  console.log("Worker in Worker NOT supported (Safari is a new IE?)");
}

importScripts("mainworker.js");

(function() {
  var messageBuffer = null, buffer = 0, bufferSize = 0;


  function flushMessages() {
    if (!messageBuffer) return;
    if (runtimeInitialized) {
      var temp = messageBuffer;
      messageBuffer = null;
      temp.forEach(function(message) {
        onmessage(message);
      });
    }
  }

  function messageResender() {
    flushMessages();
    if (messageBuffer) {
      setTimeout(messageResender, 100); // still more to do
    }
  }

  let worker_http_request_respond_fun = function(handle, status, body) {
      var transferObject = {"handle":handle, "status":status, "body":body, "func":"worker_http_request"};
      postMessage(transferObject);
  };

  let find_least_busy_worker_id = function(){
    let worker_id = 0;
    let work_amount = walletworkerList[worker_id].work_amount;
    for (let i = 1; i < walletworkerList.length; i++) {
      if(walletworkerList[i].work_amount < work_amount) {
        work_amount = walletworkerList[i].work_amount;
        worker_id = i;
      }
    }
    return worker_id;
  };

  let worker_block_prepare = function(work_amount, data, size) {
      var transferObject = {
        'func': "worker_block_prepare",
        'work_amount': work_amount,
        'data': new Uint8Array(HEAPU8.subarray((data),(data + size)))
      };
      if (walletworkerList) {
        let worker_id = find_least_busy_worker_id();
        transferObject.worker_id = worker_id;
        walletworkerList[worker_id].work_amount += work_amount;
        walletworkerList[worker_id].worker.postMessage(transferObject, [transferObject.data.buffer]);
      }else{
        postMessage(transferObject, [transferObject.data.buffer]);
      }
   };
  let worker_transaction_prepare = function(work_amount, data, size) {
      var transferObject = {
        'func': "worker_transaction_prepare",
        'work_amount': work_amount,
        'data': new Uint8Array(HEAPU8.subarray((data),(data + size)))
      };
      if (walletworkerList) {
        let worker_id = find_least_busy_worker_id();
        transferObject.worker_id = worker_id;
        walletworkerList[worker_id].work_amount += work_amount;
        walletworkerList[worker_id].worker.postMessage(transferObject, [transferObject.data.buffer]);
      }else{
        postMessage(transferObject, [transferObject.data.buffer]);
      }
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

	let func = Module[msg.data.func];
	if (!func) throw 'invalid worker function to call: ' + msg.data.func;

  if (msg.data.func === "on_block_prepared" || msg.data.func === "on_transaction_prepared") {
        pass_worker_reply(msg);
	} else if (msg.data.func === "walletd_start"){
		let argv = msg.data.argv;
		let arg0 = argv.length > 0 ? argv[0] : "";
		let arg1 = argv.length > 1 ? argv[1] : "";
		let arg2 = argv.length > 2 ? argv[2] : "";
		let arg3 = argv.length > 3 ? argv[3] : "";
		let arg4 = argv.length > 4 ? argv[4] : "";
		console.log("walletd_start", arg0, arg1, arg2, arg3, arg4);
		func(arg0, arg1, arg2, arg3, arg4, worker_block_prepare, worker_transaction_prepare);
	}else if (msg.data.func === "worker_http_request"){
		let handle = msg.data.handle;
		let method = msg.data.method;
		let uri = msg.data.uri;
		let body = msg.data.body;
		func(worker_http_request_respond_fun, handle, method, uri, body);
	}else
		throw "Unknown function will not be called in worker context";
  }
})();

