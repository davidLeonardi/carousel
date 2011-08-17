dojo.provide("dojox.image.CarouselController");

dojo.require("dojo.fx");
dojo.require("dojox.fx");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dojo.DeferredList");
dojo.require("dojox.image.CarouselAssetLoader");
dojo.require("dojox.image.CarouselQueue");
dojo.declare("dojox.image.CarouselController", [dijit._Widget, dijit._Templated], {
    // summary:
    //		The controller class of the media carousel

    //our template path... move this to define() eventually.
    templateString: dojo.cache("dojox.image", "resources/Carousel.html"),

    //set with which to use as default one
    initialCollection: null,

    dataStore: false,

    jsonUrl: false,

    defaultCollection: "defaultCollection",

    constructor: function() {
        if (dojo.config.isDebug) {
            console.debug("CarouselController: constructor");
        }
        this._incrementalIndexByCollection = {};
        this.preloadAssetsOfCollection = [];
        this._supportingWidgets = [];
        this.views = [];
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

        //hitched function to change the active collection
        var widgetId = this.id;

        //instantiate the asset loader
        this.assetLoader = new dojox.image.CarouselAssetLoader({controllerWidget : this});
        this._supportingWidgets.push(this.assetLoader);

        this.loadData();

        this._setInitialState();
        
        this.set("started", true);
    },
    
    _setInitialState: function(){
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "_setInitialState");
        }
        
        this.initialCollection = this.initialCollection || this.get("collections")[0];
        this.initialIndex = this.initialIndex || 1;
        this.set("currentCollectionName", this.initialCollection);
        this.set("currentIndex", this.initialIndex);
        this.set("currentDataItem", this.getItemByCollectionAndIndex(this.initialCollection, this.initialIndex));
    },

    loadData: function(){
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "loadData");
        }

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
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "registerView");
        }

        this.views.push(viewWidget);
        viewWidget.set("currentIndex", this.get("currentIndex"));
        viewWidget.set("currentCollection", this.get("currentCollection"));
    },

    //getters
    
    _getCurrentIndexAttr: function(){
        //get the current asset index
        //returns: int
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getCurrentIndexAttr");
        }
        return this._currentIndex;
    },

    _getCurrentCollectionNameAttr: function(){
        //get the current collection name
        //returns: string
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getCurrentCollectionNameAttr");
        }

        return this._currentCollectionName;
    },
    
    _getCollectionsAttr: function() {
        //returns an array of the corrent collection names
        //read only
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getCollectionsAttr");
        }
        //public method to return [] of available collection names
        var items = [];
        dojo.forEach(this.assetLoader.assetStore.query({},
        {
            sort: [{
                attribute: "index"
            }]
        }),
        function(item) {
            items.push(item.collectionName);
        }
        );
        var j = 0;
        var itemCollections = [];
        var i;
        for (i = 0; i < items.length; i++) {
            itemCollections[j] = items[i];
            j++;
            if ((i > 0) && (items[i] === items[i - 1])) {
                itemCollections.pop();
                j--;
            }
        }
        return (itemCollections);
    },

    _getCurrentDataItemAttr: function(){
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getCurrentDataItemAttr");
        }
        return this._currentDataItem;
    },
    
    //setters
    _setCurrentIndexAttr: function(index){
        //setter method for setting the current index.
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "setCurrentIndexAttr");
        }

        //do nothing if we're setting the same index as now
        if(this.get("currentIndex") === index){return;}

        this._set("_currentIndex", index);
        dojo.publish(this.id + "/currentIndex", index);

        //unsure if this will trigger a unforseen cascade of method calls. suggestions, anyone?
        this.set("currentCollectionName", this.get("currentcollectionName"));
        this.set("currentDataItem", this.getItemByCollectionAndIndex(this.get("currentCollectionName"), index));
    },

    _setCurrentCollectionNameAttr: function(collectionName){
        //setter method to set the current collection
        //collectionName : string. name of the item collection
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "setCurrentCollectionNameAttr");
        }

        //do nothing if we're switching to the current collection
        if (this.get("currentCollectionName") === collectionName) {return;}

        this._set("_currentCollectionName", collectionName);
        dojo.publish(this.id + "/currentCollectionName", collectionName);

        this.set("currentIndex", 0); //or is this 1 based?? dont remember.
        this.set("currentDataItem", this.getItemByCollectionAndIndex(collectionName, 0));


    },

    _setCurrentDataItemAttr: function(dataItem){
        //setter method to set the current dataItem.
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "setCurrentDataItemAttr");
        }

        //if it's the same dataItem, return silently and dont do anything.
        if(this.get("currentDataItem") === dataItem){return;}

        this._set("_currentDataItem", dataItem);
        dojo.publish(this.id + "/currentDataItem", dataItem);

        this.set("currentCollectionName", dataItem.collectionName);
        this.set("currentIndex", dataItem.collectionIndex);
    },

    

    //public methods relative to ITEMS
    getCurrentItems: function() {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getCurrentItems");
        }
        //public method to return current items in the current collection
        return (this.assetLoader.assetStore.query({collectionName: this.get("currentCollectionName")}, {
            sort: [{
                attribute: "index"
            }]
        }));
    },
    
    getCurrentMetaData: function() {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getCurrentMetaData");
        }
        //public method to return the metadata object for the current dataItem
        return (this._currentItemDataItem.metaData);
    },

    getItemsByCollection: function(collectionName) {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getItemsByCollection");
        }
        //public method to return all items within a specified collection
        return (this.assetLoader.assetStore.query({
            collectionName: collectionName
        },
        {
            sort: [{
                attribute: "index"
            }]
        }));
    },

    getItemByCollectionAndIndex: function(collectionName, index) {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getItemByCollectionAndIndex");
        }
        //public method to return an [] containing a specific item by index and collection
        return this.assetLoader.assetStore.query({
            collectionName: collectionName,
            index: index
        })[0];
    },
    
    getNextDataItemFromDataItem: function(dataItem, loop){
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getNextDataItemFromDataItem");
        }

        //public method to get the next item by index from a specific dataitem
        //dataItem: data object of an asset
        //loop: boolean, indicates if indices should be looped together by considering the first item the next item after the last, and vice versa
        var index = dataItem.index + 1;
        var collectionName = dataItem.collectionName;
        var nextItem;

        nextItem = this.assetLoader.assetStore.query({collectionName: collectionName, index: index})[0];

        if(!nextItem && loop){
            nextItem = this.assetLoader.assetStore.query({collectionName: collectionName, index: 1})[0];
        }

        return nextItem;
    },

    getPreviousDataItemFromDataItem: function(dataItem, loop){
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getPreviousDataItemFromDataItem");
        }

        //public method to get the previous item by index from a specific dataitem
        //dataItem: data object of an asset
        //loop: boolean, indicates if indices should be looped together by considering the first item the next item after the last, and vice versa

        var index = dataItem.index - 1;
        var collectionName = dataItem.collectionName;
        var prevItem;
        var collectionLength;

        prevItem = this.assetLoader.assetStore.query({collectionName: collectionName, index: index})[0];

        if(!prevItem && loop){
            collectionLength = this.assetLoader.assetStore.query().lenth;
            nextItem = this.assetLoader.assetStore.query({collectionName: collectionName, index: (collectionLength - 1)})[0];
        }

        return prevItem;
    },

    getItemDataItemByIndex: function(index) {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getItemDataItemByIndex");
        }
        //returns a data item from the store by an index key query
        return this.assetLoader.assetStore.query(dojo.mixin({
            index: index
        },
        {collectionName: this.get("currentCollectionName")}))[0];
    },

    //general setter methods

    _setStartedAttr: function() {
        this._set("started", true);
    },

    //utilities

    returnUniqueItems: function(array){
        //fixme: unused for now
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