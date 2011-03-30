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

    //css3 selector to determine the child nodes which will be used
    childImageQuery: "div.carouselImage img",

    //css3 selector to determine the child nodes which will be used
    childImageMetadataQuery: "[data-carousel-meta-type]",

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


    constructor: function() {
        this._incrementalIndexBySet = {};
        this.inherited(arguments);
    },

    startup: function() {
        //once the dom is parsed and the template is rendered, do something with it.
        if (this._started) {
            return;
        }
        this.inherited(arguments);
        this._setup();
        this._started = true;

    },

    getCurrentSet: function() {
        //public function to return current name of set
        return (this._imageSetStoreQuery.setName);
    },

    getCurrentIndex: function() {
        //public function to return current image index
        return (this._currentIndex);
    },

    getCurrentImageDataItem: function() {
        //public function to return info about the current image.
        return (this._currentImageDataItem);
    },


    getCurrentImages: function() {
        //public function to return current images in the current set
        return (this._internalDataStore.query(this._imageSetStoreQuery));
    },

    getSets: function() {
        //public function to return [] of available set names
        var items = [];
        dojo.forEach(this._internalDataStore.query(),
        function(item) {
            items.push(item.setName)
        });
        items.sort();
        var j = 0;
        var imageSets = [];
        for (var i = 0; i < items.length; i++) {
            imageSets[j] = items[i];
            j++;
            if ((i > 0) && (items[i] == items[i - 1])) {
                imageSets.pop();
                j--
            }
        }
        return (imageSets);
    },

    getImagesBySet: function(setName) {
        //public function to return all images within a specified set
        return (this._internalDataStore.query({
            setName: setName
        }));
    },

    getImageBySetAndIndex: function(setName, index) {
        //public function to return an [] containing a specific image by index and set
        return this._internalDataStore.query({
            setName: setName,
            index: index
        });
    },

    getCurrentMetaData: function() {
        //public function to return the metadata object for the current dataItem
        return (this._currentImageDataItem.metaData)
    },

    getImageDataItemByIndex: function(index) {
        //returns a data item from the store by an index key query
        return this._internalDataStore.query(dojo.mixin({
            index: index
        },
        this._imageSetStoreQuery))[0];
    },

    applyImageSet: function(oArgs) {
        //public function to apply an image set.
        //  oArgs:
        //      setName : string. name of the imageSet
        //      indexStart: When autoshowing, show image at index specified
        //      disableAutoShow: boolean. if true disables automatically showing the first image
        //
        //do nothing if we're switching to the current set
        if ((this._imageSetStoreQuery) && (this._imageSetStoreQuery.setName == oArgs.setName)) {
            return
        }

        oArgs.setName = oArgs.setName || this.defaultSet;

        this._imageSetStoreQuery = {
            setName: oArgs.setName
        };

        if (!oArgs.disableAutoShow) {
            this.showIndex(oArgs.indexStart || 1);
        }

        this.onImageSetChange();

    },

    addData: function(oArgs) {
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

    showIndex: function(index) {
        //public function to show an image at index X
        // possibly rename to setIndex
        //todo: break this up, its batshit ugly and overbloated and unflexible and i fucking hate it.
        this._nextImageDataItem = this.getImageDataItemByIndex(index);
        var nextImageNode = dojo.byId(this._nextImageDataItem.imageNodeId);
        if (this._currentImageDataItem) {
            var currentImageNode = dojo.byId(this._currentImageDataItem.imageNodeId);
        }


        //don't do anything if we're requesting the same image as currently displayed
        if (this._currentImageDataItem && (this._currentImageDataItem === this._nextImageDataItem)) {
            return;
        }

        if (!this._nextImageDataItem.imageIsLoaded) {
            //not implemented yet: _loadImage
            }

        if (this._currentImageDataItem) {
            this._currentImageDataItem.active = false;
            this._putItemtoStore(this._currentImageDataItem);
        }


        if (currentImageNode) {
            dojo.style(nextImageNode, {
                display: "block",
                position: "absolute",
                left: 0,
                top: 0
            });
            dojo.style(currentImageNode, {
                opacity: 0,
                display: "none"
            });
            dojo.style(nextImageNode, {
                opacity: 1
            });
        } else {
            dojo.style(nextImageNode, {
                display: "block",
                position: "absolute",
                left: 0,
                top: 0,
                opacity: 1
            });
        }


        this._currentImageDataItem = this._nextImageDataItem;
        this._currentImageNode = nextImageNode;
        this._currentIndex = index;

        this._currentImageDataItem.active = true;
        this._putItemtoStore(this._currentImageDataItem);



        if (!this._currentImageDataItem.imageWidth || !this._currentImageDataItem.imageHeight) {
            var tempImage = new Image();
            var that = this;
            dojo.connect(tempImage, "onload", this,
            function() {
                this._currentImageDataItem.imageWidth = tempImage.width;
                this._currentImageDataItem.imageHeight = tempImage.height;
                this._putItemtoStore(this._currentImageDataItem);
                this._parentMarginBox = this._getParentMarginBox(this._parentNode);
                this._resizeImageNode(this._currentImageNode, this._parentMarginBox.h, this._parentMarginBox.w);
            });
            tempImage.src = this._currentImageDataItem.imageSrc;

        } else {

            this._parentMarginBox = this._getParentMarginBox(this._parentNode);
            this._resizeImageNode(this._currentImageNode, this._parentMarginBox.h, this._parentMarginBox.w);

        }

        this.onChange();

    },



    showNext: function() {
        //public function to show next image	
        var newIndex = this._currentIndex + 1;
        if (this._internalDataStore.query(this._imageSetStoreQuery).length < newIndex) {
            return;
        }
        this.showIndex(newIndex);
    },

    showPrev: function() {
        //public function to show next image
        var newIndex = this._currentIndex - 1;
        if (newIndex < 1) {
            return;
        }
        this.showIndex(newIndex);
    },


    onChange: function() {
        //public event
        },

    onParentSizeChange: function() {
        //public event
        },

    onImageSetChange: function() {
        //public event
        },



    _setup: function() {
        this._setupData();
        this._setupDOM();
    },


    _setupData: function() {
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

        //apply the dataset to be used and autoshow first image
        this.applyImageSet({
            setName: this.initialSet || this._defaultSet
        });

    },


    _setupDOM: function() {
        this._parentNode = this.domNode;
        this._parentMarginBox = this._getParentMarginBox(this._parentNode);

        //Monitor the parent domnode's size. RESOURCE INTENSIVE!
        if (this.monitorParent) {
            this._startMonitoringParentNode();
        }

    },


    _addDataFromNode: function(sourceNode) {
        //private function to import data from a node.
        //it parses a passed node, finding all child images, copys them over to the cacheNode and extracts all the info it finds on them.
        dojo.query(this.childImageQuery, sourceNode).forEach(function(currentNode, index) {
            var currentID = this._createIncrementalId();
            var dataItem = {};
            var metaDataNodes = dojo.query(this.childImageMetadataQuery, currentNode.parentNode);
            var setName = dojo.attr(currentNode.parentNode, "data-carousel-set-name") || this._defaultSet;
            dojo.place(dojo.attr(currentNode, {
                "id": currentID,
                style: {
                    "opacity": "0",
                    "display": "none"
                }
            }), this.nodeCache, "last");
            this._addNewItemToStore(this._createDataItemFromNode({
                currentID: currentID,
                currentNode: currentNode,
                metaDataNodes: metaDataNodes,
                setName: setName
            }));

        },
        this);

        dojo.empty(sourceNode);

    },

    _createDataItemFromNode: function(oArgs) {
        //private function to generate a dataItem object from the DOM.
        //oArgs:
        //	currentID: current ID of node
        //	currentNode: current node of image
        //	metaDataNodes: nodes containing metdata
        //	setName: name of the image set
        var dataItem = {
            id: oArgs.currentID,
            setName: oArgs.setName,
            index: this._createIncrementalIndexBySet(oArgs.setName),
            imageSrc: oArgs.currentNode.src,
            imageIsLoaded: true,
            imageNodeId: oArgs.currentID,
            imageNode: oArgs.currentNode,
            metaData: {}
        };
        dojo.forEach(oArgs.metaDataNodes,
        function(metaDataNode, metaDataIndex) {
            var _keyName = dojo.attr(metaDataNode, "data-carousel-meta-type");
            dataItem.metaData[_keyName] = dojo.string.trim(metaDataNode.innerHTML);
        },
        this);

        return dataItem;
    },

    _createIncrementalId: function() {
        //private function to generate an incremental Id for imagenodes
        this._incrementalId = this._incrementalId + 1;
        return this.id + "_" + this._incrementalId;
    },

    _createIncrementalIndexBySet: function(setName) {
        //private function to generate an incremental index for each set
        if (!this._incrementalIndexBySet[setName]) {
            this._incrementalIndexBySet[setName] = {};
            this._incrementalIndexBySet[setName].indexPos = 0;
        }
        this._incrementalIndexBySet[setName].indexPos = this._incrementalIndexBySet[setName].indexPos + 1;
        return this._incrementalIndexBySet[setName].indexPos;
    },

    _addDataFromStore: function(storeId) {
        //not implemented yet
        },

    _addDataFromURL: function(JSONurl) {
        //not implemented yet
        },


    _addNewItemToStore: function(item) {
        //private function to add a single item to a store
        this._internalDataStore.add(item);
    },

    _putItemtoStore: function(item) {
        //private function to update a single item to a store
        this._internalDataStore.put(item);
    },

    _startMonitoringParentNode: function() {
        //set up the domnode monitoring
        this._parentMarginBox = this._getParentMarginBox(this._parentNode);
        this._monitorTimer = setInterval(dojo.hitch(this, "_monitorParentNodeSize"), this.monitorInterval);
    },

    _getParentMarginBox: function(parentNode) {
        //get the parent node's marginbox
        if (parentNode === dojo.body()) {
            return dojo.window.getBox();
        } else {
            //we only need w/h, use optimized function for this.
            return dojo._getMarginSize(parentNode);
        }
    },

    _monitorParentNodeSize: function() {
        //monitors the size of a domnode, and if it changes it fires a callback function
        var currentSize = this._getParentMarginBox(this._parentNode);
        if ((this._parentMarginBox.w !== currentSize.w) || (this._parentMarginBox.h !== currentSize.h)) {
            this._onParentSizeChange();
        }
    },

    _onParentSizeChange: function() {
        //private event to resize the image and fire the public event
        this.onParentSizeChange();
        this._parentMarginBox = this._getParentMarginBox(this._parentNode);
        this._resizeImageNode(this._currentImageNode, this._parentMarginBox.h, this._parentMarginBox.w);
    },

    _resizeImageNode: function(img, h, w) {
        var imageWHRatio = this._currentImageDataItem.imageWidth / this._currentImageDataItem.imageHeight;
        if (imageWHRatio < w / h)
        {
            //width determines height
            dojo.attr(img, 'width', w);
            var newH = Math.ceil(w / imageWHRatio);
            dojo.attr(img, 'height', newH);
            img.style.marginTop = (h - newH) / 2 + 'px';
            img.style.marginLeft = 0;
        } else {
            //height determines size
            dojo.attr(img, 'height', h);
            var newW = Math.ceil(h * imageWHRatio);
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
		"imageSrc": "url",
		"imageIsLoaded": true,
		"imageWidth": 400,
		"imageHeight": 300,
		"imageNode": domNode,
		"imageNodeId": "domNodeID",
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

dijit.byId("myCarousel").applyImageSet({setName:"set1"})
dijit.byId("myCarousel").showNext()

*/
