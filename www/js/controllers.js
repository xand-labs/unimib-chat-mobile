/**
 * (c)2014 Alfio Emanuele Fresta
 * <alfio.fresta@alacriter.co.uk>
 */

var DEBUG             = true;
var MAX_CANALI_USCITA = 3;
var ASYNC             = 75; // ms delay

var REGEX_TAG   = /^[a-z0-9\-]{2,20}$/;
var REGEX_NICK  = /^[a-zA-Z0-9\-]{6,20}$/;
var HOST        = 'http://bchat.studentibicocca.com/';

angular.module('starter.controllers', [])

.controller('AppCtrl', function($scope, $ionicModal, $timeout, $ionicScrollDelegate, $ionicPopup, $ionicPopover) {
  // Form data for the login modal
  $scope.loginData = {};

  $scope.identificato = false;
  $scope.accessoInCorso = false;

  $scope.identita     = {
    nickname:   '',
    realname:   '',
  };

  $scope.volume_possibili = {
    "tutti":      "Tutti i msgg.",
    "importanti": "Msgg. importanti",
    "nessuno":    "Nessun msg."
  };

  $scope.volume       = {
    valore:  "tutti"
  };

  $scope.seguiti      = [];
  $scope.invia        = [];
  $scope.lista        = [];
  $scope.possoInviareA= [];

  $scope.online       = 0;

  $scope.messaggio    = {
    testo:  '',
    max: 255,
  };

  $scope.nuovoTag     = {
    testo:  '',
    max: 22
  };

  $scope.messaggi     = [];

  $scope.client = new CClient();
  $scope.client.endpoint = HOST;

  $scope.inviaMessaggio = function() {
    if ( !$scope.messaggio.testo || !$scope.identificato ) { return false; }

    // Se nessun tag selezionato, apri selettore 
    if ( $scope.invia.length == 0 ) {
      $scope.generaPopupDestinatari(true).then(function(ok){
        if ( ok ) { // Se non ho annullato, riprovo
          $scope.inviaMessaggio();
        }
      });
      return;
    }

    var rid = $scope.storico.aggiungi_msg(false, null, (new Date), $scope.invia, $scope.identita.nickname, $scope.messaggio.testo, true);
    //    CClient.prototype.send = function(tags, body, reply, callback_ok, callback_error) {
    $scope.client.send($scope.invia, $scope.messaggio.testo, null,
      function(visibile) {
        if ( visibile == HIDE ) {
          $this.scope.ui.elimina(rid);
        }
      },
      function(ragione) {
        navigator.notification.alert(
          "Impossibile inviare: " + ragione, 
          function() { 
            $this.scope.ui.elimina(rid);
          },
          "Errore d'invio",
          "OK"
        );
      }
    )
    $scope.messaggio.testo = '';

  };

  $scope.popup = function(titolo, messaggio) {
    $ionicPopup.show({
      title: titolo,
      subTitle: messaggio,
      buttons: [
        {
          text: 'Ok',
          type: 'button-positive'
        }
      ]
    })
  };

  $scope.apriPopupDestinatari = function() {
      $scope.generaPopupDestinatari(false);
  };

  $scope.generaPopupDestinatari = function(forzato) {
    bottoni = [{
      text: '<strong>Okay</strong>',
      type: 'button-positive'
    }];

    if ( forzato ) {
      bottoni[0].onTap = function(e) {
        if ($scope.invia.length == 0) {
          e.preventDefault();
          $scope.popup(
            "Errore",
            "Devi selezionare almeno un tag per inviare un messaggio"
          );
        } else {
          return true;
        }
      }
      bottoni = [{
        text: 'Annulla',
        onTap: function(e){return false;}
      }].concat(bottoni);
    }
    return $ionicPopup.show({
      template: '<ion-checkbox ng-repeat="tag in possoInviareA" ng-model="tag.selezionato" ng-click="listaInviaSeleziona(tag.nome, tag.selezionato)">#{{ tag.nome }}</ion-checkbox>',
      title: 'Destinatari',
      subTitle: 'A quali tag vuoi inviare i messaggi?',
      scope: $scope,
      buttons: bottoni
    });
  };

  $scope.eventi = {


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
      $scope.storico.aggiungi_msg(important, reply, date, tags, author, body, false);
      $scope.ui.notifica(important);
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
      $scope.listaInvia();
      $scope.$apply();
    },

    connect:    function () {
      $scope.accessoInCorso = false;
      $.jStorage.set("login", (new Date));
      var tags = $.jStorage.get("tags", []);
      for (var i in tags) {
        $scope.ui.jointag(tags[i]);
      }
      var nick = $.jStorage.get("nick", false);
      if ( nick ) {
        $scope.client.requestNickname(nick);
      }
      $scope.invia = $.jStorage.get("invia", []);
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
    aggiungi: function(data, tipo, messaggio, autore, tags, mio) {
      if ( mio == undefined ) {
        mio = false;
      }
      var rid = Math.floor( Math.random() * 9999999 );
      $scope.messaggi.push({
        rid: rid,
        data: data,
        tipo: tipo,
        messaggio: messaggio,
        autore: autore,
        tags: tags,
        mio: mio,
        anonimo: (autore.indexOf("@") == -1)
      });
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


    aggiungi_msg:     function (importante, risposta, data, tags, autore, messaggio, mio) {
      messaggio = $("<div />").text(messaggio).html();
      if ( risposta ) {
        messaggio = "@" + risposta + ": " + messaggio;
      }
      var rid = $scope.storico.aggiungi(data, "msg", messaggio, autore, tags, mio);
      $scope.storico.scorri_fondo();
      return rid;
    },

    ottieni_delegato_scroll: function() {
      return $ionicScrollDelegate;
    },

    scorri_fondo:     function () {
      setTimeout(function() {
        
        $(".messaggio").linkify({
          tagName: 'a',
          target: '_blank',
          newLine: '\n',
          linkClass: null,
          linkAttributes: {
            onclick: 'javascript:window.open(this.href,\'_system\',\'location=yes\');return false;'
          }
        });
        $ionicScrollDelegate.$getByHandle('scrollabile').scrollBottom(true);


      }, 150);
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

    notifica: function(important) {
      if ( navigator.notification.beep && navigator.notification.vibrate ) {
        // ASYNC!
        if ( 
                $scope.volume.valore == "tutti" 
            ||  ($scope.volume.valore == "importanti" && important)
         ) {
          console.log("RIproduco il suono, " + $scope.volume.valore);
          setTimeout(function() {
            navigator.notification.beep(1);
          }, ASYNC);
        }
        setTimeout(function() {
          navigator.notification.vibrate(200);
        }, ASYNC);
      }
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

    chiediNuovoNick: function(preInserito) {
      if ( preInserito === undefined ) {
        preInserito = "";
      }
      return prompt("Inserisci nuovo nick", preInserito);
    },

    cambiaNick: function(ultimoTentativo) {
      // ASYNC
      setTimeout(function() {
        if ( ultimoTentativo == undefined ) {
          var nuovoNick = $scope.ui.chiediNuovoNick($scope.identita.nickname == $scope.identita.realname ? "" : $scope.identita.nickname );
        } else {
          var nuovoNick = $scope.ui.chiediNuovoNick(ultimoTentativo);
        }
        if ( nuovoNick == null || nuovoNick == false ) {
          return false;
        }
        if ( !REGEX_NICK.test(nuovoNick) ) {
          navigator.notification.alert(
            "Spiacente, il nick che hai richiesto (" + nuovoNick + ") non e' nel formato corretto.\nPuoi usare lettere, numeri e -. Il nick deve contenere tra 6 a 20 caratteri.", 
            function() { 
              $scope.ui.cambiaNick(nuovoNick);
            },
            "Formato non corretto",
            "Riprova"
          );
          return false;
        }
        $scope.client.testNickname(nuovoNick, function(disponibile) {
          if ( disponibile ) {
            $scope.client.requestNickname(nuovoNick);
            $.jStorage.set("nick", nuovoNick);
          } else {
            navigator.notification.alert(
              "Spiacente, il nick che hai richiesto (" + nuovoNick + ") non risulta disponibile.", 
              function() { 
              },
              "Nick non disponibile",
              "OK"
            );
          }

        });

      }, ASYNC);

    },

    identitaReale: function() {
      $scope.client.requestNickname(null);
      $.jStorage.set("nick", false);


    },

    nuovoTag: function() {
      if ( !REGEX_TAG.test($scope.nuovoTag.testo) ) {
        navigator.notification.alert(
          "Spiacente, il tag che vuoi seguire (" + $scope.nuovoTag.testo + ") non ha un formato corretto.\nSono accettati nomi di tag tra 2 e 20 caratteri contenenti lettere, numeri e -.", 
          function() { 
          },
          "Formato non valido",
          "OK"
        );
        return;
      }
      $scope.ui.jointag($scope.nuovoTag.testo, function() {}, function() {
        navigator.notification.alert(
          "Spiacente, si e' verificato un errore nel seguire il canale.", 
          function() { 
          },
          "Errore",
          "OK"
        );
      });
      $scope.nuovoTag.testo = '';
    },

    renderNick: function(nick) {
      nick = nick.split("@");
      if ( nick.length == 1 ) {
        nick.push("anonymous");
      }
      return nick[0] + " <img src='" + HOST + "/id/" + nick[1] + ".svg' class='img-id' alt='" + nick[1] + "' />";
    },

  }

  /** 
   * [{tag: "nome", selezionato: true|false}, ...]
   * viene usata come funzione sorgente dati per la vista
   * dei canali da selezionare per l'invio
   */
  $scope.listaInvia = function() {
    var r = [];
    for ( i in $scope.invia ) {
      r.push({nome: $scope.invia[i], selezionato: true});
    }
    for ( i in $scope.seguiti ) {
      if ( $scope.invia.indexOf($scope.seguiti[i]) !== -1 ) {
        continue;
      }
      r.push({nome: $scope.seguiti[i], selezionato: false});
    }
    $scope.possoInviareA = r;
  }

  $scope.listaInviaSeleziona = function(tag, nuovoStato) {
    // Se sto aggiungendo e ho superato la lunghezza massima...
    if ( nuovoStato && $scope.invia.length >= MAX_CANALI_USCITA ) {
      navigator.notification.alert(
        "Spiacente, puoi inviare messaggi a massimo " + MAX_CANALI_USCITA + " tag contemporaneamente.", 
        function() { 
          $scope.listaInvia();
          $scope.$apply();
        },
        "Impossibile aggiungere tag",
        "Annulla"
      );
      return;
    }
    if ( nuovoStato ) {
      // Aggiungo a lista tag in uscita
      $scope.invia.push(tag);
    } else {
      // Rimuovo dalla lista tag in uscita
      $scope.invia.splice($scope.invia.indexOf(tag), 1);
    }
    $scope.listaInvia();
    $.jStorage.set("invia", $scope.invia);
    // Non chiamo $apply() perche' dentro evento ng-click
    return;
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
