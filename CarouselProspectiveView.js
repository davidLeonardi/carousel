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

dojo.declare("dojox.image.CarouselPerspectiveView", [dijit._Widget, dijit._Templated], {

    //how many images in its range should this image preload
    preloadAssetRange: 2,

    preloadAssetIndexesOfSet: [1],

    amountOfItemsShown: 3,

    templateString: dojo.cache("dojox.image", "resources/PerspectiveView.html"),

    constructor: function(oArgs){
        this.controllerWidget = dojo.getObject(oArgs.controllerWidget);

    },

    startup: function(){
        var assetLoadList = this.computeNecessaryAssets(this.controllerWidget.getCurrentItemDataItem());
        this._loadRequiredAssets(assetLoadList.required).then(dojo.hitch(this, "_loadOptionalAssets", assetLoadList.optional));
        
    },
    
    _loadRequiredAssets: function(requiredAssetList){
        
        var assetLoadListLoaderProcesses = [];
        var initialRequiredLoader;

        dojo.forEach(assetLoadList, function(assetDataItem){
            assetLoadListLoaderProcesses.push(this.controllerWidget.assetLoader.addToLoadQueue(assetDataItem, true));
        }, this);

        initialRequiredLoader = new dojo.DeferredList(assetLoadListLoaderProcesses);
        return initialRequiredLoader;
    },
    
    _loadOptionalAssets: function(){
        var assetLoadListLoaderProcesses = [];
        var initialRequiredLoader;

        dojo.forEach(assetLoadList, function(assetDataItem){
            assetLoadListLoaderProcesses.push(this.controllerWidget.assetLoader.addToLoadQueue(assetDataItem));
        }, this);

        initialRequiredLoader = new dojo.DeferredList(assetLoadListLoaderProcesses);
        return initialRequiredLoader;
    },

    computeAssetsToBeLoaded: function(currentAssetDataItem){
        var necessaryAssets = [];
        var optionalAssets = [];
        var currentSet = currentAssetDataItem.setName;
        var availableSets = this.controllerWidget.getSets();
        var currentIndex = this.controllerWidget.getCurrentIndex;
        var adjacentIndices = [];
        var temporaryDataItem;
        var previewRangeIndex;

        //add the current dataItem to the queue of necessary assets
        necessaryAssets.push(currentAssetDataItem);

        //add the other items that will be shown alongside with the main index to the queue of necessary assets
        for (currentIndex; currentIndex < (currentIndex + amountOfItemsShown); currentIndex++) {
            adjacentIndices.push(currentIndex);
        };
        dojo.forEach(this.adjacentIndices, function(index){
            necessaryAssets.push(this.controllerWidget.getItemDataItemByIndex(index));
        }, this);

        //add the items of other sets specified in the initial requirement list to the list of necessary assets
        dojo.forEach(availableSets, function(setName){
            //get all the dataItems for the preloadAssetIndexesOfSet parameter
            dojo.forEach(this.preloadAssetIndexesOfSet, function(index){
                necessaryAssets.push(this.controllerWidget.getItemBySetAndIndex(setName, index));
            }, this);
        }, this);

        //now add in the optional assets...

        temporaryDataItem = currentAssetDataItem;
        for (previewRangeIndex=0; previewRangeIndex < this.preloadAssetRange; previewRangeIndex++) {
            temporaryDataItem = this.controllerWidget.getPreviousDataItemFromDataItem(temporaryDataItem);
            optionalAssets.push(temporaryDataItem);
        };

        temporaryDataItem = currentAssetDataItem;
        for (previewRangeIndex=0; previewRangeIndex > (this.preloadAssetRange * -1); previewRangeIndex--) {
            temporaryDataItem = this.controllerWidget.getPreviousDataItemFromDataItem(temporaryDataItem);
            optionalAssets.push(temporaryDataItem);
        };
        
        return {
            required: necessaryAssets,
            optional: optionalAssets
        };

    }

});