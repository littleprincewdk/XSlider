/**
 * Created by wudengke on 2017/3/2.
 */
/*
 * jquery.mousewheel.js
 */
(function (factory) {
    if ( typeof define === 'function' && define.amd ) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        // Node/CommonJS style for Browserify
        module.exports = factory;
    } else {
        // Browser globals
        factory(jQuery);
    }
}(function ($) {

    var toFix  = ['wheel', 'mousewheel', 'DOMMouseScroll', 'MozMousePixelScroll'],
        toBind = ( 'onwheel' in document || document.documentMode >= 9 ) ?
            ['wheel'] : ['mousewheel', 'DomMouseScroll', 'MozMousePixelScroll'],
        slice  = Array.prototype.slice,
        nullLowestDeltaTimeout, lowestDelta;

    if ( $.event.fixHooks ) {
        for ( var i = toFix.length; i; ) {
            $.event.fixHooks[ toFix[--i] ] = $.event.mouseHooks;
        }
    }

    var special = $.event.special.mousewheel = {
        version: '3.1.9',

        setup: function() {
            if ( this.addEventListener ) {
                for ( var i = toBind.length; i; ) {
                    this.addEventListener( toBind[--i], handler, false );
                }
            } else {
                this.onmousewheel = handler;
            }
            // Store the line height and page height for this particular element
            $.data(this, 'mousewheel-line-height', special.getLineHeight(this));
            $.data(this, 'mousewheel-page-height', special.getPageHeight(this));
        },

        teardown: function() {
            if ( this.removeEventListener ) {
                for ( var i = toBind.length; i; ) {
                    this.removeEventListener( toBind[--i], handler, false );
                }
            } else {
                this.onmousewheel = null;
            }
        },

        getLineHeight: function(elem) {
            return parseInt($(elem)['offsetParent' in $.fn ? 'offsetParent' : 'parent']().css('fontSize'), 10);
        },

        getPageHeight: function(elem) {
            return $(elem).height();
        },

        settings: {
            adjustOldDeltas: true
        }
    };

    $.fn.extend({
        mousewheel: function(fn) {
            return fn ? this.bind('mousewheel', fn) : this.trigger('mousewheel');
        },

        unmousewheel: function(fn) {
            return this.unbind('mousewheel', fn);
        }
    });


    function handler(event) {
        var orgEvent   = event || window.event,
            args       = slice.call(arguments, 1),
            delta      = 0,
            deltaX     = 0,
            deltaY     = 0,
            absDelta   = 0;
        event = $.event.fix(orgEvent);
        event.type = 'mousewheel';

        // Old school scrollwheel delta
        if ( 'detail'      in orgEvent ) { deltaY = orgEvent.detail * -1;      }
        if ( 'wheelDelta'  in orgEvent ) { deltaY = orgEvent.wheelDelta;       }
        if ( 'wheelDeltaY' in orgEvent ) { deltaY = orgEvent.wheelDeltaY;      }
        if ( 'wheelDeltaX' in orgEvent ) { deltaX = orgEvent.wheelDeltaX * -1; }

        // Firefox < 17 horizontal scrolling related to DOMMouseScroll event
        if ( 'axis' in orgEvent && orgEvent.axis === orgEvent.HORIZONTAL_AXIS ) {
            deltaX = deltaY * -1;
            deltaY = 0;
        }

        // Set delta to be deltaY or deltaX if deltaY is 0 for backwards compatabilitiy
        delta = deltaY === 0 ? deltaX : deltaY;

        // New school wheel delta (wheel event)
        if ( 'deltaY' in orgEvent ) {
            deltaY = orgEvent.deltaY * -1;
            delta  = deltaY;
        }
        if ( 'deltaX' in orgEvent ) {
            deltaX = orgEvent.deltaX;
            if ( deltaY === 0 ) { delta  = deltaX * -1; }
        }

        // No change actually happened, no reason to go any further
        if ( deltaY === 0 && deltaX === 0 ) { return; }

        // Need to convert lines and pages to pixels if we aren't already in pixels
        // There are three delta modes:
        //   * deltaMode 0 is by pixels, nothing to do
        //   * deltaMode 1 is by lines
        //   * deltaMode 2 is by pages
        if ( orgEvent.deltaMode === 1 ) {
            var lineHeight = $.data(this, 'mousewheel-line-height');
            delta  *= lineHeight;
            deltaY *= lineHeight;
            deltaX *= lineHeight;
        } else if ( orgEvent.deltaMode === 2 ) {
            var pageHeight = $.data(this, 'mousewheel-page-height');
            delta  *= pageHeight;
            deltaY *= pageHeight;
            deltaX *= pageHeight;
        }

        // Store lowest absolute delta to normalize the delta values
        absDelta = Math.max( Math.abs(deltaY), Math.abs(deltaX) );

        if ( !lowestDelta || absDelta < lowestDelta ) {
            lowestDelta = absDelta;

            // Adjust older deltas if necessary
            if ( shouldAdjustOldDeltas(orgEvent, absDelta) ) {
                lowestDelta /= 40;
            }
        }

        // Adjust older deltas if necessary
        if ( shouldAdjustOldDeltas(orgEvent, absDelta) ) {
            // Divide all the things by 40!
            delta  /= 40;
            deltaX /= 40;
            deltaY /= 40;
        }

        // Get a whole, normalized value for the deltas
        delta  = Math[ delta  >= 1 ? 'floor' : 'ceil' ](delta  / lowestDelta);
        deltaX = Math[ deltaX >= 1 ? 'floor' : 'ceil' ](deltaX / lowestDelta);
        deltaY = Math[ deltaY >= 1 ? 'floor' : 'ceil' ](deltaY / lowestDelta);

        // Add information to the event object
        event.deltaX = deltaX;
        event.deltaY = deltaY;
        event.deltaFactor = lowestDelta;
        // Go ahead and set deltaMode to 0 since we converted to pixels
        // Although this is a little odd since we overwrite the deltaX/Y
        // properties with normalized deltas.
        event.deltaMode = 0;

        // Add event and delta to the front of the arguments
        args.unshift(event, delta, deltaX, deltaY);

        // Clearout lowestDelta after sometime to better
        // handle multiple device types that give different
        // a different lowestDelta
        // Ex: trackpad = 3 and mouse wheel = 120
        if (nullLowestDeltaTimeout) { clearTimeout(nullLowestDeltaTimeout); }
        nullLowestDeltaTimeout = setTimeout(nullLowestDelta, 200);

        return ($.event.dispatch || $.event.handle).apply(this, args);
    }

    function nullLowestDelta() {
        lowestDelta = null;
    }

    function shouldAdjustOldDeltas(orgEvent, absDelta) {
        // If this is an older event and the delta is divisable by 120,
        // then we are assuming that the browser is treating this as an
        // older mouse wheel event and that we should divide the deltas
        // by 40 to try and get a more usable deltaFactor.
        // Side note, this actually impacts the reported scroll distance
        // in older browsers and can cause scrolling to be slower than native.
        // Turn this off by setting $.event.special.mousewheel.settings.adjustOldDeltas to false.
        return special.settings.adjustOldDeltas && orgEvent.type === 'mousewheel' && absDelta % 120 === 0;
    }

}));
/*
 * XSlider
 *
 */
