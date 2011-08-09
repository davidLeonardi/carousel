dojo.provide("dojox.image.CarouselPerspectiveView");

dojo.require("dojo.fx");
dojo.require("dojox.fx");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dojo.string");
dojo.require("dojox.av.FLVideo");
dojo.require("dojox.image.CarouselController");
dojo.require("dojox.image.CarouselAssetLoader");
dojo.require("dojox.image.CarouselViewBase");


dojo.declare("dojox.image.CarouselPerspectiveView", [dijit._Widget], {

    //how many images in its range should this image preload
    preloadAssetRange: 2,

    preloadAssetIndexesOfCollection: [1],

    amountOfItemsShown: 3,

//    templateString: dojo.cache("dojox.image", "resources/PerspectiveView.html"),

    constructor: function(oArgs){
        if (dojo.config.isDebug) {
            console.debug("Constructor invoked for dojox.image.CarouselPerspectiveView");
        }

        //set the instance of the controller widget
        this.shownItems = {};
    },

    startup: function(){
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "startup");
        }

        //register the view with the controller widget and have the initial status properties be set; load the assets that are needed
        var assetLoadList;
        var requiredLoader;
        
        this.controllerWidget = dijit.byId(this.controllerWidget);
        //register the view
        this.controllerWidget.registerView(this);
        //generate an object containing two lists of assets: required and optional, where required assets load as fast and with highest priority as is allowed.
        
        this.set("loadedAsset", this.controllerWidget.get("currentDataItem"));

        this.shownItems = this.computeAssetsToShow(this.get("loadedAsset"));

        assetLoadList = this.computeAssetsToBeLoaded(this.get("loadedAsset"));
        //and feed the items to the asset manager to have them be loaded
        
        requiredLoader = this._loadAssets(assetLoadList.required, true);
        requiredLoader.combinedLoader.then(dojo.hitch(this, "_loadAssets", assetLoadList.optional));
        requiredLoader.combinedLoader.then(dojo.hitch(this, "onDataLoaded"));

        this.connect("onDataLoaded", "handleDataLoaded");
    },
    
    //events
    onDataLoaded: function(){
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "onDataLoaded");
        }

      //public event when data loads
    },
    
    //event handlers
    handleDataLoaded: function(){
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "handleDataLoaded");
        }

        //event handler when all the necessary assets have loaded
        this.prepareDom();
    },

    prepareDom: function(){
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "prepareDom");
        }

        //also, i fucking would love to display multiple collections at the same time. investigate this happening.
        dojo.forEach(this.shownItems, function(assetDataItem){
            var imageItem = new dojox.image.CarouselPerspectiveViewImageRepresentation(assetDataItem, this.domNode);
            this._supportingWidgets.push(imageItem);
        }, this);
    },

    computeAssetsToShow: function(currentItem){
        //compute an array of items that will be shown after all has been loaded
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "computeAssetsToShow");
        }
        var assetList = [];
        var i;
        var that = this;
        var tempAsset = currentItem;

        assetList.push(currentItem);
        for (i=1; i < this.amountOfItemsShown; i++) {
        tempAsset = that.controllerWidget.getNextDataItemFromDataItem(tempAsset);
        assetList.push(tempAsset);
        };

        return {items: assetList};  
    },

    _loadAssets: function(assetList, isRequired){
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "_loadAssets");
        }

        //load the an array of assets and return all the deferred loader process instances
        var assetLoaderProcessList = [];
        var combinedLoader;

        dojo.forEach(assetList, function(assetDataItem){
            assetLoaderProcessList.push(this.controllerWidget.assetLoader.addToLoadQueue(assetDataItem, isRequired));
        }, this);

        combinedLoader = new dojo.DeferredList(assetLoaderProcessList);        

        return {combinedLoader: combinedLoader, singleLoaders: assetLoaderProcessList};
    },

    computeAssetsToBeLoaded: function(currentAssetDataItem){
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "computeAssetsToBeLoaded");
        }

        var necessaryAssets = [];
        var optionalAssets = [];
        var currentCollection = currentAssetDataItem.collectionName;
        var availableCollections = this.controllerWidget.getCollections();
        var currentIndex = currentAssetDataItem.index;
        var adjacentIndices = [];
        var temporaryDataItem;
        var previewRangeIndex;
        var highestIndexOfShownItem = currentIndex + this.amountOfItemsShown;
        //add the current dataItem to the queue of necessary assets
        necessaryAssets.push(currentAssetDataItem);

        //add the other items that will be shown alongside with the main index to the queue of necessary assets
        for (currentIndex; currentIndex < highestIndexOfShownItem; currentIndex++) {
            adjacentIndices.push(currentIndex);
        };
        dojo.forEach(this.adjacentIndices, function(index){
            necessaryAssets.push(this.controllerWidget.getItemDataItemByIndex(index));
        }, this);

        //add the items of other collections specified in the initial requirement list to the list of necessary assets
        dojo.forEach(availableCollections, function(collectionName){
            //get all the dataItems for the preloadAssetIndexesOfCollection parameter
            dojo.forEach(this.preloadAssetIndexesOfCollection, function(index){
                necessaryAssets.push(this.controllerWidget.getItemByCollectionAndIndex(collectionName, index));
            }, this);
        }, this);

        //now add in the optional assets...

        temporaryDataItem = currentAssetDataItem;
        previewRangeIndex = 0;
        while(temporaryDataItem && (previewRangeIndex < this.preloadAssetRange)){
            temporaryDataItem = this.controllerWidget.getPreviousDataItemFromDataItem(temporaryDataItem);
            if(temporaryDataItem){
                optionalAssets.push(temporaryDataItem);
            }
            previewRangeIndex = previewRangeIndex + 1;
        }
        

        temporaryDataItem = currentAssetDataItem;
        previewRangeIndex = 0;
        while(temporaryDataItem && (previewRangeIndex < -this.preloadAssetRange)){
            temporaryDataItem = this.controllerWidget.getPreviousDataItemFromDataItem(temporaryDataItem);
            if(temporaryDataItem){
                optionalAssets.push(temporaryDataItem);
            }
            previewRangeIndex = previewRangeIndex - 1;
        }        
        
        
        return {
            required: necessaryAssets,
            optional: optionalAssets
        };

    },
    
    
    //getters and setters
    setLoadedAssetAttr: function(asset){
        this._set("loadedAsset", asset);
    },

    getLoadedAssetAttr: function(){
        return this.loadedAsset;
    },

    setCurrentIndexAttr: function(index){
      this._set("currentIndex", index);
    },

    setCurrentCollectionAttr: function(collection){
        this._set("currentCollection", collection);
    },

    getCurrentIndexAttr: function(){
        return this.currentIndex;
    },

    getCurrentCollectionAttr: function(){
        return this.currentCollection;
    }


});

dojo.declare("dojox.image.CarouselPerspectiveViewImageRepresentation", [dijit._Widget, dijit._Templated], {
    
    templateString: "<img data-dojo-attach-point='imageNode'></img>",
    
    constructor: function(dataItem){
        //oArgs: {}
        //  assetNode: data Item from an asset
        this.imageSource = dataItem.imageSrc;
    },
    
    attributeMap: {
        imageSource: { node: "imageNode", type: "src"}
    }
});