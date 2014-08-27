/**
 * (c)2014 Alfio Emanuele Fresta
 */

const ABILITA_AUTOLOGIN	= true;
const DEBUG 			= true;

var livelli = ['info', 'success', 'warning', 'danger'];

var tags_impostazioni = {
	tagLimit: 3,
	beforeTagAdded: 	ui_tag_add_before,
	afterTagAdded:  	ui_tag_add_after,
	beforeTagRemoved: 	ui_tag_remove_before,
	afterTagRemoved: 	ui_tag_remove_after,
	onTagLimitExceeded: ui_tag_limit_hit,
	autocomplete: 	{
		source: 		ui_tag_source
	},
	caseSensitive: false,
	placeholderText: "Aggiungi tag..."
};

var tagList = [];


// Inizializza il client
var client = new CClient();

function effettua_login() {

		var url = "https://accounts.google.com/o/oauth2/auth?client_id=111899957451-6mr9mgh4vvi3mbmmk1q9teo48vsr2nre.apps.googleusercontent.com&response_type=code&redirect_uri=http://localhost:8080&scope=email";
		var loginWindow;
		loginWindow = window.open(url, '_blank', 'location=no,toolbar=no');
		loginWindow.addEventListener('loadstart', function(evt) {
		    var url = evt.url;
		    var code = /\?code=(.+)$/.exec(url);
		    var error = /\?error=(.+)$/.exec(url);

		    if (code || error) {
		         /* code[1] is your code to use in your next request to Google, we'll set it equal to code */
		       code =code[1];
		    }
		    $("#sid").val(code);

		    loginWindow.close();
		});

		// Token ottenuta
/*
		$("#accesso-pulsante").hide();
		$("#login-incorso").show();

		client.connect({
			access_token: a.access_token

		}, function() {
			// Login effettuato
			personalizzaNavbar();
			mostraComponente("chat", 500);

			// Assegna eventi
			client.events = {
				disconnect: 	client_disconnect,
				notification: 	client_notification,
				receive: 		client_receive,
				reconnect: 		client_reconnect,
				subscribe: 		client_subscribe,
				unsubscribe: 	client_unsubscribe,
				updateCount: 	client_updateCount,
				updateIdentity: client_updateIdentity, 
				updateList: 	client_updateList,
				updateTags: 	client_updateTags,
			};

			storico_aggiungi_sys("Benvenuto/a nella chat!"); 
			$("#modulo-msg-txt").focus();
			client_connect();

		}, function() {
			// Accesso negato
			$("#login-incorso").hide();
			$("#accesso-pulsante").show();
			$("#login-errore").show();

		});

	}*/
}



function logout() {
	// TODO: svuota cookies
	$.jStorage.flush();
}

function client_refreshList() {
	DEBUG && console.log('%', 'Tag list requested');
	client.refreshList();
}

function client_receive(important, author, reply, tags, body, date) {
	DEBUG && console.log('<', important, author, reply, tags, body, date);
	storico_aggiungi_msg(important, reply, date, tags, author, body);
}

function client_updateIdentity(identity) {
	DEBUG && console.log('* Identity: ', identity);
	$("#modulo-msg-txt").attr('maxlength', identity.max_length);
	if ( identity.hasOwnProperty('nickname') )
		$("#username").val(identity.nickname);
	else 
		$("#username").val(identity.real_identity);
}

function client_disconnect() {
	DEBUG && console.log('@ Disconnect', new Date());
	storico_aggiungi_sys('<i class="fa fa-warning"></i> La connessione &egrave; stata persa! Riconnessione...', 3);
}

function client_reconnect() {
	DEBUG && console.log('@ Connected!', new Date());
	storico_aggiungi_sys('<i class="fa fa-rss"></i> Connessione ristabilita!', 1);
}

function client_notification(type, body) {
	DEBUG && console.log('i', type, body);
	storico_aggiungi_sys('<i class="fa fa-info-circle"></i> ' + body, type);
}


function client_subscribe(tag) {
	DEBUG && console.log('+', tag);
	storico_aggiungi_join(tag);
	ui_postjoin(tag);
}

function client_unsubscribe(tag) {
	DEBUG && console.log('-', tag);
	storico_aggiungi_leave(tag);
	ui_postquit(tag);
}

function client_updateCount(count) {
	DEBUG && console.log('u', count);
	$("#utenti-online").text(count);
}

function client_updateList(list) {
	DEBUG && console.log('l', list);
	var tags = client.getTags();
	for ( var i in tags ) {
		if ( !list.hasOwnProperty(tags[i]) )
			list[tags[i]] = "1";
	}
	tagList = ui_prepare_list(list);
	list = client_sortList(list);
	trending_render(list);
}

function client_updateTags(tags) {
	DEBUG && console.log('t', tags);
	subscribed_render(tags);
	$("#tag-count").text(tags.length); // TODO: da cambiare
	$.jStorage.set("tags", tags);
}

function client_connect() {
	$.jStorage.set("login", (new Date));
	var tags = $.jStorage.get("tags", []);
	for (var i in tags) {
		ui_join(tags[i]);
	}
	var nick = $.jStorage.get("nick", false);
	if ( nick ) {
		client.requestNickname(nick);
	}
	var tags_selected = $.jStorage.get("tags-selected");
	for ( i in tags_selected ) {
	}
	ui_notifica_audio_inizializza();

}

function client_sortList(list) {
	if ( $("[name=ordinamento]:checked").data("valore") == "popolazione" ) {
		var sf = function(a, b){
	    	return b.num.localeCompare(a.num);
		};
	} else {
		var sf = function(a, b){
	    	return a.tag.localeCompare(b.tag);
		};
	}
	var r = [];
	for (var i in list) {
		r.push({tag: i, num: list[i]});
	}
	r.sort(sf);
	return r;
}

function storico_aggiungi_raw(data, tags, autore, messaggio) {
	var rid = Math.floor( Math.random() * 9999999 );
	var str = "";

	tagRegex = new RegExp("@(" + $("#username").val() + "): ");
    messaggio = messaggio.replace(tagRegex, 
    	'<span class="msg-tag msg-tag-io">@$1</span>: ');

	tagRegex = /@([a-zA-Z0-9._-]+(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})?): /g;
    messaggio = messaggio.replace(tagRegex,
    	'<span class="msg-tag" onclick="ui_autore(\'$1\');">@$1</span>: ');

	str += "<tr data-mt='msg' data-rid='" + rid + "'>\n";
	str += " <td class='data'>" + data + "</td>\n";
	str += " <td class='tags'>" + tags + "</td>\n";
	if ( autore ) {
		str += " <td class='autore grassetto cliccami' ";
		str +=   "onclick='ui_autore(\"" + autore + "\");'>";
		str +=     autore;
		str += " </td>\n";
	} else {
		str += " <td class='autore'><i class='fa fa-user'></i> Tu</td>";
	}
	str += " <td class='messaggio'>";
	str +=     messaggio;
	if ( autore ) {
		str +=     "<a class='btn btn-xs btn-default pull-right'";
		str +=     " onclick='ui_reply(\"" + rid + "\");'"
		str +=     " title='Rispondi a " + autore + "'>";
		str +=       "<i class='fa fa-reply'></i>";
		str +=     "</a>";
	}
	str += " </td>\n";
	str += "</tr>";
	$("#storico tbody").append($(str));
	storico_scorri_fondo();
	return rid;
}

function storico_aggiungi_sys(testo, livello, categoria) {
	if (livello === undefined) {
		livello = 0;
	}
	if ( categoria === undefined ) {
		categoria = 'g';
	}
	var str = "<tr data-mt='sys' data-categoria='" + categoria + "' class='" + livelli[livello] + "'>\n";
	str += " <td class='data'>" + (new Date()).toLocaleTimeString() + "</td>";
	str += " <td class='messaggio' colspan='3'>\n";
	str +=    testo;
	str += " </td>\n";
	str += "</tr>\n";
	$("#storico tbody").append($(str));
	storico_scorri_fondo();
}


