(function(window) {

  var haveLocalStorage;
  var LS_STATE_KEY = "remotestorage:widget:state";
  function stateSetter(widget, state) {
    return function() {
      if(haveLocalStorage) {
        localStorage[LS_STATE_KEY] = state;
      }
      if(widget.view) {
        if(widget.rs.remote) {
          widget.view.setUserAddress(widget.rs.remote.userAddress);
        }
        widget.view.setState(state, arguments);
      }
    };
  }
  function errorsHandler(widget){
    //decided to not store error state
    return function(error){
      if(error instanceof RemoteStorage.DiscoveryError) {
        console.log('discovery failed',  error, '"' + error.message + '"');
        widget.view.setState('initial', [error.message]);
      } else if(error instanceof RemoteStorage.SyncError) {
        widget.view.setState('offline', []);
      } else if(error instanceof RemoteStorage.Unauthorized){
        widget.view.setState('unauthorized')
      } else {
        widget.view.setState('error', [error]);
      }
    }
  }
  RemoteStorage.Widget = function(remoteStorage) {
    this.rs = remoteStorage;
    this.rs.on('ready', stateSetter(this, 'connected'));
    this.rs.on('disconnected', stateSetter(this, 'initial'));
    //this.rs.on('connecting', stateSetter(this, 'connecting'))
    this.rs.on('authing', stateSetter(this, 'authing'));
    this.rs.on('sync-busy', stateSetter(this, 'busy'));
    this.rs.on('sync-done', stateSetter(this, 'connected'));
    this.rs.on('error', errorsHandler(this) );
    if(haveLocalStorage) {
      var state = localStorage[LS_STATE_KEY] = state;
      if(state) {
        this._rememberedState = state;
      }
    }
  };

  RemoteStorage.Widget.prototype = {
    display: function(domID) {
      if(! this.view) {
        this.setView(new RemoteStorage.Widget.View(domID));
      }
      this.view.display.apply(this.view, arguments);
      return this;
    },

    setView: function(view) {
      this.view = view;
      this.view.on('connect', this.rs.connect.bind(this.rs));
      this.view.on('disconnect', this.rs.disconnect.bind(this.rs));
      this.view.on('sync', this.rs.sync.bind(this.rs));
      try {
        this.view.on('reset', function(){
          this.rs.on('disconnected', document.location.reload.bind(document.location))
          this.rs.disconnect()
        }.bind(this));
      } catch(e) {
        if(e.message && e.message.match(/Unknown event/)) {
          // ignored. (the 0.7 widget-view interface didn't have a 'reset' event)
        } else {
          throw e;
        }
      }

      if(this._rememberedState) {
        stateSetter(this, this._rememberedState)();
        delete this._rememberedState;
      }
    }
  };
 
  RemoteStorage.prototype.displayWidget = function(domID) {
    this.widget.display(domID);
  };

  RemoteStorage.Widget._rs_init = function(remoteStorage) {
    if(! remoteStorage.widget) {
      remoteStorage.widget = new RemoteStorage.Widget(remoteStorage);
    }
  };

  RemoteStorage.Widget._rs_supported = function(remoteStorage) {
    haveLocalStorage = 'localStorage' in window;
    return true;
  };

})(this);
