dojo.provide("dojox.image.CarouselQueue");

dojo.declare("dojox.image.CarouselQueue", null, {
    //summary: a pub/sub queue controller.
    
    constructor: function(topics){
        //do something!
        this._createQueue(topics);
    },
    
    _createQueue: function(topics) {
        //create an initial place for all pubsubs to go, even if there is nothing set up to listen/it is not yet set up	
        dojo.forEach(topics,
        function(topic) {
            var shorttopic = topic.replace(this.id + "_", "");
            if (dojo.config.isDebug) {
                console.log("creating evt handler for: " + shorttopic);
            }
            var queueitem = [];
            var that = this;
            this.listeners[shorttopic] = dojo.subscribe(topic,
            function(message) {
                queueitem.push(message);
                that.queue[shorttopic] = queueitem;
                if (dojo.config.isDebug) {
                    console.log("i just came into the queue");
                    console.log(that.queue[shorttopic]);
                }
            });
        },
        this);
        if (dojo.config.isDebug) {
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
        if (dojo.config.isDebug) {
            console.debug(this.id + ": " + "disconnecting handler.. queue contained:");
            console.debug(this.id + ": " + this.queue);
            console.debug(this.id + ": " + this.listeners[topic]);
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
                oArgs.callback.call(oArgs.scope, queueItem);
            });
        }

        //remove old subscriptions as they wont be needed anymore
        this._unsubscribeQueue(oArgs.topic);

        //create new subscriber
        dojo.subscribe(this.id + "_" + oArgs.topic, oArgs.scope, oArgs.callback);

    }
});