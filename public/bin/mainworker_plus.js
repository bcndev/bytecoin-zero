Module = {};
Module['noExitRuntime'] = true;

var walletworkerList = null;
var walletworker_buffer;
var walletworker_buffer_size = 0;
var set_worker_buffer = function(data) {
           if (!data.byteLength) {
              console.log("Main Worker strange");
              data = new Uint8Array(data);
            }
           if (!walletworker_buffer || walletworker_buffer_size < data.length) {
             if (walletworker_buffer) {
//                 console.log("Main Worker free", walletworker_buffer, walletworker_buffer_size);
                _free(walletworker_buffer);
             }
             walletworker_buffer = null;
             walletworker_buffer = _malloc(data.length);
             walletworker_buffer_size = data.length;
//              console.log("Main Worker malloc", walletworker_buffer, walletworker_buffer_size);
           }
           HEAPU8.set(data, walletworker_buffer);
}

var pass_worker_reply = function(msg) {
        let data = msg.data.data;
        let func = Module[msg.data.func];
        set_worker_buffer(data);
        func(walletworker_buffer, data.length);
};

if (self.Worker) {
//   console.log("Worker in Worker supported");
  walletworkerList = [];
  let cores = 1;
  if (navigator.hardwareConcurrency)
    cores = navigator.hardwareConcurrency;
  console.log("navigator.hardwareConcurrency=", navigator.hardwareConcurrency);

  for (let i = 0; i < cores; i++) {
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
  // We will pass prepare* messages up to zero_plus.js
  // which will create its own set of workers, pass messages to them, then respond to us
}

importScripts("mainworker.js");

(function() {
  var messageBuffer = null, buffer = 0, bufferSize = 0;

  let db;
  let db_initialized = false;

  function flushMessages() {
    if (!messageBuffer) return;
    if (runtimeInitialized && db_initialized) {
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
      let transferObject = {"handle":handle, "status":status, "body":body, "func":"worker_http_request"};
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

  let db_init_req = indexedDB.open("Files", 1);
        db_init_req.onupgradeneeded = function(e) {
          let db = e.target.result;
          objectStore = db.createObjectStore("Files");
          console.log("Successfully upgraded db");
        };
        db_init_req.onsuccess = function(e) {
          console.log("Success opening db");
          db = db_init_req.result;
          db_initialized = true;
        };
        db_init_req.onerror = function(e) {
          console.log("Error opening db");
          db_initialized = true;
        };

  let fetches = new Map();
  let next_fetch = 0;
  let cn_file_op = function(me, cb, verb, filename, data, size) {
    next_fetch += 1;
  	fetches.set(next_fetch, {"me":me, "cb":getFuncWrapper(cb, 'viiiii')});
  	let jverb = UTF8ToString(verb);
  	let jfilename = UTF8ToString(filename);
        console.log("jverb jfilename", jverb, jfilename);
  	if (jverb == "open") {
  	  let request = db.transaction(["Files"]).objectStore("Files").get(jfilename)
      let my_fetch = next_fetch; // for capture below
      request.onsuccess = function(event) {
    	  let result = request.result;
        console.log("Success opening db", result);
    	  let ha = fetches.get(my_fetch);
	      if (ha === undefined)
    	  	return;
    	  if (result == undefined) {
      	  ha.cb(my_fetch, ha.me, 0, 0, 0);
      	} else {
          set_worker_buffer(result);
      	  ha.cb(my_fetch, ha.me, walletworker_buffer, result.length, 0);
        }
      };
      request.onerror = function(event) {
        console.log("Error opening db", event);
    	  let ha = fetches.get(my_fetch);
	      if (ha === undefined)
    	  	return;
    	  ha.cb(my_fetch, ha.me, 0, 0, 1);
      };
  	}else if (jverb == "save") {
      let jdata = new Uint8Array(HEAPU8.subarray((data),(data + size)))
  	  let request = db.transaction(["Files"], "readwrite").objectStore("Files").put(jdata, jfilename);
      let my_fetch = next_fetch; // for capture below
      request.onsuccess = function(event) {
        console.log("Success saving db");
    	  let ha = fetches.get(my_fetch);
	      if (ha === undefined)
    	  	return;
    	  ha.cb(my_fetch, ha.me, 0, 0, 0);
      };
      request.onerror = function(event) {
        console.log("Error saving db", event);
    	  let ha = fetches.get(my_fetch);
	      if (ha === undefined)
    	  	return;
    	  ha.cb(my_fetch, ha.me, 0, 0, 1);
      };
  	}else
  	  throw "cn_file_op unknown verb " + jverb;
  };
  let cn_file_cancel = function(fetch) {
    fetches.delete(fetch);
  };
  Module.cn_file_op = cn_file_op;
  Module.cn_file_cancel = cn_file_cancel;

  let worker_block_prepare = function(work_amount, data, size) {
      let transferObject = {
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
      var twoMB = new ArrayBuffer(88608); // trigger GC on some browsers
   };
   Module.worker_block_prepare = worker_block_prepare;
  let worker_transaction_prepare = function(work_amount, data, size) {
      let transferObject = {
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
      var twoMB = new ArrayBuffer(88608); // trigger GC on some browsers
   };
   Module.worker_transaction_prepare = worker_transaction_prepare;

  onmessage = function onmessage(msg) {
    // if main has not yet been called (mem init file, other async things), buffer messages
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
		func(arg0, arg1, arg2, arg3, arg4);
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

