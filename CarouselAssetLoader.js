dojo.provide("dojox.image.CarouselAssetLoader");
dojo.require("dojo.store.Memory");
dojo.require("dojo.string");
dojo.declare("dojox.image.CarouselAssetLoader", [dijit._Widget], {
    /*        
    todo:
        split up the loading logic between population of the datastore with all the items and the generated metadata that require asset loading.
        between these two steps, determine which assets are to be loaded and prioritize the loading list between necessary and accessory.
        At store level, insert a deferred loading process in each item so we can keep track of inflight loading requests.
        The view widget then renders
    */  

    //css3 selector to determine the child nodes which will be used
    childItemQuery: ">",

    //css3 selector to determine the child nodes which will be used
    childItemMetadataQuery: "[data-carousel-meta-type]",

    //incremental ID for assets, is a progressive integer for now
    _incrementalId: 0,

    constructor: function(oArgs) {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "constructor");
        }
        //set controller widget for internal uses
        this.controllerWidget = oArgs.controllerWidget;
        //instantiate internal data store
        this.assetStore = new dojo.store.Memory();
        //store an incremental index for each item in a set
        this._incrementalIndexBySet = {};
    },

    addData: function(oArgs) {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "addData");
        }
        //Public function to add data to the widget.
        //Returns deferred object
        //Summary:
        //  Takes any passed valid data source, and processes all the Assets it contains through an appropiate method.
        //oArgs: an object in the form of {node: domNode}, {store: "storeId"} or {url: "URL"}
        //DataItems will be added to the end of the list.

        var listOfDeferredProcesses = [];
        var dataHasBeenAddedToStore;

        if (oArgs.node) {
            listOfDeferredProcesses.push(this._populateStoreFromNode(oArgs.node));
        } 

        if (oArgs.store) {
            listOfDeferredProcesses.push(this._populateStoreFromStore(oArgs.store));
        } 

        if (oArgs.url) {
            listOfDeferredProcesses.push(this._populateStoreFromURL(oArgs.url));
        }

        var dataHasBeenAddedToStore = new dojo.DeferredList(listOfDeferredProcesses);
        dataHasBeenAddedToStore.then(dojo.hitch(this, this.computeItemsToLoad));
    },

    _populateStoreFromNode: function(dataSourceNode) {
        //Process a domNode treating it as a data source and add all the found assets to the local memory store. Extract all the metadata from nodes that does not require async processes to be fired up.
        if(dojo.config.isDebug){
            console.debug(this.id + ": " + "_populateStoreFromNode");
        }
        var deferredItemLoader = new dojo.Deferred();
        
        dojo.query(this.childItemQuery, dataSourceNode).forEach(function(currentNode, index){
            var dataItem;
            var assetNode = dojo.query(">", currentNode)[0];
            var currentId = this._createIncrementalId();
            var setName = dojo.attr(currentNode, "data-carousel-set-name") || this.controllerWidget.defaultSet;
            var index = this._createIncrementalIndexBySet(setName);
            var setIndex = this._createIncrementalSetIndex();
            var allItemsDeferredList;


            dataItem = this._dataItemFactory({
                id: currentId,
                itemNodeId: currentId,
                setName: setName,
                index: index,
                setIndex: setIndex,
                itemSrc: this.getSourceForNode(assetNode),
                itemSrcType: this.getSourceTypeForNode(assetNode),
                itemType: assetNode.tagName.toLowerCase(),
                itemNode: assetNode,
                metaData: this._getMetaDataFromNode(assetNode.parentNode),
                itemWidth: dojo.attr(assetNode, "width"),
                itemHeight: dojo.attr(assetNode, "height")
            });

            //move the current node to the nodecache
            dojo.place(dojo.attr(assetNode, {
                "id": currentId,
                style: {
                    "opacity": "0",
                    "display": "none"
                }
            }), this.controllerWidget.nodeCache, "last");


            this._addNewItemToStore(dataItem);

        }, this);

        //once we've completed processing the items, mark this task as complete so to let the parent process continue on
        deferredItemLoader.resolve("IVELOADEDMYDATA!!!");
        dojo.empty(this.controllerWidget.containerNode);
        //return a resolved dojo.deferred instance
        return deferredItemLoader;
    },

    _dataItemFactory: function(oArgs){
        //create a data item object. This is a representation of an asset and its properties, be it image or video.
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "_dataItemFactory");
        }
        return {
            //sync stuff
            id: oArgs.id,
            itemNodeId: oArgs.id,
            setName: oArgs.setName,
            index: oArgs.index,
            setIndex: oArgs.setIndex,
            itemSrc: oArgs.itemSrc,
            itemSrcType: oArgs.itemSrcType,
            itemType: oArgs.itemType,
            itemNode: oArgs.itemNode,
            metaData: oArgs.metaData || null,
            //maybie async stuff
            itemWidth: oArgs.itemWidth || null,
            itemHeight: oArgs.itemHeight || null,
            //async styff
            itemIsLoaded: false,
            itemLoader: null
        };
    },

    _getMetaDataFromNode: function(node){
      //parse metadata from a domNode structure and return it as an object
        var metaDataNodes = dojo.query(this.childItemMetadataQuery, node);
        var metaData = {};
        dojo.forEach(metaDataNodes, function(metaDataNode, metaDataIndex) {
            var keyName = dojo.attr(metaDataNode, "data-carousel-meta-type");
            metaData[keyName] = dojo.string.trim(metaDataNode.innerHTML);
        }, this);
        return metaData;
    },

    computeItemsToLoad: function(){
        //start preloading and extracting additional metadata from nodes that are already loading because they are synchronous by nature [<img src="foo.jpg" />]
        //assume all assets are present in the store now.
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "computeItemsToLoad");
        }

        var assetsToLoad = this.assetStore.query({
            itemType: "img",
            itemSrcType: "sync" 
        });
        
        dojo.forEach(assetsToLoad, function(asset){
            this.loadAsset(asset);
        }, this);
    },

    loadAsset: function(assetDataItem){
        //load an asset and get its width/height properties, then add them to the store.
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "loadAsset " + assetDataItem);
        }
        if(assetDataItem.itemType.toLowerCase() === "img"){
            var tempImage = new Image();
            var itemWidth;
            var itemHeight;
            assetDataItem.itemLoader = new dojo.Deferred();
            //put now, so that we have an unresolved deferred if some other loader comes looking for it
            this._putItemtoStore(assetDataItem);

            dojo.connect(tempImage, "onload", this, function() {
                //fill in additional properties of the asset
                assetDataItem.itemWidth = tempImage.width;
                assetDataItem.itemHeight = tempImage.height;
                assetDataItem.itemIsLoaded = true;
                delete tempImage;
                //resolve the previously putted deferred
                assetDataItem.itemLoader.resolve("loaded");
                //and sync the final state
                this._putItemtoStore(assetDataItem);
            });
        //start loading the image now that we have something set up listening for the load event
        tempImage.src = assetDataItem.itemSrc;

        } else {
            //video or who knows what.. treat it all the same for now
        }

        return assetDataItem.itemLoader;
    },

    getSourceForNode: function(node) {
        //get the source attribute[s] for a given node
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getSourceForNode");
        }
        //get the source for an item or for a video
        if (node.tagName.toLowerCase() === "img") {
            if (dojo.attr(node, "src")) {
                return dojo.attr(node, "src");
            } else if (dojo.attr(node, "lazyLoadSrc")) {
                return dojo.attr(node, "lazyLoadSrc");
            } else {
                console.error("no source for image has been specified in the markup");
            }
        } else if (node.tagName.toLowerCase() === "video") {
            var sources = [];
            dojo.query(">", node).forEach(function(subnode) {
                if (dojo.attr(subnode, "src")) {
                    sources[dojo.attr(subnode, "type").split("/")[1]] = dojo.attr(subnode, "src");
                }
            },
            this);
            return sources;
        }
    },
    
    getSourceTypeForNode: function(node){
        //find out if the the src attribute we care about is sync or async
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getSourceTypeForNode");
        }
        if (node.tagName.toLowerCase() === "img"){
            if (dojo.attr(node, "src")) {
                return "sync";
            } else if (dojo.attr(node, "lazyLoadSrc")) {
                return "async";
            } else {
                console.error("no source for image has been specified in the markup");
            }
        } else if (node.tagName.toLowerCase() === "video"){
            //FIXME: don't really know how to hanldle HTML <video> "preloading". OK, we've got the "preload" attribute, but does it really pay off to have to sit there and wait for the whole video to load?
            return "async";
        }
    },

    //begin new functions foo///
    //fixme: not connected function, do we need this still?
    updatePreloadRange: function(){
        //check if we've got enough images loaded
        this.PreloadAssetRange = this.controllerWidget.get(PreloadAssetRange);
        this.PreloadAssetIndexesOfSet = this.controllerWidget.get(PreloadAssetIndexesOfSet);
        //determine what to load now
        this._toLoadOrNotToLoad();
    },
    //foo

    _createIncrementalId: function() {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "_createIncrementalId");
        }
        //private function to generate an incremental Id for itemnodes
        this._incrementalId = this._incrementalId + 1;
        return this.id + "_" + this._incrementalId;
    },

    _createIncrementalIndexBySet: function(setName) {
        //create an incremental id for each item within each set.
        //private function to generate an incremental index for each set
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "_createIncrementalIndexBySet");
        }
        if (!this._incrementalIndexBySet[setName]) {
            this._incrementalIndexBySet[setName] = {};
            this._incrementalIndexBySet[setName].indexPos = 0;
        }
        this._incrementalIndexBySet[setName].indexPos = this._incrementalIndexBySet[setName].indexPos + 1;
        return this._incrementalIndexBySet[setName].indexPos;
    },

    _createIncrementalSetIndex: function() {
        //create an incremental index for each set, allowing us to deal with asyncness issues
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "_createIncrementalSetIndex");
        }

        if (!this.setIndex) {
            this.setIndex = 0;
        }
        this.setIndex = this.setIndex + 1;
        return this.setIndex;
    },

    _addNewItemToStore: function(item) {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "_addNewItemToStore");
        }
        //private function to add a single item to a store
        this.assetStore.add(item);
    },

    _populateStore: function(items){
        dojo.forEach(items, function(){
            this._addNewItemToStore(item);
        }, this);
    },

    _putItemtoStore: function(item) {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "_putItemtoStore");
        }
        //private function to update a single item to a store
        this.assetStore.put(item);
    }
});