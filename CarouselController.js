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
        
        this.initialCollection = this.initialCollection || this.getCollections()[0];
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

    //event handlers
    

    //todo: create SETTER methods for:
    // - index
    // - collection
    // - current data item

    getCurrentIndexAttr: function(){
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getCurrentIndexAttr");
        }
        return this._currentIndex;
    },

    setCurrentIndexAttr: function(index){
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "setCurrentIndexAttr");
        }

      this._set("_currentIndex", index);
    },

    setCurrentCollectionNameAttr: function(collectionName){
        //setter method to set the current collection
        //collectionName : string. name of the item collection
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "setCurrentCollectionNameAttr");
        }

        //do nothing if we're switching to the current collection
        if (this.get("_currentCollectionName") === collectionName) {return;}

        this._set("_currentCollectionName", collectionName);
    },

    getCurrentCollectionNameAttr: function(){
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getCurrentCollectionNameAttr");
        }

        return this._currentCollectionName;
    },
    
    setCurrentDataItemAttr: function(dataItem){
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "setCurrentDataItemAttr");
        }

        this._set("_currentDataItem", dataItem);
    },

    getCurrentDataItemAttr: function(){
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getCurrentDataItemAttr");
        }
        return this._currentDataItem;
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
        var collectionIndex = dataItem.collectionIndex + 1;
        var collectionName = dataItem.collectionName;
        var nextItem;

        nextItem = this.assetLoader.assetStore.query({collectionName: collectionName, collectionIndex: collectionIndex})[0];

        if(!nextItem && loop){
            nextItem = this.assetLoader.assetStore.query({collectionName: collectionName, collectionIndex: 1})[0];
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

        var collectionIndex = dataItem.collectionIndex - 1;
        var collectionName = dataItem.collectionName;
        var prevItem;
        var collectionLength;

        prevItem = this.assetLoader.assetStore.query({collectionName: collectionName, collectionIndex: collectionIndex})[0];

        if(!prevItem && loop){
            collectionLength = this.assetLoader.assetStore.query().lenth;
            nextItem = this.assetLoader.assetStore.query({collectionName: collectionName, collectionIndex: (collectionLength - 1)})[0];
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


    //public methods relative to COLLECTIONS

    getCollections: function() {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getCollections");
        }
        //public method to return [] of available collection names
        var items = [];
        dojo.forEach(this.assetLoader.assetStore.query({},
        {
            sort: [{
                attribute: "collectionIndex"
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

    onItemCollectionChange: function() {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "onItemCollectionChange");
        }
        //public event called when the image collection changes, 
        //FIXME:unwired for now
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