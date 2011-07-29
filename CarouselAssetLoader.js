dojo.provide("dojox.image.CarouselAssetLoader");

dojo.require("dojo.store.JsonRest");
dojo.require("dojo.store.Memory");

dojo.declare("dojox.image.CarouselAssetLoader", [dijit._Widget, dijit,_Templated], {

    //css3 selector to determine the child nodes which will be used
    childItemQuery: ">",

    //css3 selector to determine the child nodes which will be used
    childItemMetadataQuery: "[data-carousel-meta-type]",

    //incremental ID for assets, is a progressive integer for now
    _incrementalId: 0,


    constructor: function(controllerWidget) {
        //instantiate internal data store
        this.controllerWidget = controllerWidget;
        this.assetStore = new dojo.store.Memory();
    },

    addData: function(oArgs) {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "addData");
        }
        //Public function to add data to the widget.
        //Returns deferred object
        //oArgs: an object in the form of {node: domNode}, {store: "storeId"} or {url: "URL"}
        //DataItems will be added to the end of the list.
        var def = new dojo.Deferred();

        if (oArgs.node) {
            this._addDataFromNode(oArgs.node).then(function() {
                def.resolve();
            });
        } else if (oArgs.store) {
            this._addDataFromStore(oArgs.store).then(function() {
                def.resolve();
            });
        } else if (oArgs.url) {
            this._addDataFromURL(oArgs.url).then(function() {
                def.resolve();
            });
        } else {
            console.error("No oArgs supplied. Please supply an url, a store id or a domNode.");
        }

        return def;
    },
    
    updatePreloadRange: function(){
        //check if we've got enough images loaded
        this.PreloadAssetRange = this.controllerWidget.get(PreloadAssetRange);
        this.PreloadAssetIndexesOfSet = this.controllerWidget.get(PreloadAssetIndexesOfSet);
        //determine what to load now
        this._toLoadOrNotToLoad();
    },
    
    _toLoadOrNotToLoad: function(){
      //This is the question, where we determine if should load this asset now or if we should mark it as not loaded and postpone the bandwidth consumption
      //Base the decision on the load state, PreloadAssetRange and on PreloadAssetIndexesOfSet.
      //Return two arrays, one of necessary assets that must be loaded now, one of predictably needed assets that will possibly be needed soon.
      var necessaryAssets = [];
      var niceToHaveAssets = [];
      if(true){
//          this.assetWillBeLoaded
      }
      if(true){
//          this.assetWillBeLoaded
      }
      if(true){
//          this.assetWillBeLoaded
      }
      
    },
    
    _addDataFromNode: function(sourceNode) {
        //private function to import data from a node.
        //it parses a passed node, finding all child items, copys them over to the cacheNode and extracts all the info it finds on them.
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "_addDataFromNode");
        }
        var deferredItemLoader = new dojo.Deferred();

        dojo.query(this.childItemQuery, sourceNode).forEach(function(currentSubNode, index){
            var assetNode = dojo.query(">", currentNode)[0];
            var currentId = this._createIncrementalId();
            var metaDataNodes = dojo.query(this.childItemMetadataQuery, currentNode);
            var setName = dojo.attr(currentNode, "data-carousel-set-name") || this._defaultSet;
            //hitch this into the local scope, since this will be used by dojo.then [global scope]
            var hitched_addNewItemToStore = dojo.hitch(this, "_addNewItemToStore");
            var allItemsDeferredList;
            var listOfAllDeferredLoaders;
            var singleItemDeferred;
            
            
            //move the current node to the nodecache
            dojo.place(dojo.attr(assetNode, {
                "id": currentID,
                style: {
                    "opacity": "0",
                    "display": "none"
                }
            }), this.controllerWidget.nodeCache, "last");
            
            //create a deferred object that corresponds to the loader process of a single node, including the asset and its metadata structure
            singleItemDeferred = this._createDataItemFromNode({
                currentId: currentId,
                currentNode: assetNode,
                metaDataNodes: metaDataNodes,
                setName: setName
            }).then(function(res) {
                //we've just successfully loaded all the data from an asset, add it to the datastore now.
                hitched_addNewItemToStore(res);
            });

            //populate an array with all the single deferreds
            listOfAllDeferredLoaders.push(singleItemDeferred);
            
        }, this);
        
        //create a DeferredList with all the single deferreds, to be able to properly proceed once all processes are completed
        allItemsDeferred = new dojo.DeferredList(listOfAllDeferredLoaders).then(function() {
            dojo.empty(sourceNode);

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                            //INSERT PRELOADING LOGIC HERE, BEFORE THIS DEFERRED IS RESOLVED!!!\\
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

            //once we've completed all the processes, RESOLVE the dojo.deferred instance that gets returned by the function
            deferredItemLoader.resolve();
        });

        //return a dojo.deferred instance
        return deferredItemLoader;
    },

    _createDataItemFromNode: function(oArgs) {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "_createDataItemFromNode");
        }
        //private function to generate a dataItem object from the DOM.
        //oArgs:
        //	currentID: current ID of node
        //	currentNode: current node of item
        //	metaDataNodes: nodes containing metdata
        //	setName: name of the item set
        var itemLoaderdeferred = new dojo.Deferred();
        var defferredList = new dojo.DeferredList([this.getWidthFromItem(oArgs.currentNode), this.getHeightFromItem(oArgs.currentNode)]);
        var hitchedGetSourceForNode = dojo.hitch(this, "getSourceForNode", oArgs.currentNode);

        var index = this._createIncrementalIndexBySet(oArgs.setName);
        var setIndex = this._createIncrementalSetIndex();

        dojo.when(defferredList, function(results) {
            var dataItem = {
                id: oArgs.currentID,
                setName: oArgs.setName,
                index: index,
                setIndex: setIndex,
                itemSrc: hitchedGetSourceForNode(),
                itemWidth: results[0][1],
                itemHeight: results[1][1],
                itemType: oArgs.currentNode.tagName.toLowerCase(),
                itemIsLoaded: true,
                itemNodeId: oArgs.currentID,
                itemNode: oArgs.currentNode,
                metaData: {}
            };

            dojo.forEach(oArgs.metaDataNodes, function(metaDataNode, metaDataIndex) {
                var _keyName = dojo.attr(metaDataNode, "data-carousel-meta-type");
                dataItem.metaData[_keyName] = dojo.string.trim(metaDataNode.innerHTML);
            }, this);

            itemLoaderdeferred.resolve(dataItem);

        });
        return itemLoaderdeferred;

    },

    getWidthFromItem: function(node) {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getWidthFromItem");
        }
        var def = new dojo.Deferred();
        if (node.tagName === "IMG") {
            var tempImage = new Image();
            var that = this;

            dojo.connect(tempImage, "onload", this,
            function() {
                var width = tempImage.width;
                delete tempImage;
                def.resolve(width);
            });
            tempImage.src = node.src;

        } else if (node.tagName === "VIDEO" || node.tagName === "video") {
            def.resolve(dojo.attr(node, "width"));
        }

        return def;
    },

    getHeightFromItem: function(node) {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getHeightFromItem");
        }
        var def = new dojo.Deferred();
        if (node.tagName === "IMG") {

            var tempImage = new Image();
            dojo.connect(tempImage, "onload", this,
            function() {
                var height = tempImage.height;
                delete tempImage;
                def.resolve(height);
            });
            tempImage.src = node.src;

        } else if (node.tagName === "VIDEO" || node.tagName === "video") {
            def.resolve(dojo.attr(node, "height"));
        }

        return def;
    },


    getSourceForNode: function(node) {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "getSourceForNode");
        }
        //get the source for an item or for a video
        if (node.tagName === "IMG") {
            if (node.src) {
                return node.src;
            } else if (node.lazyLoadSrc) {
                return node.lazyLoadSrc;
            } else {
                console.error("no source for image has been specified in the markup");
            }
        } else if (node.tagName === "VIDEO" || node.tagName === "video") {
            var sources = [];
            dojo.query(">", node).forEach(function(subnode) {

                //ie hack:
                if (dojo.attr(subnode, "src")) {
                    sources[dojo.attr(subnode, "type").split("/")[1]] = dojo.attr(subnode, "src");
                }

            },
            this);
            return sources;
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

    _createIncrementalIndexBySet: function(setName) {
        //create an incremental id for each item within each set.
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "_createIncrementalIndexBySet");
        }
        //private function to generate an incremental index for each set
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

    _addDataFromStore: function(storeId) {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "_addDataFromStore");
        }
        //not implemented yet
    },

    _addDataFromURL: function(JSONurl) {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "_addDataFromURL");
        }
        //not implemented yet
    },


    _addNewItemToStore: function(item) {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "_addNewItemToStore");
        }
        //private function to add a single item to a store
        this.assetStore.add(item);
    },

    _putItemtoStore: function(item) {
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "_putItemtoStore");
        }
        //private function to update a single item to a store
        this.assetStore.put(item);
    }
});