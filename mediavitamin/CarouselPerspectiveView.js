dojo.provide("mediavitamin.CarouselPerspectiveView");

dojo.require("dojo.fx");
dojo.require("dojox.fx");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dojo.string");
dojo.require("dojox.av.FLVideo");
dojo.require("mediavitamin.ImageMagnifier");
dojo.require("mediavitamin.CarouselController");
dojo.require("mediavitamin.CarouselAssetLoader");
dojo.require("mediavitamin.CarouselViewBase");
dojo.require("mediavitamin.CarouselParentMonitor");

dojo.declare("mediavitamin.CarouselPerspectiveView", [dijit._Widget, dijit._Templated, mediavitamin.CarouselViewBase, mediavitamin.CarouselParentMonitor], {

    //how many images in its range should this image preload
    preloadAssetRange: 0,
    //required assets for each available collection [good for preview images of sets]
    preloadassetUniqueIndexesOfCollection: [1],
    //how many items does this view display?
    //fixme: would be nice to introduce positive-negative
    maxAmountOfItemsShown: 4,

    templateString: dojo.cache("mediavitamin", "resources/CarouselPerspectiveView.html"),

    constructor: function(oArgs){
        if (dojo.config.isDebug) {
            console.debug("Constructor invoked for mediavitamin.CarouselPerspectiveView");
        }

        //list of items that are going to be shown
        this.shownItems = [];
        //list of items that are to be removed from sight
        this.assetsToRemove = [];
        this._supportingWidgets = [];
        this._availableAssets = {};
    },

    startup: function(){
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "startup");
        }
        //fire the inheritance chain, particularly the parent node monitor and the asset loader 
        this.inherited(arguments);
        dojo.setSelectable(this.domNode);
        var assetLoadList;
        var requiredLoader;

        //set a private variable to the current parent node
        this._parentNode = this.domNode;
        //Monitor the parent domnode's size.         
        this._startMonitoringParentNode();


        //set the instance of the controller widget
        this.controllerWidget = dijit.byId(this.controllerWidget);

        //register the view
        this.controllerWidget.registerView(this);
        //generate an object containing two lists of assets: required and optional, where required assets load as fast and with highest priority as is allowed.

        
        this.prepareNewState();

        this.parentZIndex = this.getComputedZIndex(this.domNode);

        this.connect(this, "onParentSizeChange", "handleParentResize");
        this.connect(this.domNode, "onclick", "gotoNextItem");

        this.subscribe(this.controllerWidget.id + "/currentDataItem", dojo.hitch(this, "handleDataItemUpdate"));

    },

    //event handlers
    gotoNextItem: function(){
         this.controllerWidget.set("currentDataItem", this.controllerWidget.getNextDataItemFromDataItem(this.controllerWidget.get("currentDataItem"), true));
    },

    handleDataItemUpdate: function(newDataItem){
      this.prepareNewState();
    },

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
        this.prepareNewState();
    },

    prepareNewState: function(){
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "prepareNewState");
        }

        //summary: sets up a new widget state and connects the event handlers for when everything is ready to be displayed
        this.set("loadedAsset", this.controllerWidget.get("currentDataItem"));
        //keep a copy of the old assets for use in the styling process
        if(this.shownItems){
            this.oldShownItems = [];
            dojo.forEach(this.shownItems, function(item){
                this.oldShownItems.push({assetUniqueIndex: item.assetUniqueIndex, virtualZIndex: item.virtualZIndex, dataItem: item.dataItem, instance: item.instance});
            }, this); 
        }
        //compute the items that will be shown.
        this.shownItems = this.computeAssetsToShow(this.get("loadedAsset"));
        //compute the items that will have to be removed
        if(this.oldShownItems){
            this.itemsToRemove = this.computeItemsToRemove(this.get("loadedAsset"));
        }
        //compute the list of items that will be loaded
        assetLoadList = this._computeAssetsToBeLoaded(this.get("loadedAsset"));

        //and feed the items to the asset manager to have them be loaded
        requiredLoader = this._loadAssets(assetLoadList.required, true);
        requiredLoader.combinedLoader.then(dojo.hitch(this, "_loadAssets", assetLoadList.optional));
        requiredLoader.combinedLoader.then(dojo.hitch(this, "onDataLoaded"));  
    },

    computeAssetsToShow: function(currentItem){
        //summary:
        //      compute an array of items that will be shown after all has been loaded
        //      add in the current assets that are still in the containernode but that have to be removed [first and last items depending on moveDirection]
        //currentItems: currentDataItem of the asset that will be shown on the very top
        //returns an array of items in the form of {assetUniqueIndex: uniqueMemoryStoreIndex, index: 'virtual' z-index property} 
        //A virtual index of 0 corresponds to the bottommost item.

        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "computeAssetsToShow");
        }
        var assetList = [];
        var virtualZIndex;
        var temporaryDataItem;
        var assetAmount;

        //add the current dataItem to the list
        assetList.push({assetUniqueIndex: currentItem.uniqueIndex});

        temporaryDataItem = currentItem;
        virtualZIndex = 1;
        //add the remaining dataItems to be shown
        while(temporaryDataItem && (virtualZIndex <= (this.maxAmountOfItemsShown - 1))){
            //consider a collection a looping set of items!
            temporaryDataItem = this.controllerWidget.getNextDataItemFromDataItem(temporaryDataItem, true);
            if(temporaryDataItem){
                assetList.push({assetUniqueIndex: temporaryDataItem.uniqueIndex});
            }
            virtualZIndex = virtualZIndex + 1;
        }

        //set the correct virtualZIndex property for each item.
        //List is 0 based, 0 corresponds to the item on the very bottom
        assetAmount = assetList.length;
        assetList = assetList.reverse();
        dojo.forEach(assetList, function(asset, currentassetUniqueIndex){
            dojo.mixin(asset, {virtualZIndex: currentassetUniqueIndex});
        });
        //reverse it again to have the topmost item as first, now with the correct virtual Z-Index
        assetList = assetList.reverse();

        return assetList;  
    },
    
    computeItemsToRemove: function(){
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "computeItemsToRemove");
        }
        //summary: returns a list of items that are to be removed
        var assetList = [];
        var isContained;
        //determine if an old shown item is no longer if the array of currently shown items and add that to the list
        
        dojo.forEach(this.oldShownItems, function(oldItem){
            isContained = false;
            dojo.forEach(this.shownItems, function(currentItem){
               if(oldItem.assetUniqueIndex === currentItem.assetUniqueIndex){
                   isContained = true;
               }
            });
            
            if(!isContained){
                console.debug("found item to remove with index: " + oldItem.assetUniqueIndex);
                dojo.mixin(oldItem, {toBeRemoved: true});
                assetList.push(oldItem);
            }
                        
        }, this);

        return assetList;
    },

    //general stuff
    prepareDom: function(){
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "prepareDom");
        }
        //do the heavy dom lifting for us. If an item is new, create a widget and a dom representation for it, 
        //if an item was loaded previously, get it from the nodecache and put it back in the containernode
        //finally, style all the visible assets and the new ones

        //get the current dataItems from the item loader's memory store now that everything has loaded
        var assetsToProcess = [];
        var animationList = [];

        dojo.forEach(this.shownItems, function(item){
            assetsToProcess.push(this.controllerWidget.assetLoader.assetStore.query({uniqueIndex: item.assetUniqueIndex})[0]);
        }, this);

        dojo.forEach(assetsToProcess, function(item, index){
            if(!this._availableAssets[item.uniqueIndex]){
                //our asset is not in the cache, create it from scratch
                var assetDataItem = item;
                //create a domNode we can "widgetify"
                var targetNode = dojo.create("img", {}, this.nodeCache, "last");
                //instantiate a child widget containing the representation of the asset
                var imageRepresentation = new mediavitamin.CarouselPerspectiveViewImageRepresentation({dataItem: assetDataItem, parentWidget: this}, targetNode);
                imageRepresentation.startup();
                //add it to our local registry
                this._availableAssets[item.uniqueIndex] = {instance: imageRepresentation, dataItem: item};
                //and add it to our destroyRecursive chain of teardowns
                this._supportingWidgets.push(imageRepresentation);                
            } 
            //combine all this information
            dojo.mixin(this.shownItems[index], this._availableAssets[item.uniqueIndex]);
            //and finally do some styling with all our info and nodes
        }, this);

        if(this.itemsToRemove[0]){
            assetsToProcess = this.itemsToRemove.concat(this.shownItems);
        } else {
            assetsToProcess = this.shownItems;
        }

        //compute how to style all the assets and collect returned animations
        dojo.forEach(assetsToProcess, function(asset){
            animationList.push(this.styleAsset(asset));
        }, this);

        //and finally animate it all
        dojo.fx.combine(animationList).play();

    },

    styleAsset: function(oArgs){
        //summary:
        //          Compute the origin z-index property of a node and determine if it comes from / goes to the nodeCache
        //oArgs:
        //          asset: dataItem of an asset
        //          virtualZIndex: virtual z-index property of an asset, higher is on top
        //          instance: instance of asset widget
        //          dataItem: asset data item
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "styleAsset");
        }

        var transitionArguments, 
            from, 
            to, 
            fromNodeCache, 
            destroy, 
            moveDirection;

        moveDirection = this.controllerWidget.get("moveDirection");

        if(moveDirection === "upwards") {

            if(oArgs.toBeRemoved){
                //configure the animation for removal
                destroy = true;
                from = oArgs.virtualZIndex;
            } else {
                //set the origin virtual z-index to the item below
                from = oArgs.virtualZIndex - 1;
            }

            if(oArgs.virtualZIndex === 0){
                //the item is going to be the bottom most one, get it from the nodecache
                fromNodeCache = true;
                from = oArgs.virtualZIndex;
            }

        } else if (moveDirection === "asddownwards") {
            //FIXME: The direction determination method is broken, since when we go from last > first item it thinks we are going backwards, but from a GUI perspective this is totally wrong. Dunno wut to do.
            if(oArgs.toBeRemoved){
                console.debug("removing item with unique index of: " + oArgs.assetUniqueIndex);
                destroy = true;
                from = oArgs.virtualZIndex;
            } else {
                from = oArgs.virtualZIndex + 1;
            }
            
            if(oArgs.virtualZIndex >= this.shownItems.length - 1){
                //the item is the topmost one, get it from the nodeCache
                fromNodeCache = true;
                from = this.shownItems.length - 1;
            }

        } else if (moveDirection === "nowhere" || moveDirection === "downwards" ) {
            //we either are displaying the items for the first time or we are changing collections. 
            //get them all from the nodecache and show them as coming from the z-index above
            if(oArgs.virtualZIndex > 0){
                from = oArgs.virtualZIndex - 1;
            } else {
                from = 0;
            }
            fromNodeCache = true;
        } else {
            console.error("move direction not forseen.");
        }

        to = oArgs.virtualZIndex;

        if(oArgs.toBeRemoved){
            //configure the animation for removal
            destroy = true;
        }   

        transitionArguments = {
            from: from, 
            to: to,
            fromNodeCache: fromNodeCache,
            destroy: destroy
        };

        dojo.style(oArgs.instance.domNode, {position: "absolute"});
        dojo.style(oArgs.instance.domNode, {zIndex: (this.parentZIndex || this.getComputedZIndex(this.domNode)) + oArgs.virtualZIndex});
        
        return oArgs.instance.transition(transitionArguments);
    },

    //getters and setters
    setLoadedAssetAttr: function(asset){
        this._set("_loadedAsset", asset);
    },

    getLoadedAssetAttr: function(){
        return this._loadedAsset;
    },

    setCurrentIndexAttr: function(index){
      this._set("_currentIndex", index);
    },

    setCurrentCollectionAttr: function(collection){
        this._set("_currentCollection", collection);
    },

    getCurrentIndexAttr: function(){
        return this._currentIndex;
    },

    getCurrentCollectionAttr: function(){
        return this._currentCollection;
    },

    getImageScaleByZIndex: function(index){
        //summary:
        //          Compute by how much an image is scaled based on it's z-index
        //FIXME: this should be a mathematical function accepting two parameters:
        //1) the highest index
        //2) the current index
        var scale = [1, 0.9, 0.8, 0.7];
        scale = scale.reverse();
        return scale[index];
    },
    
    getImageScaleForTopExit: function(){
        return 1.2;
    },
    
    getImageScaleForBottomExit: function(){
        return 0.5;
    },

    getImageTranslationByZIndex: function(index){
        //summary:
        //          Compute the translation on the x/y axis of the asset based on the z-index
        //          Array describes the frontmost element as [0].
        var allItemsCount = this.controllerWidget.getCurrentItems().length;
        index = index + 1;
        index = allItemsCount - index;
        var translate = [{x:300 , y:76},{x:189 , y:96},{x:90 , y:116}];
        if(index > -1){
            return translate[index];            
        } else {
            //fixme: tie to getImageTranslationForTopExit perhaps?
            return {x:300 , y:76};
        }

    },
    
    getImageTranslationForTopExit: function(){
        return {x: -100, y: -50};
    },

    getImageTranslationForBottomExit: function(){
        return {x: 800, y: 250};
    },

    getOpacityByZIndex: function(index){
        var opacity = [1, 0.8, 0.6];
        opacity = opacity.reverse();
        return opacity[index];
    },
    
    getOpacityForTopExit: function(){
        return 0;
    },
    
    getOpacityForBottomExit: function(){
        return 0;
    },
    
    //events
    onDataLoaded: function(){
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "onDataLoaded");
        }
      //public event when data loads
      this.handleDataLoaded();
    }
    


});

