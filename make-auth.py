

import csv,json,jsoncomment,urllib2,re,logging,sys,os,glob,jsonmerge,lesscpy,six, optparse,textualangs,pystache,string

#lets you compile the css with -s or skip it without
op = optparse.OptionParser()
op.add_option("-s", action="store_true", dest="render_styles", help="render style files")

logging.basicConfig(level=logging.DEBUG) 
logger=logging.getLogger('make-auth')
jc = jsoncomment.JsonComment(json)
stache = pystache.Renderer(
    search_dirs='auth_templates',file_encoding='utf-8',string_encoding='utf-8',file_extension=False
)

#htmlparser = HTMLParser()
#hetran = gettext.translation('avnery_heb',os.getcwd()+'/lang',['he_IL'])
#hetran.install('avnery_heb')

def unescape(s):
    return htmlparser.unescape(s).encode('utf-8')

class AuthorSiteGenerator:
    def __init__(self,auth):
        self.indexpath = ""
        self.siteconfig = None
        self.authorblock = None
        self.conf = jc.load(file('config.json'))
        self.auth = auth
        self.found = self.search_auth()
        self.langpat = re.compile("(.*)\-(\w{2})$")
        self.body_blocks = {
            "books": self.books_template_data,
            "videos" : self.videos_template_data,
            "isotope": self.isotope_template_data
        } 
        self.puncpat = re.compile('[%s]' % re.escape(string.punctuation)) 
    
    def isotope_template_data(self,lang): 
        blocksf = self.indexpath+"/isotope-blocks.json";
        if os.path.isfile(blocksf):
            blocks = jc.load(file(blocksf))
            for block in blocks:
                if 'text' in block:
                    block['text'] = block['text'][lang]
        else:
            logger.error("could not find "+blocksf)
            blocks = []
        return {"iblocks" : blocks}
    
    def books_template_data(self,lang):
        block = self.authorblock
        front = self.conf['front']
        auth_base_url = front['domain']+"/"+front['indices_dir']+"/"+self.authorblock['dir']+"/"
        google = "https://www.google.com/search?q={0}"
        for book in block['books']:
            book['cover'] = self.get_cover(book['bookdir'])
            book['url'] = auth_base_url+book['bookdir']
            book['language_name'] = textualangs.langname(book['language'])
            if 'orig_id' in book:
                book['orig_name'] = self.get_book_name(book['orig_id'])
                book['orig_url'] = auth_base_url+book['orig_id']
            if 'link' not in book:
                q = '+'.join(self.puncpat.sub('',book['book_nicename']+" "+self.authorblock['nicename']).split(' '))
                book['google'] = google.format(q.encode('utf-8')) 
            
        return {"author_books":block}
    
    def videos_template_data(self,lang):
        vidlistsrc = self.indexpath+"/videos.json" 
        if not os.path.isfile(vidlistsrc):
            logger.error("videos.json missing from "+self.indexpath)
            return {}
        vidlist = jc.load(file(vidlistsrc))
        videos = []
        frame0 = 'http://img.youtube.com/vi/{0}/0.jpg' 
        for vid in vidlist:
            videos.append(                
                {
                    "id": vid['id'],
                    "title": vid['title'][lang],
                    "firstframe" : frame0.format(vid['id'])
                }
            )
        return {"videos" : videos}

    def timeline_template_data(self,lang):
        src = self.conf['front']['domain']+"/timeline"
        vars = {}
        defaults = {"src": src, "theme_color" : "#288EC3", "auth":self.auth}
        varsf = self.indexpath+"/"+lang+"/timeline.json"
        if os.path.exists(varsf) :
            vars = jc.load(file(varsf))
        elif lang != "he":
            try:
                vars = jc.load(self.indexpath+"/he/"+page+".json")
                logger.info("timline - "+lang+" using defaults found in the hebrew directory")
            except:
                logger.info("no timeline configuration, using general defaults")

        return jsonmerge.merge(defaults,vars)
          

    def search_auth(self):
        for authorblock in self.conf['authors']:
            d = authorblock['dir']
            if(d == authdir):
                self.authorblock = authorblock
                self.indexpath = self.conf['front']['indices_dir']+"/"+authdir+"/site"
                self.siteconfig = jc.load(file(self.indexpath+"/siteconfig.json"))
                return True
         
    def good_to_go(self):
        if(self.found):
            logger.info("good to go")
            return True
        else:
            logger.error("sorry, "+authdir+" doesn't seem to be a correct directory name")
            return False        
    
         
    def render_header(self,lang):
        templatedata=self.get_globals(lang)
        menu_items = []
        for menu_item in self.siteconfig['menu'][lang]:
            try :
                it = self.siteconfig['pages'][menu_item]
                menu_items.append(                
                {
                    "file": 'index' if menu_item == 'home' else menu_item,
                    "label": it['label'][lang],
                    "title" : it['label'][lang] if 'mouseover' not in it else it['mouseover'][lang]
                }
             )
            except:
                logger.error(menu_item+" not configured in 'pages' block")
        templatedata['menu_items'] = menu_items
        templatedata['cssoverride']=os.path.exists(self.indexpath+"/css/local-override.css") 
        return stache.render(stache.load_template('header.html'),templatedata).encode('utf-8')
    
    def render_footer(self,lang):
        templatedata=self.get_globals(lang)
        socials =[]
        for social in self.siteconfig['socials'] :
            socials.append(jsonmerge.merge(social,{"label":social['label'][lang]}))
    
        templatedata['socials'] = socials
        return stache.render(stache.load_template('footer.html'),templatedata).encode('utf-8') 
     
    def render_body(self,page,lang):
        block = self.get_globals(lang)
        template = self.siteconfig['pages'][page]['template']
        contf= self.indexpath+"/"+lang+"/"+page+"-maintext.txt"
        statf = self.indexpath+"/"+lang+"/"+page+"-static.html"
        tempf = "auth_templates/"+template+".html"
        if template in self.body_blocks:
            block = jsonmerge.merge(block,self.body_blocks[template](lang))
        if template == "external":
            pageblock = self.siteconfig['pages'][page]
            if lang in pageblock['url']:
                block['url'] = pageblock['url'][lang]
            else:
                try:
                    block['url'] = pageblock['url']['he']
                except:
                    logger.error("cannot find url for external site page "+lang+"/"+page)

        if template == "static":
            if(os.path.exists(statf)):
                logger.info(u'loading '+lang+'/'+page+' static html')
                stat = open(statf).read() 
                return stat  
            else:
                logger.error(page+" ("+lang+") "+"has template 'static' but no " + page + "-static.html found in ...site/"+lang)
                return
        elif os.path.exists(contf):
            logger.info(u'loading '+ page+ '.txt into template')
            cont = open(contf).read()
            block['content'] = cont
        if not os.path.exists(tempf):
            logger.error("can't find template '"+template+"'")
            return
        if template == 'timeline':
            self.render_timeline_src(lang)
        return  stache.render(stache.load_template(template+".html"),block).encode('utf-8')
    
    def render_timeline_src(self,lang):
        tfilepath = "../timeline/"+self.auth+"_"+lang+".html"
        block = self.get_globals(lang)
        vars = {}
        defaults = {"theme_color" : "#288EC3",  "skin":"timeline.dark", "tlconfig" : self.auth, "src" : self.conf['front']['domain']+"/timeline" }
        varsf = self.indexpath+"/"+lang+"/timeline_src_params.json"
        if os.path.exists(varsf) :
            vars = jc.load(file(varsf))
        elif lang != "he":
            try:
                vars = jc.load(self.indexpath+"/he/timeline_src_params.json")
                logger.info("timline - "+lang+" using defaults found in the hebrew directory")
            except:
                logger.info("no timeline configuration, using general defaults")
        #if not os.path.exists(dir):
        #    os.makedirs(dir)
        vars = jsonmerge.merge(defaults,vars)
        try:
            block = jsonmerge.merge(block,vars)
            tfile = open(tfilepath,"w")
            tfile.write(stache.render(stache.load_template("timeline_src.html"),block))
            tfile.close()
            logger.info("source written at "+tfilepath)
        except Exception as e:
            logger.error(e)
         
    def render_page(self,page,lang,header,footer):
        body = self.render_body(page,lang)
        dir = self.indexpath+"/"+lang
        #home as index
        if(page == 'home'):
            page = 'index'
        if not os.path.exists(dir):
            os.makedirs(dir)
        try:
            htmlfile = open(dir+"/"+page+".html",'w')
            htmlfile.write(header+body+footer)
            htmlfile.close()
            logger.info(lang+"/"+page+ u' done')
        except Exception as e:
            logger.error(e)
             
    def get_globals(self,lang):
        g={"baseurl": self.siteconfig['baseurl']}
        #string_translations = {}
        #for p,v in self.siteconfig['string_translations'].iteritems():
        #    try: 
        #        string_translations[p]=v[lang]
        #    except:
        #        logger.info(u'missing '+p+' in '+lang)
        g['string_translations']=jsonmerge.merge(textualangs.translations(lang),textualangs.translations(lang,self.siteconfig['string_translations']))
        g['dir'] = textualangs.dir(lang)
        g['lang'] = lang
        g['auth_name_he'] = self.siteconfig['string_translations']['author']['he']
        g['auth_name_en'] = self.siteconfig['string_translations']['author']['en']
        g['front'] = self.conf['front']
        g['auth'] = self.auth
        return g
         
    #def parse_lang(self,str):
    #    lang = 'he';
    #    m = self.langpat.match(str)
    #    if(m != None):
    #       lang = self.langpat.match(str).group(2) 
    #    return lang
    
    #def strip_lang(self,str):
    #    ans = str
    #    m = self.langpat.match(str)
    #    if(m != None):
    #        ans = self.langpat.match(str).group(1)
    #    return ans
          
    def render_styles(self):
        stylertl = open(self.indexpath+"/css/style-rtl.css", 'w')
        styleltr = open(self.indexpath+"/css/style-ltr.css", 'w')
        rtlvars = jsonmerge.merge(self.siteconfig['stylevars'], {"dir": "rtl", "side": "right", "oposide": "left" })
        stylertl.write(lesscpy.compile(six.StringIO(stache.render(stache.load_template('authorsite.less'),rtlvars)),minify=True)) 
        #stylertl.write(lesscpy.compile(six.StringIO(self.json2less(rtlvars)+open('auth_templates/authorsite.less').read()),minify=True)) 
        stylertl.close()
        logger.info('rtl styles done')
        ltrvars = jsonmerge.merge(self.siteconfig['stylevars'],{ "dir": "ltr", "side": "left", "oposide": "right" }) 
        styleltr.write(lesscpy.compile(six.StringIO(stache.render(stache.load_template('authorsite.less'),ltrvars)),minify=True))
        #styleltr.write(lesscpy.compile(six.StringIO(self.json2less(ltrvars)+open('auth_templates/authorsite.less').read()),minify=True)) 
        styleltr.close()
        logger.info('ltr styles done')
        
    #def json2less(self,dict) :
    #    ret = "/* Variables from */"
    #    lineform = '@{0}:{1};\n'
    #    for prop,val in dict.iteritems():
    #        ret += lineform.format(prop,val)
    #    return ret
    ##def merge_menus(self,dict):
    #    ret = []
    #    for pages in dict.itervalues():
    #        ret = ret + pages.append["home"]
    #    return ret

    def render_site(self):
        if options.render_styles:
            self.render_styles()
        for lang,men in self.siteconfig['menu'].iteritems():
            header = self.render_header(lang)
            footer = self.render_footer(lang)
            if not 'home' in men:
                self.render_page('home',lang,header,footer)
            for page in men:
                self.render_page(page,lang,header,footer)
        logger.info(authdir+" site done")

    def get_cover(self,book):
        jpgs = sorted(glob.glob(self.conf['front']['srcs_dir']+"/"+self.auth+"/"+book+"/jpg/*.jpg"))
        if len(jpgs) == 0:
            logger.error("no jpgs for "+book)
            return
        return self.conf['front']['domain']+os.path.basename(self.conf['front']['srcs_dir'])+"/"+self.auth+"/"+book+"/jpg/"+os.path.basename(jpgs[0])

    def get_book_name(self,bookdir):
       name = ''
       for book in self.authorblock['books']:
           if book['bookdir'] == bookdir:
               name = book['book_nicename']
               break;
       return name
        
if __name__=='__main__':
    (options, args) = op.parse_args()
    authdir = args[0]
    asg = AuthorSiteGenerator(authdir)
    if(asg.good_to_go()):
        logger.info(u"rendering "+authdir)
        asg.render_site()
    
