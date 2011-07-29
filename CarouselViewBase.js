dojo.provide("dojox.image.CarouselViewBase");

dojo.require("dijit._Widget");
dojo.declare("dojox.image.CarouselViewBase", [dijit._Widget], {

    //Monitor parent domNode and detect size changes
    //todo: implement native dijit methods like resize and so to reduce performance hit if parent is a dijit widget which
    //calls these events on children
    monitorParent: true,

    //msec interval at which to probe paren't size
    monitorInterval: 50,

    startup: function() {
        //Monitor the parent domnode's size. Hitched function to hanle scope changes.
        var hitchedMonitorParent;
        //actually populate hitchedMonitorParent with a hitched function
        if(this.monitorParent){
            hitchedMonitorParent = dojo.hitch(this, "_startMonitoringParentNode");
        }
        this.inherited(arguments);
    },

    _isHostType: function(object, property) {
        var NON_HOST_TYPES = {
            "boolean": 1,
            "number": 1,
            "string": 1,
            "undefined": 1
        };
        var type = typeof object[property];
        return type == 'object' ? !!object[property] : !NON_HOST_TYPES[type];
    },

    _determinePlayerType: function() {

        var video = document.createElement("video");
        var type = this._isHostType(video, "canPlayType");
        if (!type) {
            return "flash";
        }
        //Test ripped out of modernizr & has.js
        // note: in FF 3.5.1 and 3.5.0 only, "no" was a return value instead of empty string.
        //check if we REALLY can play html5 video. "maybie" is not enough evidently. I'm looking at YOU, IE9!!
        // Workaround required for IE9, which doesn't report video support without audio codec specified.
        //   bug 599718 @ msft connect
        if ((video.canPlayType('video/ogg; codecs="theora"') == "probably") || (video.canPlayType('video/mp4; codecs="avc1.42E01E"') == "probably") || (video.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"') == "probably") || (video.canPlayType('video/webm; codecs="vp8, vorbis"') == "probably")) {
            return "html5";
        }
        return "flash";

    },

    _startMonitoringParentNode: function() {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "_startMonitoringParentNode");
        }
        //set up the domnode monitoring
        this._parentMarginBox = this._getParentMarginBox(this._parentNode);
        this._monitorTimer = setInterval(dojo.hitch(this, "_monitorParentNodeSize"), this.monitorInterval);
    },

    onParentSizeChange: function() {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "onParentSizeChange");
        }
        //public event
    },

    _getParentMarginBox: function(parentNode) {
        //get the parent node's marginbox
        if (parentNode === dojo.body()) {
            return dojo.window.getBox();
        } else {
            //we only need w/h, use optimized function for this.
            //            if(this.id == "statementsCarousel"){console.debug(this.id + ": " +dojo._getMarginSize(parentNode))}
            return dojo._getMarginSize(parentNode);
        }
    },

    _monitorParentNodeSize: function() {
        //monitors the size of a domnode, and if it changes it fires a callback function
        var currentSize = this._getParentMarginBox(this._parentNode);
        if ((this._parentMarginBox.w !== currentSize.w) || (this._parentMarginBox.h !== currentSize.h)) {
            this._onParentSizeChange();
        }
    },

    _onParentSizeChange: function() {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "_onParentSizeChange");
        }
        //private event to resize the item and fire the public event
        this.onParentSizeChange();
        this._parentMarginBox = this._getParentMarginBox(this._parentNode);
        this._resizeItemNode(this._currentItemNode, this._parentMarginBox.h, this._parentMarginBox.w);
    }

});