$(function(){
    function XSlider(dom,settings){
        this.defaults={
            initPage:1,
            duration:300,
            flick:{
                duration:300,
                distance:20
            },
            //自动播放
            autoPlay:false,
            autoPlayInterval:5000,
            //控制方式
            btnMode:false,
            mouseMode:true,
            touchMode:false,
            mouseWheelMode:false,
            indicatorMode:false,
            //指示器
            indicatorTheme:"dot",
            indicatorPos:"bottom",
            //UI
            horizontalMode:true,

            //特效
            switchingOff:true,//页面切换过程中控制无效
            verticalVis:0.3,
            horizontalVis:0.3,
            loopMode:false,
            infinite:false,
            //切换动画
            switchMode:{
                effect:"slide",
                easing:"swing"
            }
        };
        this.settings=$.extend(true,this.defaults,settings);
        this.$Wrapper=$(dom);
        this.$Slider=this.$Wrapper.children(".XSlider-slider");
        this.$Items=this.$Slider.children(".XSlider-item");
        this.itemNum=this.$Items.length;
        this.$Btns=this.$Wrapper.children(".XSlider-btn").children();
        this.$Indicator=this.$Wrapper.children(".XSlider-indicator");
        this.$IndicatorItems=this.$Indicator.children(".XSlider-indicator-item");
        this.curPage=0;
        this.newPage=1;
        this.pageWidth=this.$Slider.width();
        this.pageHeight=this.$Slider.height();
        this._normalizeSettings();
        this._initDom();
        this._init();
        this._initEvents();
    }

    XSlider.prototype={
        _normalizeSettings:function(){
            if(this.$Wrapper.length==0) throw("XSlider:no dom!!!");
            if(this.itemNum==0) throw("XSlider:no item!!!");

            this.easing=[
                "linear","swing","easeInQuad","easeOutQuad",'easeInOutQuad',
                "easeInCubic","easeOutCubic","easeInOutCubic","easeInQuart","easeOutQuart",
                "easeInOutQuart","easeInQuint","easeOutQuint","easeInOutQuint","easeInExpo",
                "easeOutExpo","easeInOutExpo","easeInSine","easeOutSine","easeInOutSine",
                "easeInCirc","easeOutCirc","easeInOutCirc","easeInElastic","easeOutElastic",
                "easeInOutElastic","easeInBack","easeOutBack","easeInOutBack","easeInBounce",
                "easeOutBounce","easeInOutBounce"
            ];
            this.indicatorTheme=["dot","rect","slider"];
            this.indicatorPos=["bottom","right","left","top","right-bottom","left-bottom"];

            this.settings.autoPlay=!!this.settings.autoPlay;
            this.settings.btnMode=!!this.settings.btnMode;
            this.settings.mouseMode=!!this.settings.mouseMode;
            this.settings.touchMode=!!this.settings.touchMode;
            this.settings.mouseWheelMode=!!this.settings.mouseWheelMode;
            this.settings.indicatorMode=!!this.settings.indicatorMode;
            this.settings.horizontalMode=!!this.settings.horizontalMode;
            this.settings.switchOff=!!this.settings.switchOff;
            this.settings.loopMode=!!this.settings.loopMode;
            this.settings.infinite=!!this.settings.infinite;

            this.$Btns.length<2&&(this.settings.btnMode=false);
            if(this.settings.indicatorMode){
                this.$IndicatorItems.length<this.itemNum&&(this.settings.indicatorMode=false,console.warn("XSlider:the number of indicator is wrong"));
            }
            if(this.settings.indicatorMode)
                this.settings.indicatorPos=$.inArray(this.settings.indicatorPos,this.indicatorPos)>-1?this.settings.indicatorPos
                    :(this.settings.horizontalMode?"bottom":"right");
            this.settings.indicatorTheme=$.inArray(this.settings.indicatorTheme,this.indicatorTheme)>-1?this.settings.indicatorTheme:"dot";
            this.settings.duration=parseInt(this.settings.duration);
            this.settings.flick.duration=parseInt(this.settings.flick.duration);
            this.settings.flick.distance=parseInt(this.settings.flick.distance);
            this.settings.autoPlayInterval=parseInt(this.settings.autoPlayInterval);
            this.settings.horizontalVis=this.settings.horizontalVis?this.settings.horizontalVis:0;
            this.settings.verticalVis=this.settings.verticalVis?this.settings.verticalVis:0;
            this.settings.initPage=parseInt(this.settings.initPage);
            this.settings.switchMode.easing=$.inArray(this.settings.switchMode.easing,this.easing)>-1?
                this.settings.switchMode.easing:"swing";
            this.settings.infinite?(this.settings.loopMode=true):"";
        },
        _initDom:function(){
            this.$Wrapper.addClass(this.settings.horizontalMode?"horizontal":"vertical");

            if(this.settings.indicatorMode){
                this.$Indicator.addClass(this.settings.indicatorTheme);
                if(this.settings.indicatorTheme=="slider"){
                    this.$IndicatorSlider=$('<div class="XSlider-indicator-slider"></div>').appendTo(this.$Indicator);
                }
            }
            if(this.settings.switchMode.effect=="fade"){
                this.$Items.css({
                    "display":"none",
                    "position":"absolute",
                    "z-index":99
                });
                return;
            }
            if(this.settings.horizontalMode){
                this.$Slider.css("width",this.itemNum*100+"%");
                this.$Items.css({
                    "width":1/this.itemNum*100+"%",
                    "float":"left"
                });
            }else{
                this.$Slider.css("height",this.itemNum*100+"%");
                this.$Items.css({
                    "height":1/this.itemNum*100+"%",
                    top:"-"+this.pageHeight+"px"
                });
            }
        },
        _init:function(){
            this.x=0;
            this.y=0;
            this.startX=0;
            this.startY=0;
            this.deltaX=0;
            this.deltaY=0;
            this.initPosition={x:0,y:0};
            this.startTime=0;
            this.moving=false;
            this.switching=false;
            this.verticalMove=false;
            this.hasConfirmDirection=false;

            this._locateIndicator();

            this.go(this.settings.initPage);

            if(this.settings.autoPlay){
                this._autoPlay();
            }
            if(this.settings.infinite){
                this._back();
                $(this.$Items.get(this.itemNum-1)).prependTo(this.$Slider);
            }
        },
        _initEvents:function(){
            if(this.settings.mouseMode){
                this._initMouseEvent();
            }
            if(this.settings.touchMode){
                this._initTouchEvent();
            }
            if(this.settings.btnMode){
                this._initBtnEvent();
            }else{
                this.$Btns.parent().hide();
            }
            if(this.settings.indicatorMode){
                this._initIndicatorEvent();
            }else{
                this.$IndicatorItems.parent().hide();
            }
            if(this.settings.mouseWheelMode){
                this._initMouseWheelEvent();
            }
            this._initResizeEvent();
            //自定义事件
            this.on("switchstart.XSlider",function(e,oldPage,newPage){
                this.switching=true;
                if(this.$IndicatorSlider){
                    this.$IndicatorSlider.css("left",(newPage-1)*35);
                }
            }.bind(this)).on("switchend.XSlider",function(e,oldPage,newPage){
                this.switching=false;
                if(this.settings.autoPlay){
                    this._autoPlay();
                }
            }.bind(this)).on("flick.XSlider",function(){

            }.bind(this));
        },
        _initBtnEvent:function(){
            $(this.$Btns[0]).on("click.XSlider",function(e){
                if(!this.settings.switchingOff||!this.switching){
                    this.prev();
                }
                return false;
            }.bind(this));
            $(this.$Btns[1]).on("click.XSlider",function(e){
                if(!this.settings.switchingOff||!this.switching) {
                    this.next();
                }
                return false;
            }.bind(this));
        },
        _initIndicatorEvent:function(){
            this.$IndicatorItems.each(function(i,ele){
                $(ele).on("click.XSlider",function(){
                    if(!this.settings.switchingOff||!this.switching) {
                        this.go(i + 1);
                    }
                }.bind(this))
            }.bind(this))
        },
        _locateIndicator:function(resize){
            resize=resize||false;
            switch(this.settings.indicatorPos){
                case "bottom":
                    this.$Indicator.css({
                        //此时indicator.width()等于一个的宽度
                        "left":(this.$Wrapper.width()-this.$Indicator.width()*(resize?1:this.itemNum))/2
                    }).addClass("bottom");
                    break;
                case "right":
                    this.$Indicator.css({
                        "top":(this.$Wrapper.height()-this.$Indicator.height())/2
                    }).addClass("right");
                    break;
                case "left":
                    this.$Indicator.css({
                        "top":(this.$Wrapper.height()-this.$Indicator.height())/2
                    }).addClass("left");
                    break;
                case "top":
                    this.$Indicator.css({
                        "left":(this.$Wrapper.width()-this.$Indicator.width()*(resize?1:this.itemNum))/2
                    }).addClass("top");
                    break;
                case "right-bottom":
                case "left-bottom":
                    this.$Indicator.addClass(this.settings.indicatorPos);
                    break;
            }
            this.$Indicator.show();
        },
        _initMouseEvent:function(){
            this.$Wrapper
                .on("mousedown.XSlider",this._start.bind(this))
                .on("mousemove.XSlider",this._move.bind(this))
                .on("mouseup.XSlider",this._end.bind(this))
                .on("mouseleave.XSlider",this._end.bind(this));
        },
        _initTouchEvent:function(){
            this.$Wrapper[0].addEventListener("touchstart",this._start.bind(this),false);
            this.$Wrapper[0].addEventListener("touchmove",this._move.bind(this),false);
            this.$Wrapper[0].addEventListener("touchend",this._end.bind(this),false);
            this.$Wrapper[0].addEventListener("touchleave",this._end.bind(this),false);
            this.$Wrapper[0].addEventListener("touchenter",function(e){
                console.log("enter")
            }.bind(this),false);
        },
        _initMouseWheelEvent:function(){
            this.$Wrapper.on("mousewheel.XSlider",function(e){
                if(!this.settings.switchingOff||!this.switching){
                    clearInterval(this.autoPlayTimer);
                    this.autoPlayTimer=undefined;
                    this.go(this.curPage-e.deltaY);
                }
            }.bind(this));
        },
        _initResizeEvent:function(){
            $(window).on('resize',function(){
                this.resize();
            }.bind(this))
        },
        _calcDelta:function(e){
            this.deltaX=e.clientX-this.startX;this.deltaY=e.clientY-this.startY;
            if(this.settings.horizontalMode){
                if(!this.verticalMove){
                    if(this.x>=0&&this.deltaX>0||this.x<=-(this.itemNum-1)*this.pageWidth&&this.deltaX<0){
                        this.deltaX*=this.settings.horizontalVis;
                    }
                    this.deltaY=0;
                }else{
                    this.deltaX=0;
                    this.deltaY*=this.settings.verticalVis;
                }
            }else{
                if(!this.verticalMove){
                    this.deltaX*=this.settings.horizontalVis;
                    this.deltaY=0;
                }else{
                    if(this.y>=0&&this.deltaY>0||this.y<=-(this.itemNum-1)*this.pageHeight&&this.deltaY<0){
                        this.deltaY*=this.settings.verticalVis;
                    }
                    this.deltaX=0;
                }
            }

        },
        _start:function(e){
            if(e.target.getAttribute("class")&&e.target.getAttribute("class").indexOf("XSlider-btn")>-1){
                return;
            }
            if(!this.settings.switchingOff||!this.switching){
                if(this.settings.autoPlay){
                    clearInterval(this.autoPlayTimer);
                    this.autoPlayTimer=undefined;
                }
                if (e.type.indexOf("touch") > -1) {
                    e = e.touches[0]||e.changedTouches[0];
                }
                this.startX=e.clientX;
                this.startY=e.clientY;
                this.moving=true;
                this.initPosition=this.getPosition();
                this.verticalMove=true;
                this.hasConfirmDirection=false;
                this.startTime=$.now();
            }
        },
        _move:function(e){
            if(!this.settings.switchingOff||!this.switching) {
                if (this.moving) {
                    if (e.type.indexOf("touch") > -1) {
                        e = e.touches[0]||e.changedTouches[0];
                    }
                    if (!this.hasConfirmDirection) {
                        this.deltaX=e.clientX-this.startX;this.deltaY=e.clientY-this.startY;
                        if( this.deltaX!=0||this.deltaY!=0){
                            if (Math.abs(this.deltaX) > Math.abs(this.deltaY)) {
                                this.verticalMove = false;
                                this.hasConfirmDirection = true;
                            } else {
                                this.verticalMove = true;
                                this.hasConfirmDirection = true;
                            }
                        }
                    }else{
                        this._calcDelta(e);
                        var distance = {};
                        if(this.settings.switchMode.effect!="slide"){
                            return;
                        }
                        if (this.verticalMove) {
                            distance.y = this.deltaY + this.initPosition.y;
                        } else {
                            distance.x = this.deltaX + this.initPosition.x;
                        }
                        this.slide(distance);
                    }
                }
            }
        },
        _end:function(e){
            if(!this.settings.switchingOff||!this.switching){
                if(this.moving){
                    if(e.type.indexOf("touch")>-1){
                        e=e.changedTouches[0];
                    }
                    this.moving=false;
                    this._calcDelta(e);
                    var direction;
                    if(this.verticalMove){
                        direction=this.deltaY<0?"bottom":"top";
                    }else{
                        direction=this.deltaX<0?"right":"left";
                    }
                    var endTime=$.now();
                    var delta;
                    delta=this.settings.horizontalMode?this.deltaX:this.deltaY;
                    var newPage;
                    if(endTime-this.startTime<this.settings.flick.duration&&Math.abs(delta)>this.settings.flick.distance){
                        newPage=this.curPage+(direction=="right"||direction=="bottom"?1:-1);
                        if(!this.settings.loopMode){
                            if(newPage==0){
                                newPage=1;
                            }else if(newPage>this.itemNum){
                                newPage=this.itemNum
                            }
                        }
                        this.trigger("flick.XSlider",[this.curPage,newPage]);
                    }else if(Math.abs(delta)>this.pageWidth/2){
                        newPage=this.curPage+(direction=="right"||direction=="bottom"?1:-1);
                        if(!this.settings.loopMode){
                            if(newPage==0){
                                newPage=1;
                            }else if(newPage>this.itemNum){
                                newPage=this.itemNum
                            }
                        }
                    }else{
                        newPage=this.curPage;
                    }
                    this.go(newPage);

                }
            }
        },
        slide:function(distance,duration,easing,callback){
            if(distance.x==this.x&&distance.y==this.y){
                $.isFunction(callback)&&callback();
                return;
            }
            var curPosition=this.getPosition(),newPosition=curPosition;
            for(var key in distance){
                if($.isNumeric(distance[key])){
                    newPosition[key]=distance[key];
                }else if($.type(distance[key])=="string"){
                    var matchs=distance[key].match(/([+-]?)(\d+)/);
                    if(matchs[1]=="+"){//相对增加
                        newPosition[key]=curPosition[key]+parseFloat(matchs[2]);
                    }else if(matchs[1]=="-"){//相对减少
                        newPosition[key]=curPosition[key]-parseFloat(matchs[2]);
                    }else if(matchs[1]==""){//设为绝对值
                        newPosition[key]=parseFloat(matchs[2]);
                    }else{
                        throw "Invalid parameter:XSlider slider";
                    }
                }
            }
            var css={left:newPosition.x,top:newPosition.y},oldPage=this.curPage;
            if(duration){
                var switchEndCallback=function(){
                    this.x=newPosition.x;
                    this.y=newPosition.y;
                    this.trigger("switchend.XSlider",[oldPage,this.curPage]);
                    $.isFunction(callback)&&callback();
                }.bind(this);
                easing=easing||"swing";
                this.$Slider.animate(css,duration,easing,switchEndCallback);

                this.trigger("switchstart.XSlider",[oldPage,this.newPage]);
            }else{
                this.$Slider.css(css);
                this.x=newPosition.x;
                this.y=newPosition.y;
                $.isFunction(callback)&&callback();
            }

        },
        _fade:function(newPage,duration,easing,callback){
            var oldPage=this.curPage;
           if(newPage==this.curPage){
               $.isFunction(callback)&&callback();
               return;
           }
            var switchEndCallback=function(){
                this.switching=false;
                this.trigger("switchend.XSlider",[oldPage,newPage]);
                $.isFunction(callback)&&callback();
            }.bind(this);
            this.trigger("switchstart.XSlider",[oldPage,newPage]);
            this.$Items.filter(".active").fadeOut(duration);
            $(this.$Items.get(newPage-1)).fadeIn(duration,switchEndCallback);
        },
        getPosition:function(){
            var position=this.$Slider.position();
            return {
                x:position.left,
                y:position.top
            }
        },
        _calcPage:function(index){
            var newPage;
            if(this.settings.loopMode){
                newPage=index<=0?Math.abs(index+this.itemNum):index;
                newPage=newPage>this.itemNum?1:newPage;
            }else{
                newPage=index<=0?1:index;
                newPage=newPage>this.itemNum?this.itemNum:newPage;
            }
            return newPage;
        },
        _goOrBack:function(oldPage,newPage){
            var go=newPage-oldPage,back=-go;
            if(go==0) return {dir:0, num:0};
            go=go<0?go+this.itemNum:go;
            back=back<0?back+this.itemNum:back;
            if(go>back){
               return  {
                   dir:-1,
                   num:back
               }
            }else{
               return {
                   dir:1,
                   num:go
               }
            }
        },
        _infinite:function(newPage,duration,easing,call){
            if(this.curPage==0) this.curPage=1;
            var goOrBack=this._goOrBack(this.curPage,newPage);
            var newCallback,i=0,position={};
            if(goOrBack.dir==1){
                newCallback=function(){
                    for(;i<goOrBack.num;i++){
                        $(this.$Slider.children(".XSlider-item").get(0)).appendTo(this.$Slider);
                    }
                    this.slide({x:-this.pageWidth,y:0});
                    $.isFunction(call)&&call();
                }.bind(this);
                if(this.settings.horizontalMode){
                    position.x=-this.pageWidth*(goOrBack.num+1);
                    position.y=0;
                }else{
                    position.x=0;
                    position.y=-this.pageHeight*(goOrBack.num+1);
                }
            }else if(goOrBack.dir==-1){
                for(;i<goOrBack.num;i++){
                    $(this.$Slider.children(".XSlider-item").get(this.itemNum-1)).prependTo(this.$Slider);
                }
                if(this.settings.horizontalMode){
                    position.x=-this.pageWidth*(goOrBack.num+1);
                    position.y=0;
                }else{
                    position.x=0;
                    position.y=-this.pageHeight*(goOrBack.num+1);
                }
                this.slide(position);
                newCallback=function(){
                    $.isFunction(call)&&call();
                }.bind(this);
                if(this.settings.horizontalMode){
                    position.x=-this.pageWidth;
                    position.y=0;
                }else{
                    position.x=0;
                    position.y=-this.pageHeight;
                }
            }else{
                newCallback=function(){
                    $.isFunction(call)&&call();
                }.bind(this);
                if(this.settings.horizontalMode){
                    position.x=-this.pageWidth;
                    position.y=0;
                }else{
                    position.x=0;
                    position.y=-this.pageHeight;
                }
            }
            this.slide(position,duration*goOrBack.num,easing,newCallback);
        },
        _back:function(){
            var css={
                    left:this.settings.horizontalMode?-this.pageWidth:0,
                    top:this.settings.horizontalMode?0:-this.pageHeight
                };
            this.$Slider.css(css);
            this.x=css.left;
            this.y=css.top;
        },
        go:function(index,duration,easing,call){
            var newPage=this._calcPage(index);
            this.newPage=newPage;
            if(this.settings.switchMode.effect=="slide"){
                if(this.settings.infinite){

                    this._infinite(newPage,duration?duration:this.settings.duration,easing?easing:this.settings.switchMode.easing,call);

                }else{
                    var position={};
                    var goPages=Math.abs(newPage-this.curPage);
                    duration=duration?duration:this.settings.duration*(goPages==0?1:goPages);

                    if(this.settings.horizontalMode){
                        position.x=-(newPage-1)*this.pageWidth;
                        position.y=0;
                    }else{
                        position.y=-(newPage-1)*this.pageHeight;
                        position.x=0;
                    }
                    this.slide(position,duration,easing?easing:this.settings.switchMode.easing,call);
                }
            }else if(this.settings.switchMode.effect=="fade"){
                this._fade(newPage,duration?duration:this.settings.duration,easing?easing:this.settings.switchMode.easing,call);
            }

            this.curPage=newPage;
            $(this.$Items[this.curPage-1]).addClass("active").siblings().removeClass("active");
            if(this.settings.indicatorMode){
                $(this.$IndicatorItems[this.curPage-1]).addClass("active").siblings().removeClass("active");
            }
        },
        prev:function(callback){
            this.go(this.curPage-1,callback);
        },
        next:function(callback){
            this.go(this.curPage+1,callback);
        },
        _autoPlay:function(){
            if(!this.autoPlayTimer){
                this.autoPlayTimer=setInterval(function(){
                    this.next();
                }.bind(this),this.settings.autoPlayInterval)
            }
        },
        resize:function(){
            var oldWidth=this.pageWidth,oldHeight=this.pageHeight;
            this.pageWidth=$(this.$Items.get(0)).width();
            this.pageHeight=$(this.$Items.get(0)).height();
            this.slide({
                x:this.x*this.pageWidth/oldWidth,
                y:this.y*this.pageHeight/oldHeight
            });
            this._locateIndicator(true);
        },
        on:function(event,callback){
            this.$Slider.on(event,callback);
            return this;
        },
        off:function(event){
            this.$Slider.off(event);
            return this;
        },
        trigger:function(event,args){
            this.$Slider.trigger(event,args);
            return this;
        }
    };

    $.fn.extend({
        XSlider:function(settings){return new XSlider(this,settings)}
    })
});