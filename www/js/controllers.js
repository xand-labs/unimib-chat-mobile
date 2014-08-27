var DEBUG = true;

angular.module('starter.controllers', [])

.controller('AppCtrl', function($scope, $ionicModal, $timeout) {
  // Form data for the login modal
  $scope.loginData = {};

  $scope.identificato = false;
  $scope.accessoInCorso = false;

  $scope.identita     = {
    nickname:   '',
    realname:   '',
  };
  $scope.volume       = true;

  $scope.seguiti      = [];
  $scope.invia        = [];
  $scope.lista        = [];

  $scope.online       = 0;

  $scope.messaggio    = {
    testo:  '',
    max: 255,
  };

  $scope.messaggi     = [];

  $scope.client = new CClient();

  $scope.inviaMessaggio = function() {
    if ( !$scope.messaggio.testo || !$scope.identificato ) { return false; }
    $scope.messaggio.testo = '';
    $scope.$apply();

  };

  $scope.eventi = {

    connect:    function() {
      $scope.accessoInCorso = false;

      $scope.$apply();
    },

    disconnect: function() {
      DEBUG && console.log('@ Disconnect', new Date());
      $scope.storico.aggiungi_sys('<i class="ion-alert-circled"></i> La connessione &egrave; stata persa! Riconnessione...', 3);
      $scope.$apply();

    },

    refreshList:    function () {
      DEBUG && console.log('%', 'Tag list requested');
      $scope.client.refreshList();
      $scope.$apply();

    },

    receive:    function (important, author, reply, tags, body, date) {
      DEBUG && console.log('<', important, author, reply, tags, body, date);
      $scope.storico.aggiungi_msg(important, reply, date, tags, author, body);
      $scope.$apply();

    },

    updateIdentity:     function (identity) {
      DEBUG && console.log('* Identity: ', identity);
      $scope.messaggio.max = identity.max_length;
      $scope.identificato  = true;
      if ( identity.hasOwnProperty('nickname') && identity.nickname !== null )
        $scope.identita.nickname = identity.nickname;
      else 
        $scope.identita.nickname = identity.realname;
      $scope.identita.realname = identity.realname;
      $scope.$apply();
    },

    reconnect:    function () {
      DEBUG && console.log('@ Connected!', new Date());
      $scope.storico.aggiungi_sys('<i class="ion-ios7-world"></i> Connessione ristabilita!', 1);
      $scope.$apply();
    },

    notification:     function (type, body) {
      DEBUG && console.log('i', type, body);
      $scope.storico.aggiungi_sys('<i class="ion-information-circle"></i> ' + body, type);
      $scope.$apply();
    },


    subscribe:    function (tag) {
      DEBUG && console.log('+', tag);
      $scope.storico.aggiungi_join(tag);
      $scope.ui.postjoin(tag);
    },

    unsubscribe:    function (tag) {
      DEBUG && console.log('-', tag);
      $scope.storico.aggiungi_leave(tag);
      $scope.ui.postquit(tag);
    },

    updateCount:    function (count) {
      DEBUG && console.log('u', count);
      $scope.online = count;  
      $scope.$apply();
    },

    updateList:     function (list) {
      DEBUG && console.log('l', list);
      var tags = $scope.client.getTags();
      for ( var i in tags ) {
        if ( !list.hasOwnProperty(tags[i]) )
          list[tags[i]] = "1";
      }
      $scope.lista = list;
      $scope.$apply();
    },

    updateTags:     function (tags) {
      DEBUG && console.log('t', tags);
      $scope.seguiti = tags;
      $.jStorage.set("tags", tags);
      $scope.$apply();
    },

    connect:    function () {
      $.jStorage.set("login", (new Date));
      var tags = $.jStorage.get("tags", []);
      for (var i in tags) {
        $scope.ui.jointag(tags[i]);
      }
      var nick = $.jStorage.get("nick", false);
      if ( nick ) {
        $scope.client.requestNickname(nick);
      }
      var tags_selected = $.jStorage.get("tags-selected");
      for ( i in tags_selected ) {
      }
      $scope.$apply();

    },

    sortList:     function (list) {
      var sf = function(a, b){
          return b.num.localeCompare(a.num);
      };
      var r = [];
      for (var i in list) {
        r.push({tag: i, num: list[i]});
      }
      r.sort(sf);
      return r;

    },


  };

  $scope.storico = {

    /**
     messaggio: {
      data:       Date,
      tipo:       string("msg", "sys", "join", "leave"),
      messaggio:  string,
      autore:     false|string,
      tags:       [],
     }
     return rid
     */
    aggiungi: function(data, tipo, messaggio, autore, tags) {
      var rid = Math.floor( Math.random() * 9999999 );
      $scope.messaggi.push({
        rid: rid,
        data: data,
        tipo: tipo,
        messaggio: messaggio,
        autore: autore,
        tags: tags
      });
      $scope.$apply();
      return rid;
    },

    aggiungi_raw:     function (data, tags, autore, messaggio) {
      $scope.storico.aggiungi(data, "msg", messaggio, autore, tags);
      $scope.storico.scorri_fondo();
      $scope.$apply();
      return rid;
    },

    aggiungi_sys:     function (testo, livello, categoria) {
      $scope.storico.aggiungi((new Date), "sys", testo, "", []);
      $scope.storico.scorri_fondo();
      $scope.$apply();
    },


    aggiungi_join:      function (tag) {
      if ( $scope.messaggi.length > 0 && $scope.messaggi[$scope.messaggi.length-1].tipo == "join" ) {
        $scope.messaggi[$scope.messaggi.length-1].tags.push(tag);
      } else {
        $scope.storico.aggiungi((new Date), "join", "", "", [tag]);
      }
      $scope.$apply();
    },

    aggiungi_leave:     function (tag) {
      if ( $scope.messaggi.length > 0 && $scope.messaggi[$scope.messaggi.length-1].tipo == "leave" ) {
        $scope.messaggi[$scope.messaggi.length-1].tipo.tags.push(tag);
      } else {
        $scope.storico.aggiungi((new Date), "leave", "", "", [tag]);
      }
      $scope.$apply();
    },


    aggiungi_msg:     function (importante, risposta, data, tags, autore, messaggio, muto) {
      messaggio = $("<div />").text(messaggio).html();
      $scope.ui.notifica();
      if ( risposta ) {
        messaggio = "@" + risposta + ": " + messaggio;
      }
      $scope.$apply();
      return $scope.storico.aggiungi(data, "msg", messaggio, autore, tags);
    },

    scorri_fondo:     function () {
      /*if (!$('#io-scrollo')) { return false; }
      $('#io-scrollo').stop().animate({
        scrollTop: $("#io-scrollo")[0].scrollHeight
      }, 500);*/
    },

    elimina:      function (rid) {
      $("[data-rid=" + rid + "]").remove();
    },

    errore:     function (rid, msg) {
      var originale = $("[data-rid=" + rid + "] .messaggio").html();
      $("[data-rid=" + rid + "] .messaggio").html(
        "<span class='text-muted'>" + originale + "</span><br />" +
        "<span class='text-danger'>" +
         "<i class='fa fa-warning'></i> " +
         "<strong>Impossibile inviare il messaggio</strong>:<br />" + msg +
        "</span>"
      );
    },

  };

  $scope.ui = {

    clicktag: function(tag) {
      if ( $scope.ui.seguo(tag) ) {
        $scope.ui.leavetag(tag);
      } else {
        $scope.ui.jointag(tag);
      }
    },

    jointag:  function(tag, ok, errore ) {
      if ( ok == undefined ) {
        ok = function() {
        };
      }
      if ( errore == undefined ) {
        errore = function() {
        };
      }
      $scope.client.subscribe(tag, ok, errore);
    },

    leavetag:  function(tag, ok ) {
      if ( ok == undefined ) {
        ok = function() {
        };
      }
      $scope.client.unsubscribe(tag, ok);
    },

    postjoin: function(tag) {


    },

    postquit: function(tag) {


    },

    autore: function(autore) {
      autore = autore.trim();
      if ( $scope.messaggio.testo.substring(0,1) !== "@" ) {
        $scope.messaggio.testo = "@" + autore + ": " + $scope.messaggio.testo;
      }
      $("#campo-testo").focus();
      $scope.$apply();

    },

    reply: function(reply) {

    },

    notifica: function() {
      if ( $scope.volume &&navigator.notification.beep && navigator.notification.vibrate ) {
        navigator.notification.beep(2);
        navigator.notification.vibrate(200);
      }
      $scope.$apply();
    },

    seguo: function(tag) {
      return ($scope.client.getTags().indexOf(tag) !== -1);
    },

    logout: function() {
      $.jStorage.flush();
      window.cookies.clear(function() {
        DEBUG && console.log("Cookies cancellati.");
      });
      $scope.client.io.disconnect();
      $scope.identificato = false;
      $scope.accessoInCorso = false;
      $scope.$apply();
    },

/*
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
*/
  }

  $scope.effettuaLogin = function() {
    $scope.accessoInCorso = true;
    var CLIENT_ID = '111899957451-6mr9mgh4vvi3mbmmk1q9teo48vsr2nre.apps.googleusercontent.com';
    var CLIENT_SECRET = 'vIvQjkoIXPWUxIetNu9nEJyz';
    var REDIRECT_URI = 'http://localhost:8080';
    var SCOPE = 'email';
    var url = "https://accounts.google.com/o/oauth2/auth?client_id=" + CLIENT_ID + "&response_type=code&redirect_uri=" + REDIRECT_URI + "&scope=" + SCOPE;
    var loginWindow;
    loginWindow = window.open(url, '_blank', 'location=no,toolbar=no');
    loginWindow.addEventListener('loadstart', function(evt) {
      var lurl = evt.url;
      var code = /\?code=(.+)$/.exec(lurl);
      var error = /\?error=(.+)$/.exec(lurl);
      var token = false;
      if ( !code && !error) {
        return;
      }
      code = code[1];
      $.post('https://accounts.google.com/o/oauth2/token', {
        code: code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      }, function(data) {

        $scope.client.connect({
          access_token: data.access_token

        }, function() {

          $scope.client.events = {
            disconnect:     $scope.eventi.disconnect,
            notification:   $scope.eventi.notification,
            receive:        $scope.eventi.receive,
            reconnect:      $scope.eventi.reconnect,
            subscribe:      $scope.eventi.subscribe,
            unsubscribe:    $scope.eventi.unsubscribe,
            updateCount:    $scope.eventi.updateCount,
            updateIdentity: $scope.eventi.updateIdentity, 
            updateList:     $scope.eventi.updateList,
            updateTags:     $scope.eventi.updateTags,
          };

          $scope.storico.aggiungi_sys("<i class='ion-log-in'></i> Benvenuto nella chat!"); 
          $scope.eventi.connect();

        }, function() {
          $scope.accessoInCorso = false;
        });

      });
      loginWindow.close();

    });

}



})


.controller('NicknameCtrl', function($scope) {
  $scope.playlists = [
    { title: '#unimib-chat', id: 1 },
    { title: '#unimib-dev', id: 2 },
    { title: '#prova1', id: 3 },
    { title: '#prova2', id: 4 },
    { title: '#cazzo', id: 5 },
    { title: '#test', id: 6 }
  ];
});