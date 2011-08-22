dojo.provide("dojox.image.CarouselViewBase");

dojo.declare("dojox.image.CarouselViewBase", [], {
    
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
    
    _computeAssetsToBeLoaded: function(currentAssetDataItem){
        //compute a list of assets that will be loaded for any given state of a widget, starting from the current dataitem.
        //split the result between a required set, and an optional set. 
        //The required set is made of items that are going to be shown or that are flagged as required 
        //The optional set is made of items that will most likeley be shown next, based on the preload rule.
        //necessary parameters:
            //this.maxAmountOfItemsShown: int, how many items does this view display? fixme: would be nice to introduce positive-negative
            //this.preloadAssetIndexesOfCollection: [], required assets for each available collection [good for previews of sets et similia]
            //this.preloadAssetRange: int, how many images in its range should this image preload
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "_computeAssetsToBeLoaded");
        }
        var necessaryAssets = [];
        var optionalAssets = [];
        var currentCollection = currentAssetDataItem.collectionName;
        var availableCollections = this.controllerWidget.get("collections");
        var currentIndex = currentAssetDataItem.index;
        var adjacentIndices = [];
        var temporaryDataItem;
        var preloadRangeIndex;
        var highestIndexOfShownItem = currentIndex + this.maxAmountOfItemsShown;
        var i = 1;
        //add the current dataItem to the queue of necessary assets
        necessaryAssets.push(currentAssetDataItem);

        //add the other items that will be shown alongside with the main index to the queue of necessary assets
        
        necessaryAssets.push(currentAssetDataItem);
        temporaryDataItem = currentAssetDataItem;
        while(temporaryDataItem && (i <= this.maxAmountOfItemsShown)){
            temporaryDataItem = this.controllerWidget.getNextDataItemFromDataItem(temporaryDataItem);
            if(temporaryDataItem){
                necessaryAssets.push(temporaryDataItem);
            }
            i = i + 1;
        }

        //add the items of other collections specified in the initial requirement list to the list of necessary assets
        dojo.forEach(availableCollections, function(collectionName){
            //get all the dataItems for the preloadAssetIndexesOfCollection parameter
            dojo.forEach(this.preloadAssetIndexesOfCollection, function(index){
                necessaryAssets.push(this.controllerWidget.getItemByCollectionAndIndex(collectionName, index));
            }, this);
        }, this);

        //now add in the optional assets...

        //run the "preload asset range" in both a positive direction and in a negative direction
        temporaryDataItem = currentAssetDataItem;
        preloadRangeIndex = 0;
        while(temporaryDataItem && (preloadRangeIndex < this.preloadAssetRange)){
            temporaryDataItem = this.controllerWidget.getPreviousDataItemFromDataItem(temporaryDataItem);
            if(temporaryDataItem){
                optionalAssets.push(temporaryDataItem);
            }
            preloadRangeIndex = preloadRangeIndex + 1;
        }
        
        temporaryDataItem = currentAssetDataItem;
        preloadRangeIndex = 0;
        while(temporaryDataItem && (preloadRangeIndex < -this.preloadAssetRange)){
            temporaryDataItem = this.controllerWidget.getPreviousDataItemFromDataItem(temporaryDataItem);
            if(temporaryDataItem){
                optionalAssets.push(temporaryDataItem);
            }
            preloadRangeIndex = preloadRangeIndex - 1;
        }
        
        necessaryAssets = this.controllerWidget.returnUniqueItems(necessaryAssets);
        optionalAssets = this.controllerWidget.returnUniqueItems(optionalAssets);
                
        return {
            required: necessaryAssets,
            optional: optionalAssets
        };
    },

    _isHostType: function(object, property) {
        var NON_HOST_TYPES = {
            "boolean": 1,
            "number": 1,
            "string": 1,
            "undefined": 1
        };
        var type = typeof object[property];
        return type == 'object' ? !!object[property] : !NON_HOST_TYPES[type];
    },

    _determinePlayerType: function() {

        var video = document.createElement("video");
        var type = this._isHostType(video, "canPlayType");
        if (!type) {
            return "flash";
        }
        //Test ripped out of modernizr & has.js
        // note: in FF 3.5.1 and 3.5.0 only, "no" was a return value instead of empty string.
        //check if we REALLY can play html5 video. "maybie" is not enough evidently. I'm looking at YOU, IE9!!
        // Workaround required for IE9, which doesn't report video support without audio codec specified.
        //   bug 599718 @ msft connect
        if ((video.canPlayType('video/ogg; codecs="theora"') == "probably") || (video.canPlayType('video/mp4; codecs="avc1.42E01E"') == "probably") || (video.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"') == "probably") || (video.canPlayType('video/webm; codecs="vp8, vorbis"') == "probably")) {
            return "html5";
        }
        return "flash";

    },
    
    resizeAssetNodeByWidth: function(oArgs){
      //summary:
      //        Resize an asset by its width, leaving the height to be proportional to the original aspect ratio
      //        Does not center the asset, as it will simply scale the image without any clipping/cutting
      //oArgs:
      //        oArgs.node: domNode, node to be resized
      //        oArgs.assetWidth: int, original asset width
      //        oArgs.assetHeight: int, original asset height
      //        oArgs.targetWidth: int, target width size
      if (dojo.config.isDebug) {
          console.debug(this.id + ": " + "resizeAssetNodeByWidth");
      }

      var assetWHRatio = oArgs.assetWidth / oArgs.assetHeight;
            
      dojo.attr(oArgs.node, 'width', oArgs.targetWidth);
      dojo.style(oArgs.node, 'width', oArgs.targetWidth + "px");
      var newH = Math.ceil(oArgs.targetWidth * assetWHRatio);
      dojo.attr(oArgs.node, 'height', newH);
      dojo.style(oArgs.node, 'height', newH + "px");
      oArgs.node.style.marginLeft = 0;
      if (dojo.config.isDebug) {
          console.debug(this.id + ": " + oArgs.node);
          console.debug(this.id + ": " + "resized asset to: " + oArgs.targetWidth + " / " + newH);
      }

    },

    getResizedAssetSizeByWidth: function(oArgs){
        //same as above, but only returns a h/w tuple
        var assetWHRatio = oArgs.assetWidth / oArgs.assetHeight;
        var newH = Math.ceil(oArgs.targetWidth * assetWHRatio);
        
        return {width: oArgs.targetWidth, height: newH};
    },


    resizeAssetNodeByHeight: function(oArgs){
      //summary:
      //        Resize an asset by its height, leaving the width to be proportional to the original aspect ratio
      //        Does not center the asset, as it will simply scale the image without any clipping/cutting
      //oArgs:
      //        oArgs.node: domNode, node to be resized
      //        oArgs.assetWidth: int, original asset width
      //        oArgs.assetHeight: int, original asset height
      //        oArgs.targetHeight: int, target width size
      if (dojo.config.isDebug) {
          console.debug(this.id + ": " + "resizeAssetNodeByHeight");
      }
      var assetWHRatio = oArgs.assetWidth / oArgs.assetHeight;
      dojo.attr(oArgs.node, 'height', oArgs.targetHeight);
      dojo.style(oArgs.node, 'height', oArgs.targetHeight + "px");
      var newW = Math.ceil(oArgs.targetHeight * assetWHRatio);
      dojo.attr(oArgs.node, 'width', newW);
      dojo.style(oArgs.node, 'width', newW + "px");
      oArgs.node.style.marginTop = 0;
      if (dojo.config.isDebug) {
          console.debug(this.id + ": " + oArgs.node);
          console.debug(this.id + ": " + "resized asset to: " + newW + " / " + oArgs.targetHeight);
      }
    },

    getResizedAssetSizeByWidth: function(oArgs){
        //same as above, but only returns a w/h tuple
        var assetWHRatio = oArgs.assetWidth / oArgs.assetHeight;
        var newW = Math.ceil(oArgs.targetHeight * assetWHRatio);

        return {width: newW, height: oArgs.targetHeight};
    },

    resizeAssetNodeByTargetSize: function(oArgs) {
        //summary:  Resize an image or a video to a specific size while preserving the aspect ratio
        //          Centers the image based on a "best fit" approach for the specified target size
        //oArgs: {}
        //  oArgs.node = node to be resized
        //  oArgs.assetWidth = original asset width
        //  oArgs.assetHeight = original asset height
        //  oArgs.targetWidth = target width size
        //  oArgs.targetHeight = target height size

        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "resizeAssetNodeByTargetSize");
            console.debug(this.id + ": " + "current image size is reported at: " + oArgs.assetWidth + " , " + oArgs.assetHeight);
        }

        var itemWHRatio = oArgs.assetWidth / oArgs.assetHeight;

        if (itemWHRatio < oArgs.targetWidth / oArgs.targetHeight)
        {
            //width determines height
            dojo.attr(oArgs.node, 'width', oArgs.targetWidth);
            dojo.style(oArgs.node, 'width', oArgs.targetWidth + "px");
            var newH = Math.ceil(oArgs.targetWidth / itemWHRatio);
            dojo.attr(oArgs.node, 'height', newH);
            dojo.style(oArgs.node, 'height', newH + "px");
            oArgs.node.style.marginTop = (oArgs.targetHeight - newH) / 2 + 'px';
            oArgs.node.style.marginLeft = 0;
            if (dojo.config.isDebug) {
                console.debug(this.id + ": " + oArgs.node);
                console.debug(this.id + ": " + "resized asset to: " + oArgs.targetWidth + " / " + newH);
            }
        } else {
            //height determines size
            dojo.attr(oArgs.node, 'height', oArgs.targetHeight);
            dojo.style(oArgs.node, 'height', oArgs.targetHeight + "px");
            var newW = Math.ceil(h * itemWHRatio);
            dojo.attr(oArgs.node, 'width', newW);
            dojo.style(oArgs.node, 'width', newW + "px");
            oArgs.node.style.marginLeft = (oArgs.targetWidth - newW) / 2 + 'px';
            oArgs.node.style.marginTop = 0;
            if (dojo.config.isDebug) {
                console.debug(this.id + ": " + oArgs.node);
                console.debug(this.id + ": " + "resized asset to: " + newW + " / " + h);
            }
        }
    },
    
    getComputedZIndex: function(domNode){
        //summary: returns an integer corresponding to the z-index that the domnode is really at.
        var nodeZIndexValue = dojo.style(domNode, "zIndex");
        var body = dojo.body();
        if(nodeZIndexValue === "auto") {
            while((domNode !== body) && (nodeZIndexValue === "auto")){
                nodeZIndexValue = dojo.style(domNode, "zIndex");
                if(nodeZIndexValue === "auto"){
                    domNode = domNode.parentNode;    
                }
            }
            
            if(domNode === body){
                return 1;
            } else if(nodeZIndexValue !== "auto"){
                return (nodeZIndexValue * 1) + 1;
            }
            
        } else {
            return (nodeZIndexValue * 1);
        }
    }
    

});