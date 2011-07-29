dojo.provide("dojox.image.CarouselController");

dojo.require("dojo.fx");
dojo.require("dojox.fx");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dojo.string");
dojo.require("dojo.DeferredList");
dojo.declare("dojox.image.CarouselController", [dijit._Widget], {
    // summary:
    //		The controller class of the media carousel
    // pubsub topics:
    //      ready:
    //          summary: published by .startup()'s completition of deferred processes
    //          message: emtpy
    //      setLoaded:
    //          summary: published by .useSet() when a set is ready to be used
    //          message: setName(String): name of topic

    //our template path... move this to define() eventually.
    templateString: dojo.cache("dojox.image", "resources/Carousel.html"),

    //set with which to use as default one
    initialSet: null,

    dataStore: false,

    jsonUrl: false,

    _defaultSet: "defaultSet",

    constructor: function() {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "constructor");
        }
        this._incrementalIndexBySet = {};
        this.queue = [];
        this.listeners = [];
        this.disconnectHandlersWhenItemIsChanged = [];
        this._listenerTopics = ["ready", "setLoaded"];
        this.preloadAssetsOfSet = [];
        
        this.watch("PreloadAssetRange", handlePreloadRangeChange);
        this.watch("PreloadAssetIndexesOfSet", handlePreloadAssetIndexesOfSetChange);
    },

    startup: function() {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "startup");
        }
        if (this._started) {
            return;
        }
        //run inheritance chain
        this.inherited(arguments);

        //DeferredList object where all deferred's land in
        var deferredList;
        //list of all deferreds
        var listOfDeferreds = [];        
        //name of set to use
        var setName;
        //hitched function to change the active set
        var hitchedUseSet;
        //alias of the widget ID to used outside of this scope
        var widgetId = this.id;

        dojo.forEach(this._listenerTopics, function(topic, index) {
            this._listenerTopics[index] = this.id + "_" + topic;
        }, this);

        //Start up the event queue manager
        this._queueManager = new dojox.image.CarouselQueue(this._listenerTopics);
        this._supportingWidgets.push(this._queueManager);

        //instantiate the asset loader
        this.assetLoader = new dojox.image.CarouselAssetLoader(this);
        this._supportingWidgets.push(this.assetLoader);

        //if we have children domnodes treat them as data sources and parse them
        if (this.domNode.childNodes.length >= 1) {
            listOfDeferreds.push(this.assetLoader.addData({
                node: this.domNode
            }));
        }

        /*        //ditto if we received a datasore id
         if (this.dataStoreId) {
             defList.push(this.addData({
                 store: this.dataStoreId
             }));
         }

         //or a json
         if (this.jsonUrl) {
             defList.push(this.addData({
                 url: this.jsonUrl
             }));
         }
 */

        //we've got lots of async processes. Lets leverage on deferredLists to manage this in a decent way.
        deferredList = new dojo.DeferredList(listOfDeferreds);
        setName = this.initialSet || this._defaultSet;
        hitchedUseSet = dojo.hitch(this, "useSet", {
            setName: setName
        });

        deferreds.then(function() {
            if (dojo.config.isDebug) {
                console.debug(this.id + ": " + "Done adding dataitems. Showing something now.");
            }
            //apply the dataset to be used and autoshow first item
            hitchedUseSet();
            if (hitchedMonitorParent) {
                hitchedMonitorParent();
            }
            dojo.publish(widgetId + "_ready", [{
                ready: "ready"
            }]);

        });

        this.set("Started", true);
    },

    registerView: function(viewWidget){
        if(viewWidget.preloadAssetRange > this.preloadAssetRange){
            this.set("PreloadAssetRange", viewWidget.preloadAssetRange);
        }
        this.set(PreloadAssetIndexesOfSet, this.returnUniqueItems(this.PreloadAssetIndexesOfSet.concat(viewWidget.PreloadAssetIndexesOfSet)));
    },

    //public methods relative to ITEMS


    getCurrentIndex: function() {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getCurrentIndex");
        }
        //public function to return current item index
        return (this._currentIndex);
    },

    getCurrentItemDataItem: function() {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getCurrentItemDataItem");
        }
        //public function to return info about the current item.
        return (this._currentItemDataItem);
    },


    getCurrentItems: function() {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getCurrentItems");
        }
        //public function to return current items in the current set
        return (this._internalDataStore.query(this._itemSetStoreQuery, {
            sort: [{
                attribute: "index"
            }]
        }));
    },

    getItemsBySet: function(setName) {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getItemsBySet");
        }
        //public function to return all items within a specified set
        return (this._internalDataStore.query({
            setName: setName
        },
        {
            sort: [{
                attribute: "index"
            }]
        }));
    },

    getItemBySetAndIndex: function(setName, index) {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getItemBySetAndIndex");
        }
        //public function to return an [] containing a specific item by index and set
        return this._internalDataStore.query({
            setName: setName,
            index: index
        });
    },

    getCurrentMetaData: function() {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getCurrentMetaData");
        }
        //public function to return the metadata object for the current dataItem
        return (this._currentItemDataItem.metaData);
    },

    getItemDataItemByIndex: function(index) {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getItemDataItemByIndex");
        }
        //returns a data item from the store by an index key query
        return this._internalDataStore.query(dojo.mixin({
            index: index
        },
        this._itemSetStoreQuery))[0];
    },


    //public methods relative to SETS
    getCurrentSet: function() {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getCurrentSet");
        }
        //public function to return current name of set
        return (this._itemSetStoreQuery.setName);
    },

    getSets: function() {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getSets");
        }
        //public function to return [] of available set names
        var items = [];
        dojo.forEach(this._internalDataStore.query({},
        {
            sort: [{
                attribute: "setIndex"
            }]
        }),
        function(item) {
            items.push(item.setName);
        }
        );
        var j = 0;
        var itemSets = [];
        var i;
        for (i = 0; i < items.length; i++) {
            itemSets[j] = items[i];
            j++;
            if ((i > 0) && (items[i] === items[i - 1])) {
                itemSets.pop();
                j--;
            }
        }
        return (itemSets);
    },


    useSet: function(oArgs) {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "useSet");
        }
        //public function to apply an items set.
        //  oArgs:
        //      setName : string. name of the itemSet
        //      indexStart: When autoshowing, show item at index specified
        //      disableAutoShow: boolean. if true disables automatically showing the first item
        //
        //do nothing if we're switching to the current set
        if ((this._itemSetStoreQuery) && (this._itemSetStoreQuery.setName === oArgs.setName)) {
            return;
        }

        oArgs.setName = oArgs.setName || this.defaultSet;

        this._itemSetStoreQuery = {
            setName: oArgs.setName
        };


        if (!oArgs.disableAutoShow) {
            this.showIndex(oArgs.indexStart || 1);
        }

        this.onItemSetChange();

    },

    onChange: function() {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "onChange");
        }
        //public event
    },

    onItemSetChange: function() {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "onItemSetChange");
        }
        //public event called when the image set changes
    },

    _onItemSetChange: function() {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "_onItemSetChange");
        }
        //private event called when the image set changes
        this.onItemSetChange();
    },

    _setStartedAttr: function() {
        this._set("Started", true);
    },
    
    //setter methods

    _setPreloadAssetRangeAttr: function(newPreloadAssetRange){
        this._set("PreloadAssetRange", newPreloadAssetRange);
    },
    
    _setPreloadAssetIndexesOfSetAttr: function(newPreloadAssetIndexesOfSet){
        this._set("PreloadAssetIndexesOfSet", newPreloadAssetIndexesOfSet);
    },

    //event handlers
    
    handlePreloadRangeChange: function(){
        this.assetLoader.updatePreloadRange();
    },
    
    handlePreloadAssetIndexesOfSetChange: function(){
        this.assetLoader.updatePreloadRange();
    },

    //utility functions
    isStarted: function() {
        return this.started || false;
    },

    returnUniqueItems: function(array){
       var a = array.concat();
       for(var i=0; i<a.length; ++i) {
           for(var j=i+1; j<a.length; ++j) {
               if(a[i] === a[j])
                   a.splice(j, 1);
           }
       }
       return a;
    }

});