dojo.provide("dojox.image.Carousel");

dojo.experimental("dojox.image.Carousel");
dojo.require("dojox.image._base");
dojo.require("dojo.fx");
dojo.require("dojox.fx");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dojo.store.JsonRest");
dojo.require("dojo.store.Memory");
dojo.require("dojo.string");


dojo.declare("dojox.image.Carousel", [dijit._Widget, dijit._Templated], {
    debuggingMode : true,

    //css3 selector to determine the child nodes which will be used
    childItemQuery: ">",

    //css3 selector to determine the child nodes which will be used
    childItemMetadataQuery: "[data-carousel-meta-type]",

    //RESOURCE INTENSIVE! monitor parent domNode and detect size changes
    //Full disclosure: useful when this widget is used within resizable domNodes
    //such as contentPanes, and other stuff which has the tendency to resize itself often.
    //todo: implement native dijit methods like resize and so to reduce performance hit if parent is a dijit widget which
    //calls these events on children
    monitorParent: true,

    //msec interval at which to probe paren't size
    monitorInterval: 50,

    //set with which to use as default one
    initialSet: null,

    //our template path...
    templateString: dojo.cache("dojox.image", "resources/Carousel.html"),

    dataStore: false,

    jsonUrl: false,



    _defaultSet: "defaultSet",
    _incrementalId: 0,


    constructor: function () {
    if(this.debuggingMode){console.debug("constructor");}
        this._incrementalIndexBySet = {};
        this.inherited(arguments);
    },

    startup: function () {
        if(this.debuggingMode){console.debug("startup");}
        //once the dom is parsed and the template is rendered, do something with it.
        if (this._started) {
            return;
        }
        this.inherited(arguments);
        this._setup();
        this._started = true;

    },

    getCurrentSet: function () {
        if(this.debuggingMode){console.debug("getCurrentSet");}
        //public function to return current name of set
        return (this._itemSetStoreQuery.setName);
    },

    getCurrentIndex: function () {
        if(this.debuggingMode){console.debug("getCurrentIndex");}
        //public function to return current item index
        return (this._currentIndex);
    },

    getCurrentItemDataItem: function () {
        if(this.debuggingMode){console.debug("getCurrentItemDataItem");}
        //public function to return info about the current item.
        return (this._currentItemDataItem);
    },


    getCurrentItems: function () {
        if(this.debuggingMode){console.debug("getCurrentItems");}
        //public function to return current items in the current set
        return (this._internalDataStore.query(this._itemSetStoreQuery));
    },

    getSets: function () {
        if(this.debuggingMode){console.debug("getSets");}
        //public function to return [] of available set names
        var items = [];
        dojo.forEach(this._internalDataStore.query(),
            function (item) {
                items.push(item.setName);
            });
        items.sort();
        var j = 0;
        var itemSets = [];
        var i;
        for (i = 0; i < items.length; i++) {
            itemSets[j] = items[i];
            j++;
            if ((i > 0) && (items[i] === items[i - 1])) {
                itemSets.pop();
                j--;
            }
        }
        return (itemSets);
    },

    getItemsBySet: function (setName) {
        if(this.debuggingMode){console.debug("getItemsBySet");}
        //public function to return all items within a specified set
        return (this._internalDataStore.query({
            setName: setName
        }));
    },

    getItemBySetAndIndex: function (setName, index) {
        if(this.debuggingMode){console.debug("getItemBySetAndIndex");}
        //public function to return an [] containing a specific item by index and set
        return this._internalDataStore.query({
            setName: setName,
            index: index
        });
    },

    getCurrentMetaData: function () {
        if(this.debuggingMode){console.debug("getCurrentMetaData");}
        //public function to return the metadata object for the current dataItem
        return (this._currentItemDataItem.metaData);
    },

    getItemDataItemByIndex: function (index) {
        if(this.debuggingMode){console.debug("getItemDataItemByIndex");}
        //returns a data item from the store by an index key query
        return this._internalDataStore.query(dojo.mixin({
            index: index
        },
        this._itemSetStoreQuery))[0];
    },

    useSet: function (oArgs) {
        if(this.debuggingMode){console.debug("useSet");}
        //public function to apply an items set.
        // 	oArgs:
        // 		setName : string. name of the itemSet
        //		indexStart: When autoshowing, show item at index specified
        // 		disableAutoShow: boolean. if true disables automatically showing the first item
        //		
        //do nothing if we're switching to the current set
        if ((this._itemSetStoreQuery) && (this._itemSetStoreQuery.setName === oArgs.setName)) {
            return;
        }

        oArgs.setName = oArgs.setName || this.defaultSet;

        this._itemSetStoreQuery = {
            setName: oArgs.setName
        };

        if (!oArgs.disableAutoShow) {
            this.showIndex(oArgs.indexStart || 1);
        }

        this.onItemSetChange();

    },

    addData: function (oArgs) {
        if(this.debuggingMode){console.debug("addData");}
        //Public function to add data to the widget.
        //oArgs: an object in the form of {node: domNode}, {store: "storeId"} or {url: "URL"}
        //DataItems will be added to the end of the list.
        if (oArgs.node) {
            this._addDataFromNode(oArgs.node);
        } else if (oArgs.store) {
            this._addDataFromStore(oArgs.store);
        } else if (oArgs.url) {
            this._addDataFromURL(oArgs.url);
        } else {
            console.error("No oArgs supplied. Please supply an url, a store id or a domNode.");
        }


    },

    showIndex: function (index) {
        if(this.debuggingMode){console.debug("showIndex");}
        //public function to show an item at index X
        // possibly rename to setIndex
        //todo: break this up, its batshit ugly and overbloated and unflexible and i fucking hate it.
        this._nextItemDataItem = this.getItemDataItemByIndex(index);
        var nextItemNode = dojo.byId(this._nextItemDataItem.itemNodeId);
        if (this._currentItemDataItem) {
            var currentItemNode = dojo.byId(this._currentItemDataItem.itemNodeId);
        }


        //don't do anything if we're requesting the same item as currently displayed
        if (this._currentItemDataItem && (this._currentItemDataItem === this._nextItemDataItem)) {
            return;
        }

        if (!this._nextItemDataItem.itemIsLoaded) {
            //not implemented yet: _loadItem
            }

        if (this._currentItemDataItem) {
            this._currentItemDataItem.active = false;
            this._putItemtoStore(this._currentItemDataItem);
        }


        if (currentItemNode) {
            dojo.style(nextItemNode, {
                display: "block",
                position: "absolute",
                left: 0,
                top: 0
            });
            dojo.style(currentItemNode, {
                opacity: 0,
                display: "none"
            });
            dojo.style(nextItemNode, {
                opacity: 1
            });
        } else {
            dojo.style(nextItemNode, {
                display: "block",
                position: "absolute",
                left: 0,
                top: 0,
                opacity: 1
            });
        }


        this._currentItemDataItem = this._nextItemDataItem;
        this._currentItemNode = nextItemNode;
        this._currentIndex = index;

        this._currentItemDataItem.active = true;
        this._putItemtoStore(this._currentItemDataItem);


        this._parentMarginBox = this._getParentMarginBox(this._parentNode);
        this._resizeItemNode(this._currentItemNode, this._parentMarginBox.h, this._parentMarginBox.w);

        this.onChange();

    },



    showNext: function () {
        if(this.debuggingMode){console.debug("showNext");}
        //public function to show next item	
        var newIndex = this._currentIndex + 1;
        if (this._internalDataStore.query(this._itemSetStoreQuery).length < newIndex) {
            return;
        }
        this.showIndex(newIndex);
    },

    showPrev: function () {
        if(this.debuggingMode){console.debug("showPrev");}
        //public function to show next item
        var newIndex = this._currentIndex - 1;
        if (newIndex < 1) {
            return;
        }
        this.showIndex(newIndex);
    },


    onChange: function () {
        if(this.debuggingMode){console.debug("onChange");}
        //public event
        },

    onParentSizeChange: function () {
        if(this.debuggingMode){console.debug("onParentSizeChange");}
        //public event
        },

    onItemSetChange: function () {
        if(this.debuggingMode){console.debug("onItemSetChange");}
        //public event
        },



    _setup: function () {
        if(this.debuggingMode){console.debug("_setup");}
        this._setupDOM();
        this._setupData();

    },


    _setupData: function () {
        if(this.debuggingMode){console.debug("_setupData");}
        this._internalDataStore = new dojo.store.Memory();

        if (this.containerNode.childNodes.length >= 1) {
            this.addData({
                node: this.containerNode
            });
        }

        if (this.dataStoreId) {
            this.addData({
                store: this.dataStoreId
            });
        }

        if (this.jsonUrl) {
            this.addData({
                url: this.jsonUrl
            });
        }

        //apply the dataset to be used and autoshow first item
        this.useSet({
            setName: this.initialSet || this._defaultSet
        });

    },


    _setupDOM: function () {
        if(this.debuggingMode){console.debug("_setupDOM");}
        this._parentNode = this.domNode;

        this._parentMarginBox = this._getParentMarginBox(this._parentNode);

        //Monitor the parent domnode's size. RESOURCE INTENSIVE!
        if (this.monitorParent) {
            this._startMonitoringParentNode();
        }

    },


    _addDataFromNode: function (sourceNode) {
        if(this.debuggingMode){console.debug("_addDataFromNode");}
        //private function to import data from a node.
        //it parses a passed node, finding all child items, copys them over to the cacheNode and extracts all the info it finds on them.
        dojo.query(this.childItemQuery, sourceNode).forEach(function (currentNode, index) {
            var assetNode = dojo.query(">", currentNode)[0];
            var currentID = this._createIncrementalId();
            var dataItem = {};
            var metaDataNodes = dojo.query(this.childItemMetadataQuery, currentNode);
            var setName = dojo.attr(currentNode, "data-carousel-set-name") || this._defaultSet;
            dojo.place(dojo.attr(assetNode, {
                "id": currentID,
                style: {
                    "opacity": "0",
                    "display": "none"
                }
            }), this.nodeCache, "last");

            this._addNewItemToStore(this._createDataItemFromNode({
                currentID: currentID,
                currentNode: assetNode,
                metaDataNodes: metaDataNodes,
                setName: setName
            }));

        },
        this);

        dojo.empty(sourceNode);

    },


    _createDataItemFromNode: function (oArgs) {
        if(this.debuggingMode){console.debug("_createDataItemFromNode");}
        //private function to generate a dataItem object from the DOM.
        //oArgs:
        //	currentID: current ID of node
        //	currentNode: current node of item
        //	metaDataNodes: nodes containing metdata
        //	setName: name of the item set
        var itemWidth;
        var itemHeight;
        //todo: this is ridicolously ugly. can it be made nicer? feedback anyone? sry i'm a deferred noob.

        var dataItem = {
            id: oArgs.currentID,
            setName: oArgs.setName,
            index: this._createIncrementalIndexBySet(oArgs.setName),
            itemSrc: this.getSourceForNode(oArgs.currentNode),
            itemWidth: itemWidth,
            itemHeight: itemHeight,
            itemIsLoaded: true,
            itemNodeId: oArgs.currentID,
            itemNode: oArgs.currentNode,
            metaData: {}
        };


        dojo.when(this.getWidthFromItem(oArgs.currentNode), function(w){dataItem.itemWidth = w;});
        dojo.when(this.getHeightFromItem(oArgs.currentNode), function(h){dataItem.itemHeight = h;});



        dojo.forEach(oArgs.metaDataNodes,
        function (metaDataNode, metaDataIndex) {
            var _keyName = dojo.attr(metaDataNode, "data-carousel-meta-type");
            dataItem.metaData[_keyName] = dojo.string.trim(metaDataNode.innerHTML);
        },
        this);
        console.debug(dojo.clone(dataItem));  //THIS BRTCH's .itemWidth && .itemHeight IS UNDEFINED. if i simply console.log(dataItem) it will be populated by the time i inspect it. 
        return dataItem;
    },
    
    getWidthFromItem: function (node){
        if(this.debuggingMode){console.debug("getWidthFromItem");}
        if (node.tagName == "IMG"){

            var def = new dojo.Deferred();

            var tempImage = new Image();
            var that = this;
            dojo.connect(tempImage, "onload", this,
            function () {
                var forceRender = tempImage.offsetHeight;
                var width = tempImage.width;
                delete tempImage;
                def.callback(width);
                });
            tempImage.src = node.src;
            return def;

        } else if (node.tagName == "VIDEO"){
            return dojo.attr(node, "width");
        }

    },

    getHeightFromItem: function (node){
        if(this.debuggingMode){console.debug("getHeightFromItem");}
        if (node.tagName == "IMG"){

            var def = new dojo.Deferred();

            var tempImage = new Image();
            var that = this;
            dojo.connect(tempImage, "onload", this,
            function () {
                var forceRender = tempImage.offsetHeight;
                var height = tempImage.height;
                delete tempImage;
                def.callback(height);
                });
            tempImage.src = node.src;
            return def;

        } else if (node.tagName == "VIDEO"){
            return dojo.attr(node, "height");
        }

    },


    getSourceForNode: function (node) {
        if(this.debuggingMode){console.debug("getSourceForNode");}
        //get the source for an item or for a video
        if (node.tagName == "IMG"){
            return node.src;
        } else if (node.tagName == "VIDEO"){
            var sources = [];
            dojo.query(">", node).forEach(function (subnode) {
                sources.push(subnode.src);
            },
            this);
            return sources;
        }
    },

    _createIncrementalId: function () {
        if(this.debuggingMode){console.debug("_createIncrementalId");}
        //private function to generate an incremental Id for itemnodes
        this._incrementalId = this._incrementalId + 1;
        return this.id + "_" + this._incrementalId;
    },

    _createIncrementalIndexBySet: function (setName) {
        if(this.debuggingMode){console.debug("_createIncrementalIndexBySet");}
        //private function to generate an incremental index for each set
        if (!this._incrementalIndexBySet[setName]) {
            this._incrementalIndexBySet[setName] = {};
            this._incrementalIndexBySet[setName].indexPos = 0;
        }
        this._incrementalIndexBySet[setName].indexPos = this._incrementalIndexBySet[setName].indexPos + 1;
        return this._incrementalIndexBySet[setName].indexPos;
    },

    _addDataFromStore: function (storeId) {
        if(this.debuggingMode){console.debug("_addDataFromStore");}
        //not implemented yet
        },

    _addDataFromURL: function (JSONurl) {
        if(this.debuggingMode){console.debug("_addDataFromURL");}
        //not implemented yet
        },


    _addNewItemToStore: function (item) {
        if(this.debuggingMode){console.debug("_addNewItemToStore");}
        //private function to add a single item to a store
        this._internalDataStore.add(item);
    },

    _putItemtoStore: function (item) {
        if(this.debuggingMode){console.debug("_putItemtoStore");}
        //private function to update a single item to a store
        this._internalDataStore.put(item);
    },

    _startMonitoringParentNode: function () {
        if(this.debuggingMode){console.debug("_startMonitoringParentNode");}
        //set up the domnode monitoring
        this._parentMarginBox = this._getParentMarginBox(this._parentNode);
        this._monitorTimer = setInterval(dojo.hitch(this, "_monitorParentNodeSize"), this.monitorInterval);
    },

    _getParentMarginBox: function (parentNode) {
        //get the parent node's marginbox
        if (parentNode === dojo.body()) {
            return dojo.window.getBox();
        } else {
            //we only need w/h, use optimized function for this.
            return dojo._getMarginSize(parentNode);
        }
    },

    _monitorParentNodeSize: function () {
        //monitors the size of a domnode, and if it changes it fires a callback function
        var currentSize = this._getParentMarginBox(this._parentNode);
        if ((this._parentMarginBox.w !== currentSize.w) || (this._parentMarginBox.h !== currentSize.h)) {
            this._onParentSizeChange();
        }
    },

    _onParentSizeChange: function () {
        if(this.debuggingMode){console.debug("_onParentSizeChange");}
        //private event to resize the item and fire the public event
        this.onParentSizeChange();
        this._parentMarginBox = this._getParentMarginBox(this._parentNode);
        this._resizeItemNode(this._currentItemNode, this._parentMarginBox.h, this._parentMarginBox.w);
    },

    _resizeItemNode: function (img, h, w) {
        if(this.debuggingMode){console.debug("_resizeItemNode");}
        console.debug("wtfwtfwtfwtfwtfwtfwtfwtfwtfwtfwtfwtfwtfwtfwtfwtfwtfwtfwtfwtfwtfwtfwtfwtfwtfwtfwtfwtfwtfwtfwtf");
        console.debug("current image size is reported at: " + this._currentItemDataItem.itemWidth + " , " +  this._currentItemDataItem.itemHeight);
        var itemWHRatio = this._currentItemDataItem.itemWidth / this._currentItemDataItem.itemHeight;
        if (itemWHRatio < w / h)
        {
            //width determines height
            dojo.attr(img, 'width', w);
            var newH = Math.ceil(w / itemWHRatio);
            dojo.attr(img, 'height', newH);
            img.style.marginTop = (h - newH) / 2 + 'px';
            img.style.marginLeft = 0;
        } else {
            //height determines size
            dojo.attr(img, 'height', h);
            var newW = Math.ceil(h * itemWHRatio);
            dojo.attr(img, 'width', newW);
            img.style.marginLeft = (w - newW) / 2 + 'px';
            img.style.marginTop = 0;
        }

    }

});

/*

{
    "items": [
    {
        "id": 1,
		"setName" : "setXXX",
		"index": 1,
		"itemSrc": "url",
		"itemIsLoaded": true,
		"itemWidth": 400,
		"itemHeight": 300,
		"itemNode": domNode,
        "itemType": "image" || "video",
		"itemNodeId": "domNodeID",
        "metaData": [{
            "name": "foo"
        },
        {
            "name": "foo"
        }
        ]
    },
	..{},..
    ]
}

dijit.byId("myCarousel").useSet({setName:"set1"})
dijit.byId("myCarousel").showNext()

*/