function storico_aggiungi_join(tag) {
	// l'ultimo messaggio e' un join anch'esso?
	if ( $("#storico tr:last").data('categoria') == 'join' ) {
		// yes, allora appendi il tag
		$("#storico tr:last td:last").append(render_tag(tag));
	} else {
		// altrimenti, nuova riga :)
		storico_aggiungi_sys('<i class="fa fa-check"></i> Hai iniziato a seguire ' + render_tag(tag), 1, 'join');
	}
}

function storico_aggiungi_leave(tag) {
	// l'ultimo messaggio e' un join anch'esso?
	if ( $("#storico tr:last").data('categoria') == 'leave' ) {
		// yes, allora appendi il tag
		$("#storico tr:last td:last").append(render_tag(tag));
	} else {
		// altrimenti, nuova riga :)
		storico_aggiungi_sys('<i class="fa fa-times"></i> Hai smesso di seguire ' + render_tag(tag), 1, 'leave');
	}
}


function storico_aggiungi_msg(importante, risposta, data, tags, autore, messaggio, muto) {
	data = data.toLocaleTimeString();
	messaggio = $("<div />").text(messaggio).html();
	tags = render_tags(tags);
	if ( muto !== true )
		ui_notifica_audio();
	if ( risposta ) {
		messaggio = "@" + risposta + ": " + messaggio;
	}
	return storico_aggiungi_raw(data, tags, autore, messaggio);
}

function storico_scorri_fondo() {
	$('#io-scrollo').stop().animate({
	  scrollTop: $("#io-scrollo")[0].scrollHeight
	}, 500);
}

function storico_elimina(rid) {
	$("[data-rid=" + rid + "]").remove();
}

function storico_errore(rid, msg) {
	var originale = $("[data-rid=" + rid + "] .messaggio").html();
	$("[data-rid=" + rid + "] .messaggio").html(
		"<span class='text-muted'>" + originale + "</span><br />" +
		"<span class='text-danger'>" +
		 "<i class='fa fa-warning'></i> " +
		 "<strong>Impossibile inviare il messaggio</strong>:<br />" + msg +
		"</span>"
	);
}

function trending_render(tags) {
	var str = "";
	for ( var i in tags ) {
		str += "<li class='allinea-sinistra'><a onclick='ui_clicktag(this,\"" + tags[i].tag + "\");'>";
		str +=   render_tag(tags[i].tag, false);
		str += " <span class='badge pull-right'>" + tags[i].num + "</span>";
		str += "</a></li>\n";
	}
	$("#trending-tags").html(str);
}

function subscribed_render(tags) {
	var str = "";
	for ( var i in tags ) {
		//str += "<li class='allinea-sinistra'><a>";
		//str += " <a class='btn btn-danger btn-xs'><i class='fa fa-times'></i></a> "
		str +=   render_tag(tags[i]);
		//str += "</a></li>\n";
	}
	// $("#subscribed-tags").html(str);
}

function storico_render_tags(tags) {
	return render_tags(tags);
}

function ui_clicktag(obj, tag) {
	DEBUG && console.log('^ click-tag:', tag, $(obj).data('tid'));
	if ( subscribedTo(tag) ) {
		ui_quit(tag, obj);
	} else {
		ui_join(tag, obj);
	}
}

function ui_trending_join(obj, tag) {
	ui_join(tag, obj);
}

function subscribedTo(tag) {
	return (client.getTags().indexOf(tag) !== -1);
}

function ui_reply(rid) {
	// Rimuovi tutti i tag e segui quelli del messaggio
	$("#modulo-msg-tags").tagit("removeAll");
	$("[data-rid=" + rid + "] [data-tag]").each( function(i, e) {
		$("#modulo-msg-tags").tagit("createTag", "#" + $(e).data('tag'));
	});
	ui_autore($("[data-rid=" + rid + "] .autore").text());
}

