var Tumblelog = {};

// AJAX
Tumblelog.Ajax = (function(url, callbackFunction) {
    this.bindFunction = function (caller, object) {
        return function() {
            return caller.apply(object, [object]);
        };
    };

    this.stateChange = function (object) {
        if (this.request.readyState==4) this.callbackFunction(this.request.responseText);
    };

    this.getRequest = function() {
        if (window.ActiveXObject)
            return new ActiveXObject('Microsoft.XMLHTTP');
        else if (window.XMLHttpRequest)
            return new XMLHttpRequest();
        return false;
    };

    this.postBody = (arguments[2] || "");
    this.callbackFunction=callbackFunction;
    this.url=url;
    this.request = this.getRequest();

    if(this.request) {
        var req = this.request;
        req.onreadystatechange = this.bindFunction(this.stateChange, this);

        if (this.postBody!=="") {
            req.open("POST", url, true);
            req.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            req.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
            req.setRequestHeader('Connection', 'close');
        } else {
            req.open("GET", url, true);
        }

        req.send(this.postBody);
    }
});

// Infinite Scroll
Tumblelog.Infinite = (function() {

    var _$window          = $(window);
    var _$posts           = $('#posts');
    var _trigger_post     = null;

    var _current_page     = {CurrentPage};
    var _total_pages      = {TotalPages};
    var _url              = document.location.href.split("#")[0];
    var _infinite_timeout = null;
    var _is_loading       = false;
    var _posts_loaded     = false;
    
    var _Ajax = Tumblelog.Ajax;

    function init() {            
        set_trigger();
        enable_scroll();
    }

    function set_trigger () {
        var $all_posts = _$posts.find('li.post');
    
        if (!_posts_loaded) {
            _posts_loaded = $all_posts.length;
        }

        if (_posts_loaded >= 4) {
            _trigger_post = _$posts.find('li.post:eq(' + ($all_posts.length - 4) + ')').get(0);
        } else if (_posts_loaded >= 3) {
            _trigger_post = _$posts.find('li.post:eq(' + ($all_posts.length - 3) + ')').get(0);
        } else {
            _trigger_post = _$posts.find('li.post:last').get(0);
        }
    };

    function in_viewport (el) {
        if (el == null) return;
        var top = el.offsetTop;
        var height = el.offsetHeight;

        while (el.offsetParent) {
            el = el.offsetParent;
            top += el.offsetTop;
        }

        return (top < (window.pageYOffset + window.innerHeight));
    };

    function enable_scroll() {
        $('#footer .pagination').hide();
        _$window.scroll(function(){
            clearTimeout(_infinite_timeout);
            infinite_timeout = setTimeout(infinite_scroll, 100);
        });
    }

    function disable_scroll() {
        clearTimeout(_infinite_timeout);
        $(window).unbind('scroll');
    }

    function infinite_scroll() {
        if (_is_loading) return;

        if (in_viewport(_trigger_post)) {
            load_more_posts(); // w00t
        }
    };

    function load_more_posts() {
        if (_is_loading) return;
        _is_loading = true;

        // Build URL
        if (_url.charAt(_url.length - 1) != '/') _url += '/';
        if (_current_page === 1) _url += 'page/1';
        _current_page++;
        _url = _url.replace('page/' + (_current_page - 1), 'page/' + _current_page);

        // Fetch
        _Ajax(_url, function(data) {
            var new_posts_html = data.split('<!-- START' + ' POSTS -->')[1].split('<!-- END' + ' POSTS -->')[0];
            var $new_posts = $('#posts', data);

            // Insert posts and update counters
            $('#posts').append(new_posts_html);
            _posts_loaded = $new_posts.find('li.post').length;

            if (_posts_loaded) {
                var post_ids = [];
                var like_buttons = $('#posts', data).find('.like_button');
                for (var i = 0; i < like_buttons.length; i++) {
                    var button = like_buttons[i];
                    if ($(button).attr('data-post-id')) {
                        post_ids.push($(button).attr('data-post-id'));
                    }
                }
                if (post_ids.length > 0) Tumblr.LikeButton.get_status_by_post_ids(post_ids);
            }

            if ((_posts_loaded > 0) && (_current_page < _total_pages)) {
                set_trigger();
                _is_loading = false;

            } else {
                disable_scroll();
            }
        });

        // Stats
        {block:IfGoogleAnalyticsID}
            if (typeof window._gaq != 'undefined') {
                _gaq.push(['_trackPageview', _url]);
            }
        {/block:IfGoogleAnalyticsID}
    }

    return {
        init: init
    };
});

$(function() {
    {block:IndexPage}
    if ( !($.browser.msie && (parseInt($.browser.version, 10) < 9) ) ) {
        var InfiniteScroll = new Tumblelog.Infinite;
        InfiniteScroll.init();
    }
    {/block:IndexPage}
});