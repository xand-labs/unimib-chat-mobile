/*
 * UNIMIB CHAT client library
 * (c)2014 Alfio Emanuele Fresta
 * <alfio.fresta@alacriter.co.uk>
 * - Requires socket.io and jQuery
 */

// Constants
const OK          = 0;
const FAIL        = 1;
const HIDE        = 2;
const NICK_TAKEN  = 3;
const TOO_MANY    = 4;


function CClient() {
	this.io			= null;						
	this.refresh 	= 12000; 					// Refresh time (tag list)
	this.endpoint 	= 'CHANGEME-controllers.js';
	this.identity 	= {
		max_length: 	0,
		nickname: 		null,
		realname: 		null,
	};
	this._tags 		= [];
	this._online 	= 0;
	this.list 		= {};
	
	/*
	 * == EVENTS ==
	 * The client application MUST catch all of these events: -
	 */
	this.events 	= {
		disconnect: 	null,	// .disconnect()
		notification: 	null,	// .notification(int type, string message)
		receive: 		null,	// .receive(bool important, string author, 
								//  		string¦null reply, list:string tags,
								//			string message, Date date)
		reconnect: 		null,	// .reconnect()
		subscribe: 		null,	// .subscribe(string tag)
		unsubscribe: 	null,	// .unsubscribe(string tag)
		updateCount: 	null,	// .updateCount(int onlineUsers)
		updateIdentity: null, 	// .updateIdentity(object identity)
		updateList: 	null,	// .updateList(object tagList)
		updateTags: 	null,	// .updateTags(list:string subscribedTags)
	};
}

CClient.prototype.noop1 = function( first ) { }
CClient.prototype.noop2 = function( first, second ) {}

// Try and connect to the server
CClient.prototype.connect = function( params, callback_ok, callback_error ) {
	
	this.io = io.connect(this.endpoint, {query: $.param(params)});

	var t = this;
	this.io.on('connect', function (r) {
		t.getIdentity(function(i) {
			t.identity = i;
			callback_ok();
			t.events.updateIdentity(t.identity);
		});
		t.refreshList();
	});

	this.io.on('I', function(r) { t.onInfoUpdate(r); 		});
	this.io.on('J', function(r) { t.onForcedSubscribe(r); 	});
	this.io.on('M', function(r) { t.onReceive(r); 			});
	this.io.on('N', function(r) { t.onNotification(r); 		});
	this.io.on('Q', function(r) { t.onForcedUnsubscribe(r); });
	this.io.on('U', function(r) { t.onCountUpdate(r); 		});

	this.io.on('disconnect', function() { t.onDisconnect(); });
	this.io.on('reconnect' , function() { t.onReconnect();  });

	this.io.on('error', function (reason) {
  		callback_error(reason);
  		t.io = null;
	});

	if ( this.refresh ) {
		setInterval( function() { t.refreshList(); }, t.refresh );
	}

};

// Test a possible nickname
CClient.prototype.testNickname = function(nickname, callback) {
	this.io.emit('c', nickname, function(r) {
		callback((r == OK));
	});
};

// Requests for a new nickname
CClient.prototype.requestNickname = function(nickname) {
	var t = this;
	this.io.emit('s', nickname, function(r) {
		if ( r == OK ) {
			t.updateIdentity(function(k) {
				t.events.updateIdentity(t.identity);
			});
		}
	});
};

// Return the current nickname
CClient.prototype.getIdentity = function( callback ) {
	if ( this.identity.realname !== null ) {
		callback(this.identity);
	} else {
		var t = this;
		this.updateIdentity(function() {
			callback(t.identity);
		});
	}
	return this.identity;
};

// Force update from server of current identity
CClient.prototype.updateIdentity = function( callback ) {
	var t = this;
	this.io.emit('i', 'please', function(r) {
		if (r.length == 2) {
			r.push(r[1]);
		}
		t.identity = {
			nickname: 	r[2],
			realname: 	r[1],
			max_length: r[0]
		};
		callback(t.identity);
	});
}

CClient.prototype.refreshList = function() {
	var t = this;
	this.io.emit('l', 'please', function(r) {
		var list = {};
		for ( var i = 0; i < r.length; i = i + 2 ) {
			list[r[i]] = r[i+1];
		}
		t.list = list;
		t.events.updateList(t.list);
	});
};

// Subscribe to a new tag
CClient.prototype.subscribe = function(tag, callback_ok, callback_error) {
	var t = this;
	this.io.emit('j', tag, function(r) {
		if ( r == OK ) {
			if (t._tags.indexOf(tag) == -1) {
				t._tags.push(tag);
				t.events.subscribe(tag);
			}
			callback_ok();
			t.events.updateTags(t._tags);
		} else {
			callback_error(r);
		}
	});
};

CClient.prototype.getTags = function() {
	return this._tags;
};


CClient.prototype.unsubscribe = function(tag, callback) {
	var t = this;
	this.io.emit('q', tag, function() {
		var index = t._tags.indexOf(tag);
		if ( index > -1 ) {
			t._tags.splice(index, 1);
		}
		t.events.unsubscribe(tag);
		t.events.updateTags(t._tags);
		callback();
	});
};

CClient.prototype.send = function(tags, body, reply, callback_ok, callback_error) {
	if (reply) {
		payload = [tags, body, reply];
	} else {
		payload = [tags, body];
	}
	this.io.emit('m', payload, function(r) {
		if ( r == OK || r == HIDE ) {
			callback_ok((r == OK));
		} else {
			callback_error(r);
		}
	});
};

CClient.prototype.onReceive = function(r) {
	// r = [important, author, tags, message, reply, *date]
	var important 	= !!r[0];
	var author 		= r[1];
	var tags 		= r[2];
	var message 	= r[3];
	var reply 		= r[4] ? r[4] : null;
	var date 		= r.length > 5 ? new Date(r[5] * 1000) : new Date();
	// TODO: ho cambiato l'ordine dei parametri in ricezione dal server
	//       per rispecchiare l'ordine con cui vengono mandati i messaggi
	//       dal client ([tags, message, reply]), magari vuoi omogeneizzare
	//       anche l'ordine delle altre funzioni correlate.
	this.events.receive(important, author, reply, tags, message, date);
};

CClient.prototype.onInfoUpdate = function(r) {
	this.identity.max_length = r[0];
	if ( r.length > 1 ) {
		this.identity.realname = r[1][0];
		if ( r[1].length > 1 ) {
			this.identity.nickname = r[1][1];
		}
	}
	this.events.updateIdentity(this.identity);
};

CClient.prototype.onNotification = function(r) {
 	this.events.notification(r[0], r[1]);
};

CClient.prototype.onCountUpdate = function(r) {
	this._online = r;
	this.events.updateCount(r);
};

CClient.prototype.onForcedUnsubscribe = function(r) {
	var index = this._tags.indexOf(r);
	if ( index > -1 ) {
		this._tags.splice(index, 1);
	}
	this.events.unsubscribe(r);
	this.events.updateTags(this._tags);
};

CClient.prototype.onForcedSubscribe = function(r) {
	var index = this._tags.indexOf(r);
	if ( index > -1 ) {
		return;
	}
	this._tags.push(r);
	this.events.subscribe(r);
	this.events.updateTags(this._tags);
}

CClient.prototype.onDisconnect = function() {
	this.events.disconnect();
};

CClient.prototype.onReconnect = function() {
	var t = this;
	this.updateIdentity(function() {
		t.events.reconnect();
	});
};