function ui_autore(autore) {
	autore = autore.trim();
	if ( $("#modulo-msg-txt").val().substring(0,1) !== "@" ) {
		$("#modulo-msg-txt").val("@" + autore + ": " + $("#modulo-msg-txt").val() );
	}
	$("#modulo-msg-txt").focus();
}

function ui_join(tag, _obj, silenzioso) {
	if ( silenzioso == undefined ) {
		client.subscribe(tag, function() { }, ui_join_errore);
	} else {
		client.subscribe(tag, function() { }, function() { })
	}
}

function ui_quit(tag, _obj) {
	client.unsubscribe(tag, function() { });
}

function ui_postjoin(tag) {
	DEBUG && console.log('x', 'post-join', tag);
	$("[data-tag=" + tag + "]").removeClass('label-default').addClass('label-primary');
}

function ui_postquit(tag) {
	DEBUG && console.log('x', 'post-quit', tag);
	$("[data-tag=" + tag + "]").removeClass('label-primary').addClass('label-default');
}

/**
 * Renderizza piu' tag
 *
 * @param array tag 		La lista di tag da renderizzare
 * @param bool cliccabile	I tag devono essere cliccabili? Default: true
 * @return string 			I vari tag renderizzati
 */
function render_tags(tags, cliccabile) {
	// tags = tags.sort(); -- Non ordinare i tag.
	var str = "";
	for (var i in tags) {
		str += render_tag(tags[i], cliccabile) + " &nbsp;";
	}
	return str;
}

/**
 * Renderizza un tag
 *
 * @param string tag 		Il tag da renderizzare
 * @param bool cliccabile	Il tag deve essere cliccabile? Default: true
 * @return string 			Il tag renderizzato
 */
function render_tag(tag, cliccabile) {
	if (cliccabile == undefined || cliccabile == true) {
		on_click = "onclick='ui_clicktag(this, \"" + tag + "\");'";
	} else {
		on_click = "";
	}
	var tid = Math.floor( Math.random() * 100000 );
	var str = "";
	str += "<span data-tag='" + tag + "' data-tid='" + tid + "' " + on_click + " class='tag-span label ";
	if ( subscribedTo(tag) ) {
		str += "label-primary";
	} else {
		str += "label-default";
	}
	str += "'>#" + tag + "</span> ";
	return str;
}


/**
 * Eventi al caricamento della pagina
 */
document.addEventListener("deviceready", function(){

	$("#modulo-msg").submit( ui_invia );

	$("#form-tag").submit( ui_tag );
	$(".b-ordinamento").click ( client_refreshList );

    $("#cambia-nick-input").keyup( ui_cambia_nick_keyup );
    $("#cambia-nick-form").submit ( ui_cambia_nick_submit );

    $("#usa-identita-originale").click ( ui_cambia_nick_originale );
    $("#notifica-audio-pulsante").click(ui_notifica_audio_click);

    setTimeout(function(){
    effettua_login();
	
}, 5000);
    
});

var ltimer = false;
function ui_cambia_nick_keyup() {
	if ( ltimer !== false ) {
		clearTimeout(ltimer);
		ltimer = false;
	}
	var n = $("#cambia-nick-input").val();
	$(".nickname-scelto").text(n);
	$("#cambia-nick-conferma").attr('disabled', 'disabled').addClass('disabled');
	$("#cambia-nick-msgs p").hide();
	if ( !/^[a-zA-Z0-9\-]{6,20}$/.test(n) ) {
		$("#cambia-nick-msg-nv").show();
		return;
	}
	ltimer = setTimeout(ui_cambia_nick_controlla, 1000);
	$("#cambia-nick-msg-ip").show();
}

function ui_cambia_nick_controlla() {
	var n = $("#cambia-nick-input").val();
	client.testNickname(n, function(r) {
		$("#cambia-nick-msgs p").hide();
		$(".nickname-scelto").text(n);
		if ( r ) {
			$("#cambia-nick-msg-ok").show();
			$("#cambia-nick-conferma").removeAttr('disabled').removeClass('disabled');
		} else {
			$("#cambia-nick-msg-no").show();
		}
	});
}

