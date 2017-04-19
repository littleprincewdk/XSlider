XSlider[http://princekin.tjxuechuang.com/projects/xslider]
-
####依赖
    jquery.js
    jquery.mousewheel.js
####配置
    this.defaults={
        initPage:1,             //初始页
        duration:300,           //页面切换时间
        flick:{                 //规定滑动多少时间和距离定义为flick
            duration:300,
            distance:20
        },
        //自动播放
        autoPlay:false,         //是否开启自动播放
        autoPlayInterval:5000,  //自动播放间隔
        //控制方式
        btnMode:false,          //是否启用按钮控制
        mouseMode:true,         //是否启用鼠标滑动控制
        touchMode:false,        //是否启用触摸控制
        mouseWheelMode:true,    //是否启用鼠标滚轮控制
        indicatorMode:true,     //是否启用指示器控制
        //UI
		indicatorTheme:"dot",	//指示器主题
        horizontalMode:true,    //页面是否水平滚动，以及鼠标滑动控制时的控制方向
        indicatorPos:"bottom",  //指示器位置
        //特效
        switchingOff:true,      //页面切换过程中控制无效
		verticalVis:0.3,		//水平方向的粘性,false时无粘性
        horizontalVis:0.3,		//垂直方向的粘性,false时无粘性
        loopMode:false,         //是否循环播放
        //切换动画
        switchMode:{
           effect:"slide",      //切换效果
		   easing："swing"		//动画效果
        }
    }
####API
    getPosition()               获取当前slider位置
    slide(position,duration,easing,callback)
                                在duration时间内以easing方式滑动到位置position
                                并在完成时执行callback回调                              
    go(index,callback)          前往第index个页面，并在完成时执行callback回调
    prev(callback)              前往前一个页面，并在完成时执行callback回调
    next(callback)              前往下一个页面，并在完成时执行callback回调
    on(event,callback)          绑定事件
    off(event,callback)         解绑事件
    trigger(event,callback)     触发事件
    resize()                    当容器大小发生变化时重置组件位置
####事件
    flick.XSlider               //快速滑动
    switchstart.XSlider         //开始切换页面(oldpage,newpage)
    switchend.XSlider           //切换页面完成(oldpage,newpage)