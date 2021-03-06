var first_flipto = location.href.match(/(\/#page\/)(\d*)$/);
srcs = "{{srcs}}";
bm_key = '{{authdir}}_{{bookdir}}';     

{{#generic_srcs}}
if(location.host != "textuali.com") {
    srcs = "{{generic_srcs}}"; 
    if (self == self.top && !/bot|googlebot|crawler|spider|robot|crawling/i.test(window.navigator.userAgent)) {
        location.assign("{{generic_base}}?book={{bookdir}}");
    }
}
{{/generic_srcs}}

/*function title_inlist(list,title) {
    console.log(list,title);
    var found = false, i = 0;
    while(!found && i < list.length) {
        if(list[i]['title'] == title) {
            found = true;
        }
        i++;
    }
    return found;
}*/

{{#blocked}}
function is_blocked(page) {
    var b = {{blocked}},
        ans = false,
        page = flip2phis(page);
    for(i in b) {
        if(page >= b[i][0] && page <= b[i][1]) {
            ans = true;
        }
    }
    return ans;
}

function find_next_available(page) {
    if(!is_blocked(page)) {
        return page;
    }
    var b = {{blocked}},
        i = 0;
    while(i < b.length) {
        if(flip2phis(page) > b[i][1] ) {
            i++;
        }
        else {
            if(i < b.length && b[i][1] < {{phispage_count}}) {
                return phis2flip(b[i][1] + 1);
            }
            else {
                return first_available_page()
            }
        }
    }
}

function first_available_page() {
    var b = {{blocked}};
    if(b[0][0] > 1) {
        return phis2flip(1);
    }
    else if(b[0][1] < {{phispage_count}}) {
        return phis2flip(b[0][1] + 1);
    }
    return 1;
}
{{/blocked}}

function page_files(page) {
    if(page > {{pages}}  || page < 1) {
        return false    
    }
    var filename = {{page_list}}[page-1], 
        hard = /[a-z]/.test(filename.slice(-1)) && (page >=
        {{page_list}}.length - 1 || page <= 2) && '{{hard_cover}}' == 'True'
    return {
        jpg : srcs+'/jpg/'+ filename + '.jpg', 
        html : srcs+'/html/' + filename + '.htm', 
        hard : hard,
        htmlbare: filename + '.htm'
    };
}

function unenlarge_flip() {
    $('#enlarge').removeClass('btn-danger').addClass('btn-default').find('.glyphicon').removeClass('glyphicon-zoom-out').addClass('glyphicon-zoom-in');
    if($('.flipbook').data('displayMode') == "scan") { 
        $('.flipbook').turn('zoom', 1).css('{{side}}','').animate({'{{oposide}}': '-20px', top: '0'},500).turn('disable',false).draggable("destroy");
        $('.textuali-container').width($('.flipbook').width() + 20);
    }
    else {
        $('div.pagelive').removeClass('large');
    }
}

function enlarge_flip() {
    $('#enlarge').addClass('btn-danger').removeClass('btn-default').find('.glyphicon').removeClass('glyphicon-zoom-in').addClass('glyphicon-zoom-out');
    if($('.flipbook').data('displayMode') == "scan") { 
        var dist_from_center = $('.flipbook').offset().left - $('.flipbook').width()/2;
        var dist_from_middle = $('.flipbook').offset().top - $('.flipbook').height()/2;
        
        $('.flipbook').turn('zoom', 2);            
        $('.flipbook').turn('disable',true).draggable();
    }
    else {
        $('div.pagelive').addClass('large');
    }
}

function phis2flip(num) {
    var ret = -1;
    if(num > 0 && num <= {{phispage_count}}) {
        ret = parseInt(num) + parseInt({{start_offset}});
    }
    /*var ret = -1;
    var zeros = '00';
    if(num > 9 && num < 99) {
        zeros = '0';
    }
    if(num > 99) {
        zeros = '';
    }
    var filebase = {{page_list}}[0].match(/^\w\d{3}p/);
    var inlist = $.inArray(filebase+zeros+num,{{phispages}});
    if(inlist > 0) {
        ret =  inlist + 1;
    }*/
    return ret;
}

function flip2phis(num) {
    return Math.max(1,parseInt(num) - parseInt({{start_offset}}));
}
function loadPage(page, pageElement) {
    var pf = page_files(page);
    if (!pf) {
        return;
    }
    {{#blocked}}
    if(is_blocked(page)) {
        var cont = $('<div><p>{{blocked_message}}</p></div>'),
            next = find_next_available(page),
            nextext = next > page ? "{{string_translations.next_avail}}" : "{{string_translations.first_avail}}";
        b = $('<button class="next-avail btn btn-default flb-seek" data-seek="'+next+'">'+nextext+'</button>').click(function() {
                seek = $(this).data('seek');
                if(/^\d+$/.test(seek)) {
                    $('.flipbook').turn('page',seek);
                }
            });
        cont.append(b);
        pageElement.addClass('blocked').find('.spine-gradient').append(cont);
        return;
    }
    {{/blocked}}
    pageElement.css('background-image','url('+pf.jpg+')');
    foundHtml = false;
    if('{{has_texts}}' == 'True' ) {			
        $.ajax({url: pf.html}).done(function(pageHtml) {
            if('{{whole_docs}}'=='True') {
                pageHtml = $(pageHtml).get(7);
            }
            if(!$.isEmptyObject(pageHtml)) {				
                $(pageHtml).find('img').each(function() {
                    var sr = this.src;
                    sr = sr.replace('{{bookdir}}', '{{bookdir}}/html');
                    $(this).attr('src',sr);
                });
                hidden = $('.flipbook').data('displayMode') == 'scan' ? ' hidden' : '';
                pageElement.find('.spine-gradient').append($('<div class="page-html'+hidden+'"/>').html(pageHtml));
            }
            /* else {
                pageElement.find('.page-html').remove();
            } */  
       }).fail(function() {
           pageElement.find('.page-html').remove();    
       });
    }
}

function addPage(page, book) {
    var id, pages = $('.flipbook').turn('pages'), 
        pageElement = $('<div/>').html('<div class="spine-gradient"/>');
    if(page > 0 && page_files(page).hard) {
        pageElement.addClass('hard');
    }
    if (book.turn('addPage', pageElement, page))  {
        loadPage(page, pageElement);
    }
}

function highlight_search(page,query) {
    var target = $('.p'+page).find('.page-html');
    if(target.length > 0) {
        var rawhtml = target.html();
        var newhtml = rawhtml.replace(query,'<strong class="in-page-highlight whole">'+query+'</strong>');
        var sq = query.split(" ");
        for(w in sq) {
            newhtml = newhtml.replace(sq[w], '<strong class="in-page-highlight">'+sq[w]+'</strong>');
        }
        target.html(newhtml);
    }
    return 1;
} 

function filename2pagenum(filename) {
    var ans="";
    var n = filename.match(/\d+p0*([1-9]\d*)$/);
    if(n != null && n.length > 1) {
        ans= n[1];
    }
    return ans;
} 

function get_toc(pagenum) {
    $.ajax({url: page_files(pagenum).html}).done(function(pageHtml) {
        var toc_list = $('<ul class="toc-list dropdown-menu toc"/>');
        toc_list.append('<li><a class="toc-link" href="#page/'+pagenum+'">{{string_translations.toc_long}}</a></li>');
        //toc_list.css("max-height", Math.floor($(window).height()*0.6)+"px");
        $(pageHtml).find('.toc-list li').each(function() {
            toc_list.append(this);
        });
        $('#totoc').after(toc_list);
    });
}

function process_search_results(results) {
    var htm = '<h3>{{string_translations.search_results}} "'+results.q+'"</h3>';
    if(results.status == 'success') {
        if(results.matches.length > 0) {
            htm += '<ul class="toc-list">';
            var m = results.matches;
            for(var res in m) {
                htm += '<li><span class="search-results-pagenum">עמ\' ' + filename2pagenum(m[res].id)+'</span>';
                htm += '<a class="toc-link search-result" href="#page/'+($.inArray(m[res].id,{{page_list}}) + 1);
                htm += '?q='+results.q+'">'+m[res].match+'</a></li>';
            }
            htm += '</ul>';
        }
        else {
            htm = 'sorry, no matches found';
        } 
   }
   else if(results.status == 'fail') {
       htm = results.error;
   }
   else {
       htm = 'unknown error';
   }
   return htm;
} 

function toggle_html(btn) {
    $(btn).parent().parent().find('iframe').each(function() {
        $(this).css('height',($(this).parent().parent().height()-80)+'px');
        $(this).parent().toggleClass('hidden');
    });
}

{{^packing}}
function edit_url(file) {
    return "{{front.domain}}/editor/editor.php?auth={{authdir}}&book={{bookdir}}&page="+file;
}

function edit_button_update(pages) {
    for(i in pages) {
        file = {{page_list}}[pages[i] - 1];
        var tar = $('#edit'+i);
        tar.data('url',edit_url(file));
        tar.find('.btn-text').text('{{string_translations.edit}} '+ file);
        tar.show();
    }
}
{{/packing}}

{{#external_texts}}
function external_texts_update(pages) {
    $('#externals-popover').empty();
    listed = [];
    for(p in pages) {
        list  = get_external_text_urls(pages[p]); 
        $.each(list,function(i,v){
            if($.inArray(v.title,listed) == -1) {
                $('#externals-popover').append($('<h6><a target="_top" href="'+v.url+'">'+v.title+'</a></h6>'));
                listed.push(v.title);
            } 
        }); 
    }
}

function get_external_text_urls(flip_page) {
    var map  = {{{external_texts_map}}},
        page = flip2phis(flip_page - 1),
        i = 0,
        stop = false,
        ret = [];
    while(i < map.length && !stop) {
        var title = map[i][1], 
            num = parseInt(map[i][0]); 
        if(num > page) {
            stop = true;
        }
        if(num >= page) {
            ret.push({
                "title" : title,
                "url" : decodeURIComponent(map[i][2])
            });
        }
        i++;
    }
    return ret;
}
{{/external_texts}}




function share_urls_update(page) {
    url = location.href; 
    if(window != self.top) {
        var parser = document.createElement('a'),
            parenturl = document.referrer;
        parser.href = parenturl;
        url = parser.origin + parser.pathname+"?book={{bookdir}}";
    }
    if(page > 1) {
        url += "/#page/"+flip2phis(page);
    }
    $('#share-url').text(url);
    $('.share').each(function() {
        var sharebase = $(this).attr('data-href'),
            u = url;
        switch(this.id) {
            case 'share-twitter' : 
                u = sharebase + "{{twitter_default}}";
            break;
            default:
                u = sharebase + url; 
        }
        $(this).data('share_url',u);
    });
}  

function show_html(pages) {
    var tar; 
    for (i in pages) {
        tar = find_html_div(pages[i]).add('.page-html').filter(function() {
            return $(this).html() != "";
        });
        tar.each(function() {
            $(this).closest('.page').css({'overflow-y': 'auto', 'background-size': '0 0'});
            $(this).removeClass('hidden');
            var l = $(this).find('.pagelive').height() + 20,
                t = $(this).height(),
                p = $(this).closest('.page').height(),
                h = Math.max(t,p,l);
            //$(this).removeClass('hidden').find('iframe').css('height',($(this).closest('.page-wrapper').height()-80)+'px');
            $(this).height(h); 
            if(l < h) {
                $(this).find('.pagelive').height(h);
            }
        });
    }
    $('#totoc').attr('data-toggle', '').removeClass('jpg-toc');
}

function hide_html(pages) {
    for (i in pages) {
        find_html_div(pages[i]).add('.page-html').addClass('hidden').closest('.page').css({
            'overflow-y' : 'hidden',
            'background-size' : '100% 100%'
        });
    }
    $('#totoc').attr('data-toggle', 'dropdown').addClass('jpg-toc');
}

function find_html_div(n) {
    return $('.page.p'+n).find('.page-html');
}

function toggleHtml(pages) {
    var displayMode = $('.flipbook').data('displayMode');
    if(displayMode == 'scan') {
        hide_html(pages);
    }
    else if(displayMode == 'html') {
        show_html(pages);
    }
}

function loadApp() {
    //$('.largenav').addClass('disabled');
    var  book_height = $(window).height() - $('#buttons-row').outerHeight() - 20,
        screen_ratio = $(window).width()/$(window).height(),
        book_width,
        openbook_ratio = parseFloat({{openbook_ratio}});
    if(typeof(openbook_ratio) != "number" || openbook_ratio == 0) {
        im = $('<img src="jpg/{{frontjpg}}"/>').get(0);
        openbook_ratio = (2*im.naturalWidth)/im.naturalHeight;
    }
    
    if(Math.abs(1 - openbook_ratio/screen_ratio) > Math.abs(1 - screen_ratio/openbook_ratio)) {
        openbook_ratio = 1/openbook_ratio;
        book_width = Math.floor($(window).width() * 0.8);
        book_height = Math.floor(book_width*openbook_ratio);
    }   
    else {
        book_width=Math.floor(book_height*openbook_ratio);
    }
    var clearbuttons = $('#side-buttons').offset().top+$('#side-buttons').height() - 20;
    //var screen_marge = Math.floor(($(window).width() - book_width)/2);
    //var largenav_offset = (screen_marge - 85)+'px';
    $('.textuali-container').width(book_width + 20);
    //$('.flb-next.largenav').css('{{oposide}}', largenav_offset);
    //$('.flb-prev.largenav').css('{{side}}',largenav_offset);
    $('.largenav').css('top',Math.max(book_height/2,clearbuttons)+'px');
    //$('.largenav').removeClass('hidden');
    $('.flipbook').turn({
        width:book_width,
        height:book_height,
        elevation: 50,
        duration:2000,
        pages: {{pages}},
        direction: '{{flipdirection}}',
        // Enable gradients
        gradients: true,
        // Auto center this flipbook
        autoCenter: true,
        when: {
            'turned': function(event, page, pages) {
                if(Hash.fragment() != "" || page > 2 ) {
                    var searchq = Hash.fragment().match(/\?q=(.*)$/);
                    if(searchq != null && searchq.length == 2) {
                        show_html(pages);
                        for(var p in pages) {
                            highlight_search(pages[p],decodeURIComponent(searchq[1])),$('.p'+page);
                        }
                    }
                    Hash.go('page/'+page);
                    //parent.postMessage({type:'flipped_to',"page" : page}, "*");
                } 
                //$('.flb-next, .flb-prev').show();
                $('.largenav').removeClass('disabled');
                if(page == $(this).turn('pages')) {
                    $('.largenav.next').addClass('disabled');
                }
                if(page == 1) {
                    $('.largenav.prev').addClass('disabled');
                }
                
                {{^packing}}
                edit_button_update(pages);
                {{/packing}}
                share_urls_update(page);
                
                {{#external_texts}}
                external_texts_update(pages);
                {{/external_texts}}
                bookmarks_texts(pages);
                if(pages[0] == 0) {
                    $('.create-mark.second').hide();
                }
            },
            'start' : function(event,pageObject,corner) {
                toggleHtml(pageObject.turn.turn('view'));
                
            }, 
            'missing': function (e, pages) { 
                for (var i = 0; i < pages.length; i++) {
                    addPage(pages[i], $(this));
                }					
            },
            'turning' : function(event, page, view) {
                $('.popover').modalPopover('hide');
                //$('#search-results').removeClass('in');
                if($('#top-buttons').hasClass('open')) {
                    $('.toc-list.toc').dropdown('toggle');
                }
                $('#flip-share').removeClass('in');
            }
        }                 
    });
    
    //loadPage(1,$('.flipbook').find('div').eq(0));
    
    // URIs
    Hash.on('^page\/([0-9]*)\/\?(.*)$', {
        yep: function(path, parts) {
            var page = parts[1];
            if (page!==undefined) {
                if ($('.flipbook').turn('is'))
                    $('.flipbook').turn('page', page);
            }
        },
        nop: function(path) {
           if ($('.flipbook').turn('is')) {
               $('.flipbook').turn('page', phis2flip(2));
           }
        }
    });

    // Arrows
    $(document).keydown(function(e){
        var previous = 37, next = 39;
        switch (e.keyCode) {
            case previous:
                $('.flipbook').turn('previous');
            break;
            case next:
                $('.flipbook').turn('next');
            break;
        }
    });
    
    if(first_flipto != null && first_flipto[2] !== "") {
        Hash.go('page/'+phis2flip(first_flipto[2]));
    }

    
} //loadApp


function delete_all_bookmarks() {
    if(typeof(Storage !== "undefined") && typeof(JSON) !== "undefined") { 
        var bookmarks = JSON.parse(localStorage.getItem("textuali_bookmarks"));
        if(bookmarks != null && bookmarks[bm_key] != null) {
            delete bookmarks[bm_key];
            localStorage.setItem("textuali_bookmarks",JSON.stringify(bookmarks));
        }
        if(Object.keys(bookmarks).length == 0) {
            localStorage.removeItem("textuali_bookmarks");
        }
        bookmarks_dropdown();
    }
}

function bookmarks_dropdown() {
    if(typeof(Storage !== "undefined") && typeof(JSON) !== "undefined") { 
        var bookmarks = JSON.parse(localStorage.getItem("textuali_bookmarks"));
        $('#stored-marks').empty().css('padding-bottom' , '0');
        if(bookmarks != null && bookmarks[bm_key] != undefined) {
            var marks = bookmarks[bm_key]['marks'];
            $('#stored-marks').append('<h3 class="btn-default">{{string_translations.your_bookmarks}}</h3>').css('padding-bottom', '50px');
            for(var markid in marks) {
                var comment = marks[markid]['comment'],
                    page = marks[markid]['page'],
                    deleted = marks[markid]['deleted'] ? ' deleted' : '',
                    mark = "<div class='bookmark"+deleted+"' data-mark='"+page+"' data-markid='"+markid+"'>{{string_translations.page}} "+flip2phis(page);
                if(comment != "") {
                    mark += ': '+comment;
                }
                mark += '</div>';
                var delete_button = $('<button class="btn btn-xs btn-default delete-bookmark">{{string_translations.delete}}</button>').click(function(c) {
                    c.stopPropagation();
                    var m = $(this).closest('.bookmark').data('markid');
                    if(typeof(m) == 'number' || /^\d+$/.test(m)){
                        delete_bookmark(m);
                    }
                });
                mark = $(mark).append(delete_button);
                $('#stored-marks').append(mark);
            }
        }
    }
    else {
        console.warn("no storage or JSON. skipping textuali bookmark functionality");
        $('#bookmarks-trigger,#bookmarks').remove();
    } 
    $('.bookmark').click(function() {
        var mark = $(this).data('mark');
        $('.flipbook').turn('page',mark);
    });
}

function bookmark(page,comment) {
        var allmarks = JSON.parse(localStorage.getItem("textuali_bookmarks")),
            tomark = {},
            marks = {},
            count = 0;
        if(allmarks == null) {
            allmarks = {};
        }
        else if(bm_key in allmarks) {
            count = allmarks[bm_key]['count'];
            marks = allmarks[bm_key]['marks'];
        }
        marks[++count]={'page': page, 'comment' : comment};
        allmarks[bm_key] = {'count' : count,  'marks' : marks};
        localStorage.setItem("textuali_bookmarks",JSON.stringify(allmarks));
        bookmarks_dropdown();
    }

function delete_bookmark(markid) {
    var allmarks = JSON.parse(localStorage.getItem("textuali_bookmarks"));
    if (bm_key in allmarks) {
        if(markid in allmarks[bm_key]['marks']) {
            allmarks[bm_key]['count'];
            allmarks[bm_key]['marks'][markid]['deleted']=true;
        }
    }
    localStorage.setItem("textuali_bookmarks",JSON.stringify(allmarks));
    bookmarks_dropdown();
}   

function bookmarks_texts(pages) {
    var textpref = "{{string_translations.mark}} {{string_translations.page}} ";
    $('.create-mark.first').text(textpref+flip2phis(pages[0])).data('mark',pages[0]);
    if(pages[0] != 0) {
        $('.create-mark.second').show().text(textpref+flip2phis(pages[1])).data('mark',pages[1]);
    }
}


$(document).ready(function() {
    $(window).resize(function() {
        var rememberme = {
            page:  $('.flipbook').turn('page'), 
            displaymode : $('.flipbook').data('displayMode')
        };
        $('.flipbook').turn('destroy');
        loadApp();
        var book = $('.flipbook');
        book.data('displayMode',rememberme.displaymode);
        Hash.go('page/'+rememberme.page);
        book.turn('page',rememberme.page);
        /*for(p in book.turn('view')) {
            addPage(p,book);
        }*/
        toggleHtml(); 
    });

    {{^packing}}
    $('.edit').click(function() {
        var url = $(this).data('url');
        $('#editor-frame').find('.modal-body').html('<iframe src="'+url+'"></iframe>');
        $('#editor-frame').modal('show');
    });
    edit_button_update([1,2]);
    {{/packing}}
    
    $('.share').click(function() {
        var h = $(this).data('share_url');
        window.open(h,"", "width=600, height=400");
    });
    $('#share-modal,#flip-share .close').click(function() {
        $('#flip-share').toggleClass('in');
    });
    $(window).load(bookmarks_dropdown);
    $('#delete-all-bookmarks').click(delete_all_bookmarks);
    $('#bookmarks-trigger').click(function() {
        $(this).closest('.dropdown').toggleClass('open');
    });
    
    $('.create-mark').click(function() {
        var m = $(this).data('mark'),
            c = $('#bookmark-comment').val();
        if($(this).hasClass('input')) {
            m = phis2flip($('#free-bookmark').val());
        } 
        if(typeof(m) == 'number' || /^\d+$/.test(m)) {
            bookmark(m,c);
        }
    });

    $('.flipbook').data('displayMode', 'scan');
    if(parseInt({{toc}}) > 0) {
        get_toc({{toc}});
    }
    $('body').mousedown(function(c) {
        if($(this).hasClass('modal-open')) {
            var exclude1 = $('#gotopage-trigger').add($('#gotopage-popover').find('*').andSelf());
            var exclude2 = $('#search-trigger').add($('#search-popover').find('*').andSelf());
            if(!exclude1.is(c.target)) {
                $('#gotopage-popover').modalPopover('hide');
            }
            if(!exclude2.is(c.target)) {
                $('#search-popover').modalPopover('hide');
                //$('#search-results').removeClass('in');

           }
        }
        var exclude3 = $('.dropdown-toggle').add($('.dropdown-menu').find('*').andSelf());
        if(!exclude3.is(c.target)) {
            $('.dropdown').removeClass('open');
        } 
    }); 
    
    $('.page_end').click(function(c) {
        c.preventDefault();
    }); 
   
    $('#download-pdf').click(function() {
        var pdf = $(this).attr('href'),
            h = location.href;
        if(h.indexOf('#') > 0) {
            h = h.substr(0,h.indexOf('#'));
        }
        if(undefined != pdf) {
            window.open(h+"{{authdir}}-{{bookdir}}-"+pdf, "{{book_nicename}} PDF", "width=600, height=400" );
        }
    });

    $('[data-popper]').click(function() {
        $($(this).data('popper')).modalPopover('toggle');
    });

    $('.popover').each(function() {
        $(this).modalPopover({
            target: $(this).data('trigger'),
            placement: 'bottom'
        });
    });

    $('#gotopage-form').submit(function() {
        var v = $(this).find('input').val();
        flip = phis2flip(v);
        if(flip > 0) {
            $('.flipbook').turn('page', flip);
        }
        else {
            $(this).siblings('.error-message').fadeIn(300).delay(4000).fadeOut(300);
        }
        return false;
    });


    $('#search-form').submit(function() {
        $('#search-results').removeClass('in');
        var query = $(this).serialize();
        $.ajax({
            url: 'http://textuali.com/search/websearch.py/?pretty=1&auth={{authdir}}&book={{bookdir}}&'+query,
            DataType: 'json'
        }).done(function(results) {
            $('#search-results').html(process_search_results(results)).addClass('in');
        }).fail(function(err) {
           $(this).siblings('.error-message').fadeIn(300).delay(4000).fadeOut(300);
       });
       return false; 
    });

    $('#enlarge').click(function(){
        if($(this).hasClass('btn-danger')) {
            unenlarge_flip();
        }
        else {
            enlarge_flip();
       }
    });
    $('[class*=flb]').click(function() {
        if($('#enlarge').hasClass('btn-danger')) {
            unenlarge_flip();
        }
     });        

    $('.flb-next').click(function() {
        $('.flipbook').turn('next');
    });

    $('.flb-prev').click(function() {
        $('.flipbook').turn('previous');
    });
    
    $('.flb-seek').click(function() {
        seek = $(this).data('seek');
        if(/^\d+$/.test(seek)) {
            $('.flipbook').turn('page',seek);
        }
    });
    $('.mode-toggle').click(function() {
        if($('#enlarge').hasClass('btn-danger')) {
            unenlarge_flip();
        }     
        $('.mode-toggle').not(this).removeClass('on');
        var d=$('.flipbook').data();
        if(this.id == 'showhtmls' && d.displayMode == 'scan')  {
            d.displayMode = 'html';
            $('#showhtmls').addClass('on');
            if($('#top-buttons').hasClass('open')) {
                $('.toc-list').dropdown('toggle');
                $('#top-buttons').removeClass('open');
            } 
       }
       else if(this.id == 'showscans' && d.displayMode == 'html') {
            d.displayMode = 'scan';
            $('#showscans').addClass('on');
       }
       toggleHtml($('.flipbook').turn('view'));
    });

    {{#toc}}
    $('#totoc').click(function() {
        if(!$(this).hasClass('jpg-toc')) {  
            //show_html([{{toc}},{{toc}} -1, {{toc}} + 1]);
            $('.flipbook').turn('page',{{toc}});
        }
        else {
            $(this).toggleClass('open');
        }
    });
    
    $('#top-buttons').on('shown.bs.dropdown',function() {
        $(this).find('.toc-list').css('max-height',$('body').height()*0.85+'px');
    });
    {{/toc}}

});

// Load the HTML4 version if there's not CSS transform
$(function() {
    yepnope({
        test : Modernizr.csstransforms,
        yep: ['{{front.domain}}/vendor/turnjs4/lib/turn.js'],
        nope: ['{{front.domain}}/vendor/turnjs4/lib/turn.html4.min.js'],
        complete: loadApp
    });
});     