function ui_cambia_nick_submit() {
	var n = $("#cambia-nick-input").val();
	client.requestNickname(n);
	$.jStorage.set("nick", n);
	$('#cambia-nick').modal('hide');
	return false;
}

function ui_cambia_nick_originale() {
	client.requestNickname(null);
	$('#cambia-nick').modal('hide');
}

function ui_tag_selezionati() {
	var r = [];
	$("[name=tags]").each(function(i,e){
		r.push($(e).val().substr(1));
	});
	return r;
}
function ui_invia () {
	var tags = ui_tag_selezionati();
	if ( tags.length == 0 ) {
		return false;
	}

	var reply = null;
	var msg  = $("#modulo-msg-txt").val();
	
	tagRegex = /^@([a-zA-Z0-9._-]+(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})?): (.*)$/;
	if ( tagRegex.test(msg) ) {
    	reply = msg.match(tagRegex)[1];
    	msg = msg.replace(tagRegex, '$3');
	}

	var rid  = storico_aggiungi_msg(0, reply, (new Date()), tags, false, msg, true);

	$("#modulo-msg-txt").val('').focus().select();
	client.send(tags, msg, reply, function (mostra) {
		if (!mostra) {
			storico_elimina(rid);
		}
		if ( !subscribedTo(tags[0]) ) {
			ui_join(tags[0], null, true);
		}
	},
	function(testo) {
		storico_errore(rid, testo);
	}); // TODO: cambiare tags

	return false;
}

function ui_tag () {
	var tag = $("#form-tag-txt").val();
	$("#form-tag-txt").val('').focus().select();

	client.subscribe(tag, function() {
		setTimeout(client_refreshList, 100);
	}, ui_join_errore);

	return false;
}

function ui_join_errore(r) {
	if ( r == 4 ) {
		alert("Impossibile seguire questo tag. Limite massimo superato.")
	} else {
		alert("Impossibile seguire questo tag. Codice errore: " + r);
	}
}

function ui_tag_limit_hit() {
	alert("Spiacente, non e' possibile inviare un messaggio con piu' di 3 tag.");
}

function ui_tag_add_before(e, u) {
	if ( !u.tagLabel.match(/^[#]?[a-zA-Z0-9\-]{2,20}$/) ) {
		alert("Il nome del tag non e' valido.");
		return false;
	}
	if ( u.tagLabel.substr(0,1) != '#' ) {
		return false;
	}
}

function ui_tag_add_after() {
	$.jStorage.set("tags-selected", ui_tag_selezionati());
}

function ui_tag_remove_before(){

}

function ui_tag_remove_after() {

}

function ui_prepare_list(obj) {
	var r = [];
	for (i in obj) {
		r.push({
			label: "#" + i,
			value: i
		});
	}
	return r;
}

function ui_tag_source(request, response) {
	var MAX = 5;
	var c = 0;
	var term;
	if ( request.term.substr(0,1) == '#' ) {
		term = request.term;
	} else {
		term = '#' + request.term;
	}
	var r = [];
	for (i in tagList) {
		if ( tagList[i].label.lastIndexOf(term, 0) === 0 ) {
			r.push(tagList[i]);
		}
		c++;
		if (c >= MAX)
			break;
	}
	response(r);
}

function ui_notifica_audio() {
	var play = !$.jStorage.get("muto", true);
	if ( !play )
		return;
	$("#notifica-audio-player")[0].load();
	$("#notifica-audio-player")[0].play();
}

function ui_notifica_audio_inizializza() {
	ui_notifica_audio_click();
	ui_notifica_audio_click();
}

function ui_notifica_audio_click() {
	var stato = !$.jStorage.get("muto", false);
	$.jStorage.set("muto", stato);
	if ( stato ) {
		$("#notifica-audio-pulsante").html("<i class='fa fa-volume-off'></i>");
	} else {
		$("#notifica-audio-pulsante").html("<i class='fa fa-volume-up'></i>");
	}
}