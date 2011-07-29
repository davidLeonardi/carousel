dojo.provide("dojox.image.CarouselSingleImageView");

dojo.require("dojo.fx");
dojo.require("dojox.fx");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dojo.string");
dojo.require("dojo.DeferredList");
dojo.require("dojox.av.FLVideo");
dojo.require("dojox.image.CarouselController");
dojo.require("dojox.image.CarouselAssetLoader");
dojo.require("dojox.image.CarouselViewBase");

dojo.declare("dojox.image.CarouselSingleImageView", [dijit._Widget, dijit._Templated], {
    
    //how many images in its range should this image preload
    preloadAssetRange: 3,

    //which index of a set to preload initially
    PreloadAssetIndexesOfSet: [1],

    startup: function(oArgs){
        this.inherited(arguments);
        //should only run if we care about resizing i guess...
        this._parentMarginBox = this._getParentMarginBox(this.domNode);
        //this is necessaary for all views that want to use video, perhaps break up views by media type? nah... sounds like a bad idea.
        this._playerType = this._determinePlayerType();

        //register the view with the controller class
        this.parentWidget = dojo.getObject(oArgs.controllerWidget);
        this.parentWidget.registerView(this);
    },

    showIndex: function(index) {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " +"showIndex");
        }
        dojo.forEach(this.disconnectHandlersWhenItemIsChanged,function (handler){
            dojo.disconnect(handler);
        },this);
        this.disconnectHandlersWhenItemIsChanged = [];

        // public function to show an item at index X
        // possibly rename to setIndex
        //todo: break this up, its batshit ugly and overbloated and unflexible and i fscking hate it.
        this._nextItemDataItem = this.getItemDataItemByIndex(index);
        //if we have no next data item we are most probably in the state where we are starting with a bogus | default image set, silently ignore this and don't throw any errors about it.
        if (!this._nextItemDataItem) {
            return;
        }
        var nextItemNode = dojo.byId(this._nextItemDataItem.itemNodeId);
        if (this._currentItemDataItem) {
            var currentItemNode = dojo.byId(this._currentItemDataItem.itemNodeId);
        }


        //don't do anything if we're requesting the same item as currently displayed
        if (this._currentItemDataItem && (this._currentItemDataItem === this._nextItemDataItem)) {
            return;
        }

        //if previous element is a video, destroy its instance and container node, and re-place the original video element in the nodecache so that the next round will be unaffected and reset
        if (this._currentItemDataItem && (this._currentItemDataItem.itemType === "video") && (this._playerType === "flash")) {
            var divId = this._currentItemDataItem.playerInstance.id;
            this._currentItemDataItem.playerInstance.destroy();
            dojo.destroy(dojo.byId(divId));
            dojo.place(this._currentItemDataItem.itemNode, this.nodeCache, "last");
            dojo.style(this._currentItemDataItem.itemNode, {opacity: 0, display: "none"});
        }

        //reset the html5 player as well
        if (this._currentItemDataItem && (this._currentItemDataItem.itemType === "video") && (this._playerType === "html5")) {
            this._currentItemDataItem.playerInstance.pause();
            this._currentItemDataItem.playerInstance.currentTime = 0;
        }

        if (!this._nextItemDataItem.itemIsLoaded) {
            //not implemented yet: _loadItem
            }

        if (this._currentItemDataItem) {
            this._currentItemDataItem.active = false;
            this._putItemtoStore(this._currentItemDataItem);
        }

        if (currentItemNode) {

            dojo.style(nextItemNode, {
                display: "block",
                position: "absolute",
                left: 0,
                top: 0
            });
            dojox.fx.crossFade({nodes:[currentItemNode, nextItemNode], duration:400, onEnd: function(){dojo.style(currentItemNode, "display", "none");}}).play();
        } else {
            dojo.style(nextItemNode, {
                display: "block",
                position: "absolute",
                left: 0,
                top: 0,
                opacity: 1
            });
        }

        this._currentItemDataItem = this._nextItemDataItem;

        if((nextItemNode.tagName == "video") || (nextItemNode.tagName == "VIDEO")){
            this._currentItemNode = nextItemNode;
            this._autoPlayWhenShown = dojo.attr(this._currentItemNode, "data-carousel-play-when-shown");
            this._loopVideo = dojo.attr(this._currentItemNode, "data-carousel-loop-video");

            if(this._playerType == "html5"){
                this._currentItemDataItem.playerInstance = this._currentItemNode;
            } else {
                if(this._autoPlayWhenShown === "true"){
                        if(!this._currentItemDataItem.playerInstance){
                            this._currentItemNode = dojo.create("div",{}, nextItemNode, "replace");            
                            this._currentItemDataItem.playerInstance = new dojox.av.FLVideo({mediaUrl:this._currentItemDataItem.itemSrc["flv"], autoPlay:true, isDebug:true}, this._currentItemNode);                        
                        }
                } else {
                    //autoplay is a tricky one when considering the flash player. fix this.
                    this._currentItemNode = dojo.create("div",{}, nextItemNode, "replace");            
                    this._currentItemDataItem.playerInstance = new dojox.av.FLVideo({mediaUrl:this._currentItemDataItem.itemSrc["flv"]}, this._currentItemNode);
                    var that = this;
                    this._currentItemDataItem.playerInstance.onLoad = function(){
                        setTimeout(function() {
                            that._currentItemDataItem.playerInstance.play();
                            that._currentItemDataItem.playerInstance.pause();
                            that._currentItemDataItem.playerInstance.seek(0);    
                        }, 100);
                    };

                }
            }

            if(this._autoPlayWhenShown === "true"){
                if(this._playerType === "html5"){
                    var that = this;
                    //fixme: this timeout shoulndt be. investigate race conditions happening.
                    setTimeout(function() {that._currentItemDataItem.playerInstance.play();}, 500);
                } 
            }


            //firefox does NOT support the "loop" attribute. we shall fix this.
            if(this._loopVideo == "true"){
                this.disconnectHandlersWhenItemIsChanged.push(dojo.connect(this._currentItemDataItem.playerInstance, "ended", this, function(){var hitched = dojo.hitch(this, function(){this._currentItemDataItem.playerInstance.play();});setTimeout(function() {hitched();}, 100);}));
                this.disconnectHandlersWhenItemIsChanged.push(dojo.connect(this._currentItemDataItem.playerInstance, "onEnd", this, function(){var hitched = dojo.hitch(this, function(){this._currentItemDataItem.playerInstance.seek(0); this._currentItemDataItem.playerInstance.play();});setTimeout(function() {hitched();}, 100);}));
            }

        } else {
            this._currentItemNode = nextItemNode;
        }

        this._currentIndex = index;
        this._currentItemDataItem.active = true;
        this._putItemtoStore(this._currentItemDataItem);
        this._parentMarginBox = this._getParentMarginBox(this._parentNode);
        this._resizeItemNode(this._currentItemNode, this._parentMarginBox.h, this._parentMarginBox.w);
        this.onChange();
    },


    showNext: function() {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " +"showNext");
        }
        //public function to show next item	
        var newIndex = this._currentIndex + 1;
        if (this._internalDataStore.query(this._itemSetStoreQuery).length < newIndex) {
            return;
        }
        this.showIndex(newIndex);
    },

    showPrev: function() {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " +"showPrev");
        }
        //public function to show next item
        var newIndex = this._currentIndex - 1;
        if (newIndex < 1) {
            return;
        }
        this.showIndex(newIndex);
    },
    

    _resizeItemNode: function(container, h, w) {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "_resizeItemNode");
            console.debug(this.id + ": " + "current image size is reported at: " + this._currentItemDataItem.itemWidth + " , " + this._currentItemDataItem.itemHeight);
        }
        var itemWHRatio = this._currentItemDataItem.itemWidth / this._currentItemDataItem.itemHeight;
        if (itemWHRatio < w / h)
        {
            //width determines height
            dojo.attr(container, 'width', w);
            dojo.style(container, 'width', w + "px");
            var newH = Math.ceil(w / itemWHRatio);
            dojo.attr(container, 'height', newH);
            dojo.style(container, 'height', newH + "px");
            container.style.marginTop = (h - newH) / 2 + 'px';
            container.style.marginLeft = 0;
            if (dojo.config.isDebug) {
                console.debug(this.id + ": " + container);
                console.debug(this.id + ": " + "resized asset to: " + w + " / " + newH);
            }
        } else {
            //height determines size
            dojo.attr(container, 'height', h);
            dojo.style(container, 'height', h + "px");
            var newW = Math.ceil(h * itemWHRatio);
            dojo.attr(container, 'width', newW);
            dojo.style(container, 'width', newW + "px");
            container.style.marginLeft = (w - newW) / 2 + 'px';
            container.style.marginTop = 0;
            if (dojo.config.isDebug) {
                console.debug(this.id + ": " + container);
                console.debug(this.id + ": " + "resized asset to: " + newW + " / " + h);
            }
        }
        
    }
     
});