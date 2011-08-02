dojo.provide("dojox.image.CarouselController");

dojo.require("dojo.fx");
dojo.require("dojox.fx");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dojo.DeferredList");
dojo.require("dojox.image.CarouselAssetLoader");
dojo.declare("dojox.image.CarouselController", [dijit._Widget, dijit._Templated], {
    // summary:
    //		The controller class of the media carousel

    //our template path... move this to define() eventually.
    templateString: dojo.cache("dojox.image", "resources/Carousel.html"),

    //set with which to use as default one
    initialSet: null,

    dataStore: false,

    jsonUrl: false,

    defaultSet: "defaultSet",

    constructor: function() {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "constructor");
        }
        this._incrementalIndexBySet = {};
        this.preloadAssetsOfSet = [];
        this._supportingWidgets = [];
//        this.watch("PreloadAssetRange", handlePreloadRangeChange);
//        this.watch("PreloadAssetIndexesOfSet", handlePreloadAssetIndexesOfSetChange);
    },

    startup: function() {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "startup");
        }
        if (this.get("started")) {
            return;
        }
        //run inheritance chain
        this.inherited(arguments);

        //hitched function to change the active set
        var widgetId = this.id;


        //instantiate the asset loader
        this.assetLoader = new dojox.image.CarouselAssetLoader({controllerWidget : this});
        this._supportingWidgets.push(this.assetLoader);

        this.loadData();
        
        //place this in the correct place
        //todo!
//        this.useSet({setName: initialSet});

        this.set("started", true);
    },

    loadData: function(){
        //initiate loading of assets. Check if we have a DOM structure as child nodes, a passed store ID or a JSON file URL. 
        var domNode;
        var dataStore;
        var jsonURL;
        if(this.containerNode.childNodes){
            if (this.containerNode.childNodes.length >= 1){
                domNode = this.containerNode;
            }
        }
        if(this.dataStoreId){
            dataStore = dataStoreId;
        }
        if(this.jsonUrl){
            jsonURL = this.jsonUrl;
        }
        
        this.assetLoader.addData({
            node: domNode,
            store: dataStore,
            url: jsonURL
        });
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


    //setter methods

    _setStartedAttr: function() {
        this._set("started", true);
    },

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

    //utilities

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