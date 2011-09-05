dojo.require("dojox.image.MagnifierLite");
dojo.provide("mediavitamin.ImageMagnifier");

dojo.declare("mediavitamin.ImageMagnifier", [dojox.image.MagnifierLite], {
    _adjustScale: function(){
    	// summary: update the calculations should this.scale change
        //fixme: bunch of magic numbers!! mediavitamin
    	this.offset = dojo.coords(this.domNode, true);
        //since the new node gets placed in an absolute way and coords returns relative left/top properties, adjust this.
        this.offset.l = this.offset.x;
        this.offset.t = this.offset.y;

    	this._imageSize = { w: this.offset.w, h:this.offset.h };
    	this._zoomSize = {
    		w: this._imageSize.w * this.scale,
    		h: this._imageSize.h * this.scale
    	};
    }
});


