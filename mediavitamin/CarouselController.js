dojo.provide("mediavitamin.CarouselController");

dojo.require("dojo.fx");
dojo.require("dojox.fx");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dojo.DeferredList");
dojo.require("mediavitamin.CarouselAssetLoader");
dojo.require("mediavitamin.CarouselQueue");
dojo.declare("mediavitamin.CarouselController", [dijit._Widget, dijit._Templated], {
    // summary:
    //		The controller class of the media carousel

    //our template path... move this to define() eventually.
    templateString: dojo.cache("mediavitamin", "resources/Carousel.html"),

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
        this.queue = new mediavitamin.CarouselQueue({controllerWidget: this});
        this.queue.addQueue(this.id + "/ready");

        //run inheritance chain
        this.inherited(arguments);

        //hitched function to change the active collection
        var widgetId = this.id;

        //instantiate the asset loader
        this.assetLoader = new mediavitamin.CarouselAssetLoader({controllerWidget : this});
        this._supportingWidgets.push(this.assetLoader);

        this.loadData();

        this._setInitialState();
        
        dojo.publish(this.id + "/ready", [this.get("currentDataItem")]);
        
        this.set("started", true);
    },
    
    _setInitialState: function(){
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "_setInitialState");
        }
        
        this.initialCollection = this.initialCollection || this.get("collections")[0];
        this.initialCollectionIndex = this.initialCollectionIndex || 0;
        this._set("_moveDirection", "nowhere");
        this._set("_currentCollectionName", this.initialCollection);
        this._set("_currentCollectionIndex", this.initialCollectionIndex);
        this._set("_currentDataItem", this.getItemByCollectionAndIndex(this.initialCollection, this.initialCollectionIndex));
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
        viewWidget.set("currentCollectionIndex", this.get("currentCollectionIndex"));
        viewWidget.set("currentCollection", this.get("currentCollection"));
    },

    //getters
    
    _getCurrentCollectionIndexAttr: function(){
        //get the current asset index by collection
        //returns: int
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getCurrentCollectionIndexAttr");
        }
        return this._currentCollectionIndex;
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

    _getCurrentDataItemAttr: function(){
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getCurrentDataItemAttr");
        }
        return this._currentDataItem;
    },
    
    _getMoveDirectionAttr: function(){
        return this._moveDirection;
    },
    
    
    //setters
    _setCurrentCollectionIndexAttr: function(collectionIndex){
        //setter method for setting the current index by collection
        //do nothing if we're setting the same index as now
        if(this.get("currentCollectionIndex") === collectionIndex){return;}

        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "_setCurrentCollectionIndexAttr");
        }
        
        this.set("moveDirection", this._computeMoveDirection(collectionIndex));
        this._set("_currentCollectionIndex", collectionIndex);
        dojo.publish(this.id + "/currentCollectionIndex", [{collectionIndex: collectionIndex}]);

        //unsure if this will trigger a unforseen cascade of method calls. suggestions, anyone?
        this._set("_currentCollectionName", this.get("currentCollectionName"));
        this._set("_currentDataItem", this.getItemByCollectionAndIndex(this.get("currentCollectionName"), collectionIndex));
    },

    _setCurrentCollectionNameAttr: function(collectionName){
        //setter method to set the current collection
        //collectionName : string. name of the item collection
        //do nothing if we're switching to the current collection
        if (this.get("currentCollectionName") === collectionName) {return;}

        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "setCurrentCollectionNameAttr");
        }

        this.set("moveDirection", "nowhere");
        this._set("_currentCollectionName", collectionName);
        dojo.publish(this.id + "/currentCollectionName", [{collectionName:collectionName}]);

        this._set("_currentCollectionIndex", 0);
        this._set("_currentDataItem", this.getItemByCollectionAndIndex(collectionName, 0));
    },

    _setCurrentDataItemAttr: function(dataItem){
        //setter method to set the current dataItem.
        //if it's the same dataItem, return silently and dont do anything.
        if(this.get("currentDataItem") === dataItem){return;}
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "setCurrentDataItemAttr");
        }

        this.set("moveDirection", this._computeMoveDirection(dataItem.uniqueIndex));
        this._set("_currentDataItem", dataItem);
        dojo.publish(this.id + "/currentDataItem", [{dataItem:dataItem}]);

        this._set("_currentCollectionName", dataItem.collectionName);
        this._set("_currentCollectionIndex", dataItem.collectionIndex);
    },

    _setMoveDirectionAttr: function(status){
        this._set("_moveDirection", status);
    },

    //public methods relative to ITEMS
    getCurrentItems: function() {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getCurrentItems");
        }
        //public method to return current items in the current collection
        return (this.assetLoader.assetStore.query({collectionName: this.get("currentCollectionName")}, {
            sort: [{
                attribute: "collectionIndex"
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
                attribute: "collectionIndex"
            }]
        }));
    },

    getItemByCollectionAndIndex: function(collectionName, collectionIndex) {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getItemByCollectionAndIndex");
        }
        //public method to return an [] containing a specific item by index and collection
        return this.assetLoader.assetStore.query({
            collectionName: collectionName,
            collectionIndex: collectionIndex
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
            nextItem = this.assetLoader.assetStore.query({collectionName: collectionName, collectionIndex: 0})[0];
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
            collectionLength = this.assetLoader.assetStore.query().length;
            nextItem = this.assetLoader.assetStore.query({collectionName: collectionName, collectionIndex: (collectionLength - 1)})[0];
        }

        return prevItem;
    },

    getItemDataItemByIndex: function(collectionIndex) {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getItemDataItemByIndex");
        }
        //returns a data item from the store by an index key query
        return this.assetLoader.assetStore.query(dojo.mixin({
            collectionIndex: collectionIndex
        },
        {collectionName: this.get("currentCollectionName")}))[0];
    },

    //general setter methods

    _setStartedAttr: function() {
        this._set("started", true);
    },

    //utilities

    _computeMoveDirection: function(uniqueIndex){
        //return the direction in which the items are changing
        var movingDirection;

        if(this.get("currentCollectionIndex") > uniqueIndex) {
            movingDirection = "downwards";
        } else if (this.get("currentCollectionIndex") < uniqueIndex) {
            movingDirection = "upwards";
        } else {
            movingDirection = "nowhere";
        }

        return movingDirection;
    },

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