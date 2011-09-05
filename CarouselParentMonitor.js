dojo.provide("mediavitamin.CarouselParentMonitor");

dojo.declare("mediavitamin.CarouselParentMonitor", [], {
    //Class intended to be used as mixin only. Do not use directly.
    //Summary: Provide a mixin to a mediavitamin.carousel widget that monitors the parent domNode and fires an event when the node's dimensions change

    //Monitor parent domNode and detect size changes
    //todo: implement native dijit methods like resize and so to reduce performance hit if parent is a dijit widget which
    //calls these events on children
    monitorParent: true,

    //msec interval at which to probe paren't size
    monitorInterval: 50,

    startup: function() {
        //set the parentNode to this.domNode. Fixme: is this optimal to be overridden, or are there better options?
        this._parentNode = this.domNode;
        //Monitor the parent domnode's size. 
        if(this.monitorParent){
            this._startMonitoringParentNode();
        }

        this.inherited(arguments);
    },

    onParentSizeChange: function() {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "onParentSizeChange");
        }
        //public event
    },

    _startMonitoringParentNode: function() {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "_startMonitoringParentNode");
        }
        //set up the domnode monitoring
        this.parentMarginBox = this._getParentMarginBox(this._parentNode);
        this._monitorTimer = setInterval(dojo.hitch(this, "_monitorParentNodeSize"), this.monitorInterval);
    },

    _getParentMarginBox: function(parentNode) {
        //get the parent node's marginbox
        if (parentNode === dojo.body()) {
            return dojo.window.getBox();
        } else {
            //we only need w/h, use optimized function for this.
            return dojo._getMarginSize(parentNode);
        }
    },

    _monitorParentNodeSize: function() {
        //monitors the size of a domnode, and if it changes it fires a callback function
        var currentSize = this._getParentMarginBox(this._parentNode);
        if ((this.parentMarginBox.w !== currentSize.w) || (this.parentMarginBox.h !== currentSize.h)) {
            this._onParentSizeChange();
        }
    },

    _onParentSizeChange: function() {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "_onParentSizeChange");
        }
        //private event to resize the item and fire the public event
        this.parentMarginBox = this._getParentMarginBox(this._parentNode);
        this.onParentSizeChange();
    }

});