dojo.provide("mediavitamin.CarouselQueue");

dojo.declare("mediavitamin.CarouselQueue", null, {
    //summary: a pub/sub queue controller.
    
    constructor: function(oArgs){
        this.listeners = [];
        this.queue = {};
        this.controllerWidget = oArgs.controllerWidget;
    },
    
    addQueuesFromTopics: function(topics){
        dojo.forEach(topics, function(topic){this.addQueue(topic);}, this);
    },
    
    addQueue: function(topic) {
        //create an initial place for all pubsubs to go, even if there is nothing set up to listen/it is not yet set up	
        if (dojo.config.isDebug) {
            console.log("creating evt handler for: " + topic);
        }
        var queueitem = [];
        if(!this.queue[topic]){
            this.queue[topic] = [];            
        }

        this.listeners[topic] = dojo.subscribe(topic, this, function(message){
            queueitem.push(message);
            this.queue[topic].push(message);
            if (dojo.config.isDebug) {
                console.warn("i just came into the queue");
                console.warn(message);
                console.log("queue now contains:");
                console.log(this.queue[topic]);
            }
        });
    },

    _handleNewReadyMessage: function(message){
        var queueitem = [];
        queueitem.push(message);
        this.queue[this.controllerWidget.id + "/ready"].push(message);
        if (dojo.config.isDebug) {
            console.warn("i just came into the queue");
            console.warn(message);
            console.log("queue now contains:");
            console.log(this.queue[topic]);

        }
    },

    _getQueue: function(topic) {
        //tell each topic requester what has queued up
        return this.queue[topic];
    },

    _unsubscribeQueue: function(topic) {
        //unsubscribe the event handler from listening to the com channel
        if (dojo.config.isDebug) {
            console.debug("disconnecting handler.. queue contained:");
            console.debug("queue: " + this.queue[topic]);
            console.debug("listeners: " + this.listeners[topic]);
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
        if (queueItems[0]) {
            dojo.forEach(queueItems,
            function(queueItem) {
                oArgs.callback.call(oArgs.scope, queueItem);
            });
        }

        //remove old subscriptions as they wont be needed anymore
        this._unsubscribeQueue(oArgs.topic);

        //create new subscriber
        dojo.subscribe(this.id + "_" + oArgs.topic, oArgs.scope, oArgs.callback);

    }
});