dojo.declare("mediavitamin.CarouselPerspectiveViewImageRepresentation", [dijit._Widget], {
    
    //duration of animations
    animationDuration: 600,
    
    constructor: function(oArgs){
        //oArgs: {dataItem: assetDataItem, parentWidget: this}
        if (dojo.config.isDebug) {
            console.debug("instantiated image for: "+ oArgs.dataItem.itemSrc);
        }
        this.imageSource = oArgs.dataItem.itemSrc;
        this.parentWidget = oArgs.parentWidget;
        this.dataItem = oArgs.dataItem;
        this._supportingWidgets = [];
    },
    
    startup: function(){
        this.domNode = dojo.create("img", {src: this.imageSource}, this.domNode, "replace");
    },

    destroy: function(){
        //helper method to move a domnode to the node cache
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "destroy");
        } 
        //remove it from the parent widget
        delete this.parentWidget._availableAssets[this.dataItem.uniqueIndex];
        //and kill it off
        dojo.forEach(this._supportingWidgets, function(supportingWidget){
            supportingWidget.destroyRecursive();
        });
        this.inherited(arguments);
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
        
        dojo.place(domNode, this.parentWidget.containerNode, position);
    },
    
    transition: function(oArgs) {
        //summary:
        //          Transition an element from a status or z-index to another status or z-index
        //oArgs:
        //          object, contains the reference information
        //          from: integer, origin z-index
        //          to: integer, destination z-index
        //          fromNodeCache: boolean, indicates if a node is to be retrieved from the nodecache
        //          destroy: boolean, indicates if this widget should be destroyed on end of a transition

        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "transition");
        }

        var animation, rightParams, topParams, opacityParams, widthParams, heightParams, onBeginParams, onEndParams, nodeReferencePosition, that, originSize, targetSize;

        that = this;

        originSize = this.parentWidget.getResizedAssetSizeByWidth({
            node: this.domNode, 
            assetWidth: Math.round(this.dataItem.itemWidth),
            assetHeight: Math.round(this.dataItem.itemHeight),
            targetHeight: Math.round(this.parentWidget.parentMarginBox.h * this.parentWidget.getImageScaleByZIndex(oArgs.from))
        });

        targetSize = this.parentWidget.getResizedAssetSizeByWidth({
            node: this.domNode, 
            assetWidth: Math.round(this.dataItem.itemWidth),
            assetHeight: Math.round(this.dataItem.itemHeight),
            targetHeight: Math.round(this.parentWidget.parentMarginBox.h * this.parentWidget.getImageScaleByZIndex(oArgs.to))
        });

        rightParams = {
            start: Math.round(this.parentWidget.getImageTranslationByZIndex(oArgs.from).x),
            end: Math.round(this.parentWidget.getImageTranslationByZIndex(oArgs.to).x),
            units: "px"
        };
        
        topParams = {
            start: Math.round(this.parentWidget.getImageTranslationByZIndex(oArgs.from).y),
            end: Math.round(this.parentWidget.getImageTranslationByZIndex(oArgs.to).y),
            units: "px"
        };
        
        opacityParams = {
            start: this.parentWidget.getOpacityByZIndex(oArgs.from),
            end: this.parentWidget.getOpacityByZIndex(oArgs.to) || 1
        };
        
        widthParams = {
            start: Math.round(originSize.width),
            end: Math.round(targetSize.width),
            units: "px"
        };
        
        heightParams = {
            start: Math.round(originSize.height),
            end: Math.round(targetSize.height),
            units: "px"
        };
        
        if(oArgs.fromNodeCache){
            if(oArgs.to === 0){
                nodeReferencePosition = "first";
            } else {
                nodeReferencePosition = "last";
            }
            var that;
            onBeginParams = function(){
                that.moveToContainerNode(that.domNode, nodeReferencePosition);
            };
        }
        
        if (oArgs.from === this.parentWidget.controllerWidget.getCurrentItems().length - 1){
            onEndParams = function(){
                dojo.forEach(that._supportingWidgets, function(supportingWidget){
                    supportingWidget.destroyRecursive();
                });

            };
        }
        
        if(oArgs.to === (this.parentWidget.controllerWidget.getCurrentItems().length - 1)){
            //ENABLE MAGNIFYER
            var that = this;
            onEndParams = function(){
                if(that._supportingWidgets[0]){
                    //remove old magnifier image and instance
                    dojo.forEach(that._supportingWidgets, function(widgetInstance){widgetInstance.destroyRecursive();})
                    dojo.query(".magnifierContainer").forEach(function(node){dojo.destroy(node);});
                }

                var containerNode = dojo.create("div", {'class': 'magnifierContainer', style: {zIndex: 2500, right: rightParams.end + "px", top: topParams.end + "px", width: widthParams.end + "px", height: heightParams.end + "px", position: "absolute"}}, that.parentWidget.containerNode, "last");
                var newNode = dojo.create("img", {style: {display: "none"}}, containerNode, "first");
                dojo.setSelectable(containerNode);
                dojo.setSelectable(newNode);

                //dont instantiate the magnifier if we've already got one...
                    that.connect(newNode, "onload", function(evt){
                        dojo.attr(evt.target, "width", widthParams.end + "px");
                        dojo.attr(evt.target, "height", heightParams.end + "px");
                        dojo.attr(evt.target, {style: {position: "relative", left: "0px", top: "0px", display: "block"}});
                        that._supportingWidgets.push(new mediavitamin.ImageMagnifier({ scale:3, glassSize:200 },evt.target));
                        that.isMagnified = true;
                    });
                newNode.src = that.domNode.src;

                
            };
        }
        
        animation = dojo.animateProperty({
            node : this.domNode, 
            duration: this.animationDuration,
            properties: {
                right: rightParams,
                top: topParams,
                opacity: opacityParams,
                width: widthParams,
                height: heightParams,
                onBegin: onBeginParams,
                onEnd: onEndParams
            }
        });
        
        return animation;
        
    },
    
    destroyRecursive: function(){
        dojo.forEach(this._supportingWidgets, function(supportingWidget){
            supportingWidget.destroyRecursive();
        });
        this.inherited(arguments);
    }    
});