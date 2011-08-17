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
dojo.require("dojox.image.CarouselParentMonitor");

dojo.declare("dojox.image.CarouselPerspectiveView", [dijit._Widget, dijit._Templated, dojox.image.CarouselViewBase, dojox.image.CarouselParentMonitor], {

    //how many images in its range should this image preload
    preloadAssetRange: 2,
    //required assets for each available collection [good for preview images of sets]
    preloadAssetIndexesOfCollection: [1],
    //how many items does this view display?
    //fixme: would be nice to introduce positive-negative
    maxAmountOfItemsShown: 6,

    //division factor of main image size relative to the size of the parent domNode
    mainImageWidth: 1.6,

    templateString: dojo.cache("dojox.image", "resources/CarouselPerspectiveView.html"),

    constructor: function(oArgs){
        if (dojo.config.isDebug) {
            console.debug("Constructor invoked for dojox.image.CarouselPerspectiveView");
        }

        //set the instance of the controller widget
        this.shownItems = {};
        this._supportingWidgets = [];
        this._availableAssets = {};
    },

    startup: function(){
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "startup");
        }
        //fire the inheritance chain, particularly the parent node monitor and the asset loader 
        this.inherited(arguments);
        
        //register the view with the controller widget and have the initial status properties be set; load the assets that are needed
        var assetLoadList;
        var requiredLoader;
        
        this.controllerWidget = dijit.byId(this.controllerWidget);
        //register the view
        this.controllerWidget.registerView(this);
        //generate an object containing two lists of assets: required and optional, where required assets load as fast and with highest priority as is allowed.
        
        this.set("loadedAsset", this.controllerWidget.get("currentDataItem"));

        this.shownItems = this.computeAssetsToShow(this.get("loadedAsset"));


        assetLoadList = this._computeAssetsToBeLoaded(this.get("loadedAsset"));
        //and feed the items to the asset manager to have them be loaded
        
        requiredLoader = this._loadAssets(assetLoadList.required, true);
        requiredLoader.combinedLoader.then(dojo.hitch(this, "_loadAssets", assetLoadList.optional));
        requiredLoader.combinedLoader.then(dojo.hitch(this, "onDataLoaded"));

        this.connect(this, "onDataLoaded", "handleDataLoaded");
        this.connect(this, "onParentSizeChange", "handleParentResize");

        setTimeout(dojo.hitch(this, "setNewCurrentDataItem"), 1000);
        dojo.subscribe(this.controllerWidget.id + "/currentDataItem", dojo.hitch(this, "handleDataItemUpdate"));
    },


    setNewCurrentDataItem: function(){
         this.controllerWidget.set("currentDataItem", this.controllerWidget.getNextDataItemFromDataItem(this.get("loadedAsset"), true));
    },
    
    handleDataItemUpdate: function(message){
      console.warn("index update detected!");
      console.debug(message);
    },

    //getters
    getImageScaleByZIndex: function(zIndex){
        //summary:
        //          Compute by how much an image is scaled based on it's z-index
        var scale = [1, 0.9, 0.8, 0.7, 0.6, 0.5];
        return scale[zIndex];
    },

    getImageTranslationByZIndex: function(zIndex){
        //summary:
        //          Compute the multiplication factor of the background image size relative to the main image
        var translate = [{x:0 , y:0},{x:200 , y:55},{x:400 , y:110},{x:600 , y:180},{x:800 , y:290},{x:1000 , y:420}];
        return translate[zIndex];
    },

    getOpacityByZIndex: function(zIndex){
        var opacity = [1, 0.8, 0.6, 0.4, 0.2, 0.1];
        return opacity[zIndex];
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
    
    handleParentResize: function(){
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "handleParentResize");
        }
    },
    //general stuff
    prepareDom: function(){
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "prepareDom");
        }
        //do the heavy dom lifting for us. If an item is new, create a widget and a dom representation for it, 
        //if an item was loaded previously, get it from the nodecache and put it back in the containernode
        
        //get the current dataItems now that everything has loaded
        var shownItems = [];
        dojo.forEach(this.shownItems.items, function(item){
            shownItems.push(this.controllerWidget.assetLoader.assetStore.query({index: item.assetIndex})[0]);
        }, this);
        
        
        dojo.forEach(shownItems, function(item, index){
            if(!this._availableAssets[item.index]){
                //it's not in the cache, create it ex novo
                var assetDataItem = item;
                //create a domNode we can "widgetify"
                var targetNode = dojo.create("img", {}, this.nodeCache, "last");
                //instantiate a child widget containing the representation of the asset
                var imageRepresentation = new dojox.image.CarouselPerspectiveViewImageRepresentation(item, targetNode);
                //add it to our local registry
                this._availableAssets[item.index] = {instance: imageRepresentation, dataItem: item};
                //and add it to our destroyRecursive chain of teardowns
                this._supportingWidgets.push(imageRepresentation);                
            } 
            //combine all this information
            dojo.mixin(this.shownItems.items[index], this._availableAssets[item.index]);
            //and finally do some styling with all our info and nodes
            this.styleAsset(this.shownItems.items[index]);
        }, this);
           
    },
    
    moveToNodeCache: function(domNode){
        //helper method to move a domnode to the node cache
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "moveToNodeCache");
        }

        dojo.place(domNode, this.nodeCache, "last");
    },
    
    moveToContainerNode: function(domNode, position){
        //summary: 
        //          helper method to move a domnode to the containernode. 
        //position:
        //          string, reference position string for dojo.place. 
        //          If we want to add to the front of the stack use position "first", if we want to add to the bottom of the stack use "last"
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "moveToContainerNode");
        }
        
        dojo.place(domNode, this.containerNode, position);
    },
    
    styleAsset: function(oArgs){
        //summary:
        //          Style an asset based on its z-index property
        //oArgs:
        //          asset: dataItem of an asset
        //          zIndex: z-index property of an asset
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "styleAsset");
        }

        dojo.style(oArgs.instance.domNode, {position: "absolute"});
        dojo.style(oArgs.instance.domNode, {zIndex: oArgs.zIndex});
        this.animationFactory(oArgs).play();

    },
    
    animationFactory: function(oArgs){
        //compute the previous zIndex 
        var originalZIndex = dojo.style(oArgs.instance.domNode, "zIndex") !== "auto" ? (dojo.style(oArgs.instance.domNode, "zIndex") * -1) : (oArgs.zIndex * -1);
        //compute the target zIndex
        var nextZIndex = (oArgs.zIndex * -1);
        //compute initial and final size of asset
        var originSize = this.getResizedAssetSizeByWidth({
            node: oArgs.instance.domNode, 
            assetWidth: oArgs.dataItem.itemWidth, 
            assetHeight: oArgs.dataItem.itemHeight, 
            targetHeight: this.parentMarginBox.h * this.getImageScaleByZIndex(0)
        });
        var targetSize = this.getResizedAssetSizeByWidth({
            node: oArgs.instance.domNode, 
            assetWidth: oArgs.dataItem.itemWidth, 
            assetHeight: oArgs.dataItem.itemHeight, 
            targetHeight: this.parentMarginBox.h * this.getImageScaleByZIndex(oArgs.zIndex * -1)
        });
        var animation;


        if(originalZIndex > 0 && (originalZIndex === nextZIndex)) { 
            originalZIndex = originalZIndex - 1;
            console.warn("decrementing");   
        }

        var animParams = {
            left: {start: this.getImageTranslationByZIndex(originalZIndex).x , end: this.getImageTranslationByZIndex(nextZIndex).x, units: "px"},
            top: {start: this.getImageTranslationByZIndex(originalZIndex).y, end: this.getImageTranslationByZIndex(nextZIndex).y, units: "px"},
            opacity: {start: this.getOpacityByZIndex(originalZIndex), end: this.getOpacityByZIndex(nextZIndex)},
            width: {start: originSize.width, end: targetSize.width, units: "px"},
            height: {start: originSize.height, end: targetSize.height, units: "px"}
        };

        console.debug(dojo.toJson(animParams));

        animation = dojo.animateProperty({
            node : oArgs.instance.domNode, 
            duration: 300,
            properties: animParams
        });

        return animation;
    },

    computeAssetsToShow: function(currentItem){
        //compute an array of items that will be shown after all has been loaded
        //fixme: i would love to display multiple collections at the same time. investigate this happening.

        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "computeAssetsToShow");
        }
        var assetList = [];
        var zIndex;
        
        assetList.push({assetIndex:currentItem.index, zIndex: 0});
        
        temporaryDataItem = currentItem;
        zIndex = 1;
        while(temporaryDataItem && (zIndex <= (this.maxAmountOfItemsShown - 1))){
            temporaryDataItem = this.controllerWidget.getNextDataItemFromDataItem(temporaryDataItem);
            if(temporaryDataItem){
                assetList.push({assetIndex:temporaryDataItem.index, zIndex: -zIndex});
            }
            zIndex = zIndex + 1;
        }
        return {items: assetList};  
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
    
    templateString: "<img src='${imageSource}'></img>",
    
    constructor: function(dataItem){
        //oArgs: {}
        //  assetNode: data Item from an asset
        if (dojo.config.isDebug) {
            console.debug("instantiated image for: "+ dataItem.itemSrc);
        }
        this.imageSource = dataItem.itemSrc;
    }
    
});