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

    //maximum amount of connections per hostname per browser we want to use. We play nice, so we leave at least one connection available.
    //All other browsers have 6 connections per host, so we'll use 5 by default.
    _maxConnectionsPerHostIE: {
        6: 1,
        7: 1,
        8: 5,
        9: 5
    },

    constructor: function(oArgs) {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "constructor");
        }
        //set controller widget for internal uses
        this.controllerWidget = oArgs.controllerWidget;
        //instantiate internal data store
        this.assetStore = new dojo.store.Memory();
        //store an incremental index for each item in a collection
        this._incrementalIndexByCollection = {};
        if(dojo.isIE){
            this.maxConnections = this._maxConnectionsPerHostIE[dojo.isIE];
        } else {
            this.maxConnections = 5;
        }
        this.currentLoadProcesses = [];
        this.postponedLoadProcesses = [];

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
            var collectionName = dojo.attr(currentNode, "data-carousel-collection-name") || this.controllerWidget.defaultCollection;
            var index = this._createIncrementalIndexByCollection(collectionName);
            var uniqueIndex = this._createIncrementalUniqueIndex();
            var allItemsDeferredList;


            dataItem = this._dataItemFactory({
                id: currentId,
                itemNodeId: currentId,
                collectionName: collectionName,
                index: index,
                uniqueIndex: uniqueIndex,
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
            collectionName: oArgs.collectionName,
            index: oArgs.index,
            uniqueIndex: oArgs.uniqueIndex,
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
            this.addToLoadQueue(asset);
        }, this);
    },

	addToLoadQueue: function(assetDataItem, isRequired){
		//add a load request to the loading queue. The loader will start up as many loader processes at the same time as the maximum connection per host setting allows.

        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "addToLoadQueue");
        }
        console.debug(assetDataItem.index);
        //if we've already loaded the asset previously, return the already resolved deferred and stop.
        //if the asset is currently loading, return the loader instance and move on
        if(assetDataItem.isLoaded == true || assetDataItem.isLoaded == "loading"){return assetDataItem.itemLoader;}

		var currentQueueLength = this.getLengthOfObject(this.currentLoadProcesses);

		if(!assetDataItem.itemLoader){
            assetDataItem.itemLoader = new dojo.Deferred();		    
		}
		
		//add to the loader queue or add to the postponed queue?
		if(currentQueueLength < this.maxConnections) {
			//add to the loader queue
			this.currentLoadProcesses[assetDataItem.id] = assetDataItem.itemLoader;
			//set the callback when the loader completes
			assetDataItem.itemLoader.then(dojo.hitch(this, "handleLoaderQueueItemDone", assetDataItem));

			//load the asset now
            console.debug(assetDataItem);
			this.loadAsset(assetDataItem);
		} else {
			//add to the postponed queue
			this.postponedLoadProcesses.push({assetDataItem: assetDataItem, isRequired: isRequired});
			console.warn("queue was full, postponing " + assetDataItem.id);
		}

        //put to store now, so that we have an unresolved deferred if some other loader comes looking for it
        this._putItemtoStore(assetDataItem);

		return assetDataItem.itemLoader;
	},

	handleLoaderQueueItemDone: function(assetDataItem){
		//event handler for when an item in the loader queue completes.
		//here we remove the loader object from the queue, and insert the first item we find in the prioritized postponed queue into the loader queue.
		delete this.currentLoadProcesses[assetDataItem.id];
        var postponedItem = {};
		if(this.postponedLoadProcesses.length > 0){
			console.warn("getting item from queue");

			this.postponedLoadProcesses = this.prioritizeQueue(this.postponedLoadProcesses);
            postponedItem = this.postponedLoadProcesses.shift();
			this.addToLoadQueue(postponedItem.assetDataItem, postponedItem.isRequired);
		}
	},

    prioritizeQueue: function(queue){
        //check if we have a dataItem flagged as "required" in the postponed list. 
        //if we do, move it to the beginning and leave the order of other elements untouched
        var result = [];
        var i;
        
        for (i = 0; i < queue.length; i++) {
          if (queue[i].isRequired === true) {
            result.push(queue[i]);
          }
        }
        for (i = 0; i < queue.length; i++) {
          if (!queue[i].isRequired === true) {
            result.push(queue[i]);
          }
        }  
        return result;
    },

    loadAsset: function(assetDataItem){
        //load an asset and get its width/height properties, then add them to the store.
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "loading asset: " + assetDataItem.id);
        }

        if(assetDataItem.itemType.toLowerCase() === "img"){
            var tempImage = new Image();
            var itemWidth;
            var itemHeight;
            //the image exists and gets loaded successfully
            //fixme: disconnect later as it will end up with a bunch of stale connects
            dojo.connect(tempImage, "onload", this, function() {
                //fill in additional properties of the asset
                assetDataItem.itemWidth = tempImage.width;
                assetDataItem.itemHeight = tempImage.height;
                assetDataItem.itemIsLoaded = true;
                delete tempImage;
                //resolve the deferred
                console.debug("loaded id: " + assetDataItem.id);
                assetDataItem.itemLoader.resolve("loaded");
                
                //If the item is lazy load, or has no src attribute, set the SRC attribute
                if(!dojo.attr(assetDataItem.itemNode, "src")){
                    dojo.attr(assetDataItem.itemNode, "src", assetDataItem.itemSrc);
                } 
                //and sync the final state
                this._putItemtoStore(assetDataItem);
            });
            
            //the image doesnt exist or some other error occurs: replace the image with a placeholder 404 image
            dojo.connect(tempImage, "onerror", this, function(evt) {
                delete tempImage;
                console.error(evt);
                assetDataItem.itemWidth = 320;
                assetDataItem.itemHeight = 240;
                assetDataItem.itemSrc = dojo.moduleUrl("dojox.image").path + "resources/images/404.png";
                assetDataItem.itemLoader.resolve("notFound");
                //If the item is lazy load, or has no src attribute, set the SRC attribute
                if(dojo.attr(!assetDataItem.itemNode, "src")){
                    dojo.attr(assetDataItem.itemNode, "src", assetDataItem.itemSrc);
                } 

                this._putItemtoStore(assetDataItem);
            });
            
        //start loading the image now that we have something set up listening for the load event
        tempImage.src = assetDataItem.itemSrc;
        assetDataItem.isLoaded = "loading";
        this._putItemtoStore(assetDataItem);
        console.debug("setting source to: " + assetDataItem.itemSrc);

        } else {
            //video or who knows what.. treat it all the same for now
            assetDataItem.itemLoader = new dojo.Deferred();
            assetDataItem.itemIsLoaded = true;
            assetDataItem.itemLoader.resolve("loaded");
            this._putItemtoStore(assetDataItem);
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

    _createIncrementalId: function() {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "_createIncrementalId");
        }
        //private function to generate an incremental Id for itemnodes
        this._incrementalId = this._incrementalId + 1;
        return this.id + "_" + this._incrementalId;
    },

    _createIncrementalIndexByCollection: function(collectionName) {
        //create an incremental id for each item within each collection.
        //private function to generate an incremental index for each collection
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "_createIncrementalIndexByCollection");
        }
        if (!this._incrementalIndexByCollection[collectionName]) {
            this._incrementalIndexByCollection[collectionName] = {};
            this._incrementalIndexByCollection[collectionName].indexPos = 0;
        }
        this._incrementalIndexByCollection[collectionName].indexPos = this._incrementalIndexByCollection[collectionName].indexPos + 1;
        return this._incrementalIndexByCollection[collectionName].indexPos;
    },

    _createIncrementalUniqueIndex: function() {
        //create an incremental index for each item, allows us to uniqueley track items throughout all processes
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "_createIncrementalUniqueIndex");
        }

        if (!this.uniqueIndex) {
            this.uniqueIndex = 0;
        }
        this.uniqueIndex = this.uniqueIndex + 1;
        return this.uniqueIndex;
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
            console.debug(this.id + ": " + "_putItemtoStore: " + item.id);
        }
        //private function to update a single item to a store
        this.assetStore.put(item);
    },

	getLengthOfObject: function(object) {
		//utility function to return the length of an object. 
		var itemLength = 0;
		for (key in object) {
			itemLength = itemLength + 1;
		}
		return itemLength;
	}
});