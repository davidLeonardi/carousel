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
dojo.require("dojo.DeferredList");
dojo.require("dojox.av.FLVideo");

//notes: to use the camen "video for everyone" approach, and have support for the VIDEO tag on ie<9, you MUST use the html 5 shim:
// document.createElement("video");
//BEFORE the browser encounters a video tag. This means that you REALLY should place the above line right after the opening of your body tag.

dojo.declare("dojox.image.Carousel", [dijit._Widget, dijit._Templated], {
    debuggingMode: true,

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


    constructor: function() {
        if (this.debuggingMode) {
            console.debug("constructor");
        }
        this._incrementalIndexBySet = {};
        this.queue = [];
        this.listeners = [];
        this._listenerTopics = ["ready"];
        this.inherited(arguments);
    },

    startup: function() {
        if (this.debuggingMode) {
            console.debug("startup");
        }
        if (this._started) {
            return;
        }
        dojo.forEach(this._listenerTopics,
        function(topic, index) {
            this._listenerTopics[index] = this.id + "_" + topic;
        }, this);
        this.inherited(arguments);
        this._setup();
        this._started = true;

    },

    getCurrentSet: function() {
        if (this.debuggingMode) {
            console.debug("getCurrentSet");
        }
        //public function to return current name of set
        return (this._itemSetStoreQuery.setName);
    },

    getCurrentIndex: function() {
        if (this.debuggingMode) {
            console.debug("getCurrentIndex");
        }
        //public function to return current item index
        return (this._currentIndex);
    },

    getCurrentItemDataItem: function() {
        if (this.debuggingMode) {
            console.debug("getCurrentItemDataItem");
        }
        //public function to return info about the current item.
        return (this._currentItemDataItem);
    },


    getCurrentItems: function() {
        if (this.debuggingMode) {
            console.debug("getCurrentItems");
        }
        //public function to return current items in the current set
        return (this._internalDataStore.query(this._itemSetStoreQuery, {sort:[{attribute:"index"}]}));
    },

    getSets: function() {
        if (this.debuggingMode) {
            console.debug("getSets");
        }
        //public function to return [] of available set names
        var items = [];
        dojo.forEach(this._internalDataStore.query(),
        function(item) {
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

    getItemsBySet: function(setName) {
        if (this.debuggingMode) {
            console.debug("getItemsBySet");
        }
        //public function to return all items within a specified set
        return (this._internalDataStore.query({
            setName: setName
        }, {sort:[{attribute:"index"}]}));
    },

    getItemBySetAndIndex: function(setName, index) {
        if (this.debuggingMode) {
            console.debug("getItemBySetAndIndex");
        }
        //public function to return an [] containing a specific item by index and set
        return this._internalDataStore.query({
            setName: setName,
            index: index
        });
    },

    getCurrentMetaData: function() {
        if (this.debuggingMode) {
            console.debug("getCurrentMetaData");
        }
        //public function to return the metadata object for the current dataItem
        return (this._currentItemDataItem.metaData);
    },

    getItemDataItemByIndex: function(index) {
        if (this.debuggingMode) {
            console.debug("getItemDataItemByIndex");
        }
        //returns a data item from the store by an index key query
        return this._internalDataStore.query(dojo.mixin({
            index: index
        },
        this._itemSetStoreQuery))[0];
    },

    useSet: function(oArgs) {
        if (this.debuggingMode) {
            console.debug("useSet");
        }
        //public function to apply an items set.
        //  oArgs:
        //      setName : string. name of the itemSet
        //      indexStart: When autoshowing, show item at index specified
        //      disableAutoShow: boolean. if true disables automatically showing the first item
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

    addData: function(oArgs) {
        if (this.debuggingMode) {
            console.debug("addData");
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
                        this._addDataFromStore(oArgs.store).then(function(){def.resolve();});
            } else if (oArgs.url) {
                        this._addDataFromURL(oArgs.url).then(function(){def.resolve();});
            } else {
            console.error("No oArgs supplied. Please supply an url, a store id or a domNode.");
        }

        return def;

    },

    showIndex: function(index) {
        if (this.debuggingMode) {
            console.debug("showIndex");
        }
        //public function to show an item at index X
        // possibly rename to setIndex
        //todo: break this up, its batshit ugly and overbloated and unflexible and i fucking hate it.
        this._nextItemDataItem = this.getItemDataItemByIndex(index);
        //if we have no next data item we are most probably in the state where we are starting with a bogus | default image set, silently ignore this and don't throw any errors about it.
        if (!this._nextItemDataItem) {
            return;
        }
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
            dojox.fx.crossFade({nodes:[currentItemNode, nextItemNode], duration:1000, onEnd: function(){
                dojo.style(currentItemNode, "display", "none");
            if(this._playerType == "flash"){
                this._currentItemDataItem.playerInstance.destroy();
            }
            }}).play();
            
/*            dojo.style(currentItemNode, {
                opacity: 0,
                display: "none"
            });
            dojo.style(nextItemNode, {
                opacity: 1
            });
*/        } else {
            dojo.style(nextItemNode, {
                display: "block",
                position: "absolute",
                left: 0,
                top: 0,
                opacity: 1
            });
        }


        this._currentItemDataItem = this._nextItemDataItem;

        if((nextItemNode.tagName == "video") || (nextItemNode.tagName == "VIDEO")){
            if(this._playerType == "html5"){
                this._currentItemNode = nextItemNode;
                this._currentItemDataItem.playerInstance = this._currentItemNode;
            } else {
                this._currentItemNode = dojo.create("div",{}, nextItemNode, "first");
                this._currentItemDataItem.playerInstance = new dojox.av.FLVideo({mediaUrl:this._currentItemDataItem.itemSrc["flv"]}, this._currentItemNode);
            }
        } else {
                this._currentItemNode = nextItemNode;
        }

        this._currentIndex = index;

        this._currentItemDataItem.active = true;
        this._putItemtoStore(this._currentItemDataItem);


        this._parentMarginBox = this._getParentMarginBox(this._parentNode);
        this._resizeItemNode(this._currentItemNode, this._parentMarginBox.h, this._parentMarginBox.w);

        this.onChange();

    },



    showNext: function() {
        if (this.debuggingMode) {
            console.debug("showNext");
        }
        //public function to show next item	
        var newIndex = this._currentIndex + 1;
        if (this._internalDataStore.query(this._itemSetStoreQuery).length < newIndex) {
            return;
        }
        this.showIndex(newIndex);
    },

    showPrev: function() {
        if (this.debuggingMode) {
            console.debug("showPrev");
        }
        //public function to show next item
        var newIndex = this._currentIndex - 1;
        if (newIndex < 1) {
            return;
        }
        this.showIndex(newIndex);
    },


    onChange: function() {
        if (this.debuggingMode) {
            console.debug("onChange");
        }
        //public event
    },

    onParentSizeChange: function() {
        if (this.debuggingMode) {
            console.debug("onParentSizeChange");
        }
        //public event
    },

    onItemSetChange: function() {
        if (this.debuggingMode) {
            console.debug("onItemSetChange");
        }
        //public event
    },


    _setup: function() {
        if (this.debuggingMode) {
            console.debug("_setup");
        }
        var defList = [];
        var hitchedMonitorParent;

        //Start up the event queue manager
        this._createQueue(this._listenerTopics);

        this._parentNode = this.domNode;

        this._parentMarginBox = this._getParentMarginBox(this._parentNode);

        this._playerType = this._determinePlayerType();

        //Monitor the parent domnode's size. RESOURCE INTENSIVE!
        if (this.monitorParent) {
            hitchedMonitorParent = dojo.hitch(this, "_startMonitoringParentNode");
        }


        //instantiate internal data store
        this._internalDataStore = new dojo.store.Memory();


        //if we have children domnodes treat them as data sources and parse them
        if (this.containerNode.childNodes.length >= 1) {
            defList.push(this.addData({
                node: this.containerNode
            }));
        }

        /*        //ditto if we received a datasore id
        if (this.dataStoreId) {
            defList.push(this.addData({
                store: this.dataStoreId
            }));
        }

        //or a json
        if (this.jsonUrl) {
            defList.push(this.addData({
                url: this.jsonUrl
            }));
        }
*/

        //we've got lots of async processes. Lets leverage on deferredLists to manage this in a decent way.
        var deferreds = new dojo.DeferredList(defList);

        var setArgs = this.initialSet || this._defaultSet;
        var hitchedUseSet = dojo.hitch(this, "useSet", {
            setName: setArgs
        });
        var hitchedSetStarted = dojo.hitch(this, "_setStarted");
        var widgetId = this.id;
        deferreds.then(function() {
            hitchedSetStarted();
            if (this.debuggingMode) {
                console.debug("Done adding dataitems. Showing something now.");
            }
            //apply the dataset to be used and autoshow first item
            hitchedUseSet();
            if (hitchedMonitorParent) {
                hitchedMonitorParent();
            }
            dojo.publish(widgetId + "_ready", [{
                ready: "ready"
            }]);

        });
    },
    
    _isHostType: function(object, property){
        var NON_HOST_TYPES = { "boolean": 1, "number": 1, "string": 1, "undefined": 1 };
        var type = typeof object[property];
        return type == 'object' ? !!object[property] : !NON_HOST_TYPES[type];
    },

    _determinePlayerType: function(){

        var video = document.createElement("video");
        var type = this._isHostType(video, "canPlayType");
        // note: in FF 3.5.1 and 3.5.0 only, "no" was a return value instead of empty string.
        console.debug(type);
        return type ? "html5" : "flash";

    },


    _createQueue: function(topics) {
        //create an initial place for all pubsubs to go, even if there is nothing set up to listen/it is not yet set up	
        dojo.forEach(topics,
        function(topic) {
            var shorttopic = topic.replace(this.id + "_", "");
            if (this.debuggingMode) {
                console.log("creating evt handler for: " + shorttopic);
            }
            var queueitem = [];
            var that = this;
            this.listeners[shorttopic] = dojo.subscribe(topic,
            function(message) {
                queueitem.push(message);
                that.queue[shorttopic] = queueitem;
                if (this.debuggingMode) {
                    console.log("i just came into the queue");
                    console.log(that.queue[shorttopic]);
                }
            });
        },
        this);
        if (this.debuggingMode) {
            console.log("queue now contains:");
            console.log(this.queue);
        }
    },

    _getQueue: function(topic) {
        //tell each topic requester what has queued up
        return this.queue[topic];
    },


    _unsubscribeQueue: function(topic) {
        //unsubscribe the event handler from listening to the com channel
        if (this.debuggingMode) {
            console.debug("disconnecting handler.. queue contained:");
            console.debug(this.queue);
            console.debug(this.listeners[topic]);
        }
        dojo.unsubscribe(this.listeners[topic]);
        this.queue[topic] = undefined;
    },

    subscribeQueue: function(oArgs) {
        //public method to connect to an event queue
        //oArgs
        //  topic: string, topic name for this widget to take over queue
        //  callback: callback function to pass to dojo.subscribe for queue items
        //  scope: scope to execute the callback in
        //  ignoreOlder : boolean, process only the LAST queue event
        var queueItems = [];
        if (oArgs.ignoreOlder) {
            queueItems.push(this.queue[oArgs.topic][this.queue[oArgs.topic].length - 1]);
        } else {
            queueItems = this.queue[oArgs.topic];
        }

        //do we have anything in the queue? if so, use the passed callback on it.
        if (queueItems) {
            dojo.forEach(queueItems,
            function(queueItem) {
                var hitched = dojo.hitch(oArgs.scope, oArgs.callback, queueItem);
                hitched();
            },
            this);
        }

        //remove old subscriptions as they wont be needed anymore
        this._unsubscribeQueue(oArgs.topic);

        //create new subscriber
        dojo.subscribe(this.id + "_" + oArgs.topic, oArgs.callback);


    },


    _setStarted: function() {
        this.started = true;
    },

    isStarted: function() {
        return this.started || false;
    },

    _addDataFromNode: function(sourceNode) {
        if (this.debuggingMode) {
            console.debug("_addDataFromNode");
        }
        //private function to import data from a node.
        //it parses a passed node, finding all child items, copys them over to the cacheNode and extracts all the info it finds on them.
        var def = new dojo.Deferred();
        var deferreds = [];
        var deferredsList;

        dojo.query(this.childItemQuery, sourceNode).forEach(function(currentNode, index) {
            var assetNode = dojo.query(">", currentNode)[0];
            var currentID = this._createIncrementalId();
            var metaDataNodes = dojo.query(this.childItemMetadataQuery, currentNode);
            var setName = dojo.attr(currentNode, "data-carousel-set-name") || this._defaultSet;
            var hitched_createDataItemFromNode = dojo.hitch(this, "_createDataItemFromNode", {
                currentID: currentID,
                currentNode: assetNode,
                metaDataNodes: metaDataNodes,
                setName: setName
            });
            var hitched_addNewItemToStore = dojo.hitch(this, "_addNewItemToStore");

            dojo.place(dojo.attr(assetNode, {
                "id": currentID,
                style: {
                    "opacity": "0",
                    "display": "none"
                }
            }), this.nodeCache, "last");


            deferreds.push(hitched_createDataItemFromNode().then(function(res) {
                hitched_addNewItemToStore(res);
            }));

        }, this);

        deferredsList = new dojo.DeferredList(deferreds).then(function() {
            dojo.empty(sourceNode);
            def.resolve();
        });
        return def;

    },


    _createDataItemFromNode: function(oArgs) {
        if (this.debuggingMode) {
            console.debug("_createDataItemFromNode");
        }
        //private function to generate a dataItem object from the DOM.
        //oArgs:
        //	currentID: current ID of node
        //	currentNode: current node of item
        //	metaDataNodes: nodes containing metdata
        //	setName: name of the item set
        var def = new dojo.Deferred();
        var deferreds = new dojo.DeferredList([this.getWidthFromItem(oArgs.currentNode), this.getHeightFromItem(oArgs.currentNode)]);
        var hitched_createIncrementalIndexBySet = dojo.hitch(this, "_createIncrementalIndexBySet", oArgs.setName);
        var hitchedGetSourceForNode = dojo.hitch(this, "getSourceForNode", oArgs.currentNode);
        var index = hitched_createIncrementalIndexBySet();
        dojo.when(deferreds,
        function(results) {
            var dataItem = {
                id: oArgs.currentID,
                setName: oArgs.setName,
                index: index,
                itemSrc: hitchedGetSourceForNode(),
                itemWidth: results[0][1],
                itemHeight: results[1][1],
                itemType: oArgs.currentNode.tagName.toLowerCase(),
                itemIsLoaded: true,
                itemNodeId: oArgs.currentID,
                itemNode: oArgs.currentNode,
                metaData: {}
            };
            dojo.forEach(oArgs.metaDataNodes,
            function(metaDataNode, metaDataIndex) {
                var _keyName = dojo.attr(metaDataNode, "data-carousel-meta-type");
                dataItem.metaData[_keyName] = dojo.string.trim(metaDataNode.innerHTML);
            },
            this);

            def.resolve(dataItem);



        });
        return def;

    },

    getWidthFromItem: function(node) {
        if (this.debuggingMode) {
            console.debug("getWidthFromItem");
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
        if (this.debuggingMode) {
            console.debug("getHeightFromItem");
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
        //ie has an interesting flaw where it sees textnodes everywhere... omg, it's ghosts!
        if (this.debuggingMode) {
            console.debug("getSourceForNode");
        }
        //get the source for an item or for a video
        if (node.tagName === "IMG") {
            return node.src;
        } else if (node.tagName === "VIDEO" || node.tagName === "video") {
            var sources = [];
            dojo.query(">", node).forEach(function(subnode) {
                
            //ie hack: 
            if(dojo.attr(subnode, "src")){
                sources[dojo.attr(subnode, "type").split("/")[1]] = dojo.attr(subnode, "src");    
            }

            },
            this);
            return sources;
        }
    },

    _createIncrementalId: function() {
        if (this.debuggingMode) {
            console.debug("_createIncrementalId");
        }
        //private function to generate an incremental Id for itemnodes
        this._incrementalId = this._incrementalId + 1;
        return this.id + "_" + this._incrementalId;
    },

    _createIncrementalIndexBySet: function(setName) {
        if (this.debuggingMode) {
            console.debug("_createIncrementalIndexBySet");
        }
        //private function to generate an incremental index for each set
        if (!this._incrementalIndexBySet[setName]) {
            this._incrementalIndexBySet[setName] = {};
            this._incrementalIndexBySet[setName].indexPos = 0;
        }
        this._incrementalIndexBySet[setName].indexPos = this._incrementalIndexBySet[setName].indexPos + 1;
        return this._incrementalIndexBySet[setName].indexPos;
    },

    _addDataFromStore: function(storeId) {
        if (this.debuggingMode) {
            console.debug("_addDataFromStore");
        }
        //not implemented yet
    },

    _addDataFromURL: function(JSONurl) {
        if (this.debuggingMode) {
            console.debug("_addDataFromURL");
        }
        //not implemented yet
    },


    _addNewItemToStore: function(item) {
        if (this.debuggingMode) {
            console.debug("_addNewItemToStore");
        }
        //private function to add a single item to a store
        this._internalDataStore.add(item);
    },

    _putItemtoStore: function(item) {
        if (this.debuggingMode) {
            console.debug("_putItemtoStore");
        }
        //private function to update a single item to a store
        this._internalDataStore.put(item);
    },

    _startMonitoringParentNode: function() {
        if (this.debuggingMode) {
            console.debug("_startMonitoringParentNode");
        }
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
//            if(this.id == "statementsCarousel"){console.debug(dojo._getMarginSize(parentNode))}
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
        if (this.debuggingMode) {
            console.debug("_onParentSizeChange");
        }
        //private event to resize the item and fire the public event
        this.onParentSizeChange();
        this._parentMarginBox = this._getParentMarginBox(this._parentNode);
        this._resizeItemNode(this._currentItemNode, this._parentMarginBox.h, this._parentMarginBox.w);
    },

    _resizeItemNode: function(container, h, w) {
        if (this.debuggingMode) {
            console.debug("_resizeItemNode");
        }

        console.debug("current image size is reported at: " + this._currentItemDataItem.itemWidth + " , " + this._currentItemDataItem.itemHeight);
        var itemWHRatio = this._currentItemDataItem.itemWidth / this._currentItemDataItem.itemHeight;
        if (itemWHRatio < w / h)
        {
            //width determines height
            dojo.attr(container, 'width', w);
            dojo.style(container, 'width', w + "px");
            var newH = Math.ceil(w / itemWHRatio);
            dojo.attr(container, 'height', newH);
            dojo.style(container, 'height', newH + "px");
            container.style.marginTop = (h - newH) / 2 + 'px';
            container.style.marginLeft = 0;
            console.debug(container);
            console.debug("resized asset to: " + w + " / " + newH);
        } else {
            //height determines size
            dojo.attr(container, 'height', h);
            dojo.style(container, 'height', h + "px");
            var newW = Math.ceil(h * itemWHRatio);
            dojo.attr(container, 'width', newW);
            dojo.style(container, 'width', newW + "px");
            container.style.marginLeft = (w - newW) / 2 + 'px';
            container.style.marginTop = 0;
            console.debug(container);
            console.debug("resized asset to: " + newW + " / " + h);
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
		"itemSrc": {type:url},
		"itemIsLoaded": true,
		"itemWidth": 400,
		"itemHeight": 300,
		"itemNode": domNode,
        "playerInstance" : {},
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
