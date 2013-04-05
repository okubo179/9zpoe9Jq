// github apis
ECDB.require('nNOEuSen');
// utilities
ECDB.require('97CqCbDK');

(function() {

    var Adaptor = function() {
        Synquery.lib.jQuerize(this);

        this.user_ = null;
        this.project_ = null;
        this.latestCommit_ = null;
        
        this.rsdMap_ = {};
        
    };
    var github = this.SocialAPIs.github;
    
    Adaptor.prototype.getIcon = function() {
        var css = Adaptor.getCssName_;
        var icon = $('<div/>').addClass([css('icon'), css('icon-128'), css('icon-github')].join(' '));
        var adaptor = this;
        icon.on('click', function() {
            $.when().pipe(function() {
                return adaptor.signin();

            }).pipe(function() {
                return adaptor.use(Synquery.Project);
                
            }).pipe(function() {
                adaptor.trigger('ready');
            
            });
        });
        this.on('ready', function() {
            icon.removeClass(css('icon-github')).addClass(css('icon-github-logedin'));
        });
        return icon;
    };

    Adaptor.prototype.signin = function() {
        var adaptor = this, def = $.Deferred();
        
        var n = 3, i = 0;

        $.when().pipe(function() {
            def.notify(i++, n);
            return github.signin();

        }).pipe(function() {
            def.notify(i++, n);
            return github.getUser();

        }).pipe(function(user) {
            def.notify(i++, n);
            adaptor.user_ = user;
            return adaptor;

        }, function(info) {
            return $.Deferred().reject(new SynqueryError(info));

        }).pipe(function() {
            def.notify(i++, n);
            adaptor.trigger($.Event('signin'));
            def.resolveWith(def, arguments);

        }, function() {
            adaptor.trigger($.Event('error'), arguments);
            def.rejectWith(def, arguments);
        });

        return def.promise();
    };
    
    Adaptor.prototype.use = function(projectId) {
        var adaptor = this, def = $.Deferred(), login = this.user_.login;
        
        var n = 5, i = 0;
        
        if('string' !== typeof projectId || '' === projectId)
            return def.reject(new SynqueryError('1st argument must be type of string.'));
        
        $.when().pipe(function() {
            def.notify(i++, n);
            return github.getRepository(login, projectId);

        }).pipe(null, function(info) {
            if(info.meta.status !== 404)
                return $.Deferred().reject(new SynqueryError(info));

            return github.createUserRepository({
                'name': projectId,
                'auto_init': true
            });

        }).pipe(function(repo) {
            def.notify(i++, n);
            adaptor.project_ = repo;
        
        }).pipe(function() {
            def.notify(i++, n);
            return github.getReference(login, projectId, 'heads/master');
        
        }).pipe(function(ref) {
            def.notify(i++, n);
            var sha = ref.object.sha;
            return github.getCommit(login, projectId, sha);
        
        }).pipe(function(commit) {
            def.notify(i++, n);
            adaptor.latestCommit_ = commit;
            return adaptor;
        
        }).pipe(function() {
            def.notify(i++, n);
            def.resolveWith(def, arguments);
        }, def.reject);
        
        return def.promise();
    };
    
    Adaptor.prototype.listContents = function(path) {
        var adaptor = this, def = $.Deferred();
        var projectId = this.project_.name, login = this.user_.login;
        
        $.when().pipe(function() {
            return github.getContents(login, projectId, path);

        }).pipe(def.resolve, def.reject);

        return def.promise();
    };
    
//    Adaptor.prototype.listRsdIds = function() {
//        var map = this.rsdMap_
//        var list = Object.keys(map);
//        if(list.length)
//            return $.Deferred().resolve(list);
//        
//        return this.listContents().pipe(function(trees) {
//            var rsds = [];
//            trees.forEach(function(tree) {
//                if(tree.type === 'dir') {
//                    rsds[rsds.length] = tree.name;
//                    map[tree.name] = tree.sha;
//                }
//            });
//            return rsds;
//        });
//    };
    
    Adaptor.prototype.getRsd = function(id) {
        var adaptor = this, def = $.Deferred();
        
        $.when().pipe(function() {
            return adaptor.createRsd_(id);

        }).pipe(def.resolve, def.reject);
        
        return def.promise();
    };
    
    Adaptor.prototype.listRsds = function() {
        var adaptor = this, def = $.Deferred();
        
        $.when().pipe(function() {
            return adaptor.listContents();
        
        }).pipe(function(trees) {
            var promises = [];
            trees.forEach(function(tree) {
                var id = tree.name;
                if(id === 'README.md')
                    return;
                promises[promises.length] = adaptor.getRsd(id);
            });
            return $.when.apply($, promises).pipe(function() {
                return Array.prototype.slice.call(arguments);
            });

        }).pipe(def.resolve, def.reject);
        
        return def.promise();
    };
    
    Adaptor.prototype.getRsdMap = function() {
        return this.listRsds().pipe(function(list) {
            var map = {};
            list.forEach(function(rsd) {
                map[rsd._id] = rsd;
            });
            return map;
        });
    };
    
    Adaptor.prototype.createRsd_ = function(id) {
        var adaptor = this, def = $.Deferred();
        
        var rsd;
        $.when().pipe(function() {
            return adaptor.listContents([id, 'meta.json'].join('/'));
        
        }).pipe(function(file) {
            rsd = JSON.parse(Adaptor.base64ToUtf8(file.content));
            
            var title = rsd.title, promises = [];
            promises[promises.length] = adaptor.listContents([id, title + '.js'].join('/'));
            promises[promises.length] = adaptor.listContents([id, title + '.css'].join('/'));
            promises[promises.length] = adaptor.listContents([id, title + '.html'].join('/'));
            promises[promises.length] = adaptor.listContents([id, 'bench.js'].join('/'));
            return $.when.apply($, promises);

        }).pipe(function(js, css, html, bench) {
            rsd.src = Adaptor.base64ToUtf8(js[0].content);
            rsd.css = Adaptor.base64ToUtf8(css[0].content);
            rsd.html = Adaptor.base64ToUtf8(html[0].content);
            rsd.branch = Adaptor.base64ToUtf8(bench[0].content);;
            return rsd;

        }).pipe(def.resolve, def.reject);
        
        return def.promise();
    };
    
    Adaptor.prototype.commit = function(rsdsObject, commitMessage) {
        var adaptor = this, def = $.Deferred();
        
        if(!$.isPlainObject(rsdsObject))
            return def.reject(new SynqueryError('1st argument must be type of object.'));
        
        var n = 5, i = 0;
        var newCommit;
                
        $.when().pipe(function() {
            def.notify(i++, n);
            return adaptor.getBaseTreeSha_();

        }).pipe(function(baseTreeSha) {
            def.notify(i++, n);
            return adaptor.createTree_(baseTreeSha, rsdsObject);
        
        }).pipe(function(tree) {
            def.notify(i++, n);
            var sha = tree.sha;
            return adaptor.createCommit_(sha, commitMessage);
            
        }).pipe(function(commit) {
            def.notify(i++, n);
            newCommit = commit;
            var sha = commit.sha;
            return adaptor.updateRef_(sha);

        }).pipe(function() {
            def.notify(i++, n);
            adaptor.latestCommit_ = newCommit;
            return adaptor;

        }).pipe(function() {
            def.notify(i++, n);
            def.resolveWith(def, arguments);
        }, def.reject);
        
        return def.promise();
    };
    
    Adaptor.prototype.forceCommit = function(rsdsObject, commitMessage) {
        var adaptor = this, def = $.Deferred();
        
        if(!$.isPlainObject(rsdsObject))
            return def.reject(new SynqueryError('1st argument must be type of object.'));
        
        var n = 7, i = 0;
        var newCommit;
                
        $.when().pipe(function() {
            def.notify(i++, n);
            return adaptor.getPaths_();

        }).pipe(function(paths) {
            def.notify(i++, n);
            var deleteRsds = [];
            paths.forEach(function(path) {
                if(rsdsObject[path] || path === 'README.md')
                    return;
                deleteRsds[deleteRsds.length] = path;
            });
            return deleteRsds;

        }).pipe(function(delRsds) {
            def.notify(i++, n);
            return adaptor.getBaseTreeSha_(delRsds);

        }).pipe(function(baseTreeSha) {
            def.notify(i++, n);
            return adaptor.createTree_(baseTreeSha, rsdsObject);
        
        }).pipe(function(tree) {
            def.notify(i++, n);
            var sha = tree.sha;
            return adaptor.createCommit_(sha, commitMessage);
            
        }).pipe(function(commit) {
            def.notify(i++, n);
            newCommit = commit;
            var sha = commit.sha;
            return adaptor.updateRef_(sha);

        }).pipe(function() {
            def.notify(i++, n);
            adaptor.latestCommit_ = newCommit;
            return adaptor;

        }).pipe(function() {
            def.notify(i++, n);
            def.resolveWith(def, arguments);
        }, def.reject);
        
        return def.promise();
    };
    
    Adaptor.prototype.getPaths_ = function() {
        var def = $.Deferred();
        var projectId = this.project_.name, login = this.user_.login;
        
        $.when().pipe(function() {
            return github.getContents(login, projectId);

        }).pipe(function(contents) {
            return contents.map(function(content) {
                return content.path;
            });
        }).pipe(def.resolve, def.reject);
        
        return def.promise();
    };
    
    Adaptor.prototype.getBaseTreeSha_ = function(deletePaths) {
        var adaptor = this, def = $.Deferred();
        var projectId = this.project_.name, login = this.user_.login;
        var treeSha = adaptor.latestCommit_.tree.sha;
        
        if(!$.isArray(deletePaths) || deletePaths.length === 0)
            return def.resolve(treeSha);
        
        // TODO
        var recursive = 1;
        
        
        $.when().pipe(function() {
            return github.getTree(login, projectId, treeSha, recursive);

        }).pipe(function(tree) {
            var newTreeArr = [];
            tree.tree.forEach(function(content) {
                if(0 <= $.inArray(content.path, deletePaths))
                    return;
                newTreeArr[newTreeArr.length] = content;
                delete content.size, delete content.url;
            });
            return newTreeArr;

        }).pipe(function(treeArray) {
            var treeObj = {'tree': treeArray};
            return github.createTree(login, projectId, treeObj);
        
        }).pipe(function(newTree) {
            return newTree.sha;
            
        }).pipe(def.resolve, def.reject);
        
        return def.promise();
    };
    
//    Adaptor.prototype.createTree_ = function(baseTreeSha, obj) {
//        var projectId = this.project_.name, login = this.user_.login;
//
//        var treeObj = {'base_tree': baseTreeSha};
//        var tree = treeObj.tree = [];
//        try {
//            $.each(obj, function(path, obj) {
//                tree[tree.length] = {
//                    'path': path,
//                    'content': JSON.stringify(obj),
//                    'type': 'blob',
//                    'mode': '100644'
//                };
//            });
//        } catch(err) {
//            return $.Deferred().reject(err);
//        }
//        return github.createTree(login, projectId, treeObj)
//    };
    
    Adaptor.prototype.createTree_ = function(baseTreeSha, obj) {
        var projectId = this.project_.name, login = this.user_.login;

        var treeObj = {'base_tree': baseTreeSha};
        var tree = treeObj.tree = [];
        try {
            $.each(obj, function(path, obj) {
                var title = obj.title;
                tree[tree.length] = {
                    'path': path + '/' + title + '.js',
                    'content': obj.src || '',
                    'type': 'blob',
                    'mode': '100644'
                };
                tree[tree.length] = {
                    'path': path + '/' + title + '.css',
                    'content': obj.css || '',
                    'type': 'blob',
                    'mode': '100644'
                };
                tree[tree.length] = {
                    'path': path + '/' + title + '.html',
                    'content': obj.html || '',
                    'type': 'blob',
                    'mode': '100644'
                };
                tree[tree.length] = {
                    'path': path + '/bench.js',
                    'content': obj.bench || '',
                    'type': 'blob',
                    'mode': '100644'
                };
                delete obj.src, delete obj.css, delete obj.html, delete obj.bench;
                tree[tree.length] = {
                    'path': path + '/meta.json',
                    'content': JSON.stringify(obj),
                    'type': 'blob',
                    'mode': '100644'
                };
            });
        } catch(err) {
            return $.Deferred().reject(err);
        }
        return github.createTree(login, projectId, treeObj)
    };

    Adaptor.prototype.createCommit_ = function(treeSha, commitMessage) {
        var projectId = this.project_.name, login = this.user_.login;
        var latestCommitSha = this.latestCommit_.sha;
        
        var params = {};
        params.message = commitMessage || ('commit from synquery (' + Synquery.Project + ')');
        params.tree = treeSha;
        params.parents = [latestCommitSha];
        var user = params.author = params.committer = {};
        user.name = this.user_.login;
        user.email = this.user_.email;
        user.date = new Date().toISOString();
        
        return github.createCommit(login, projectId, params);
    };
    
    Adaptor.prototype.updateRef_ = function(commitSha) {
        var projectId = this.project_.name, login = this.user_.login;
        
        var params = {};
        params.sha = commitSha;
        params.force = true;
        
        return github.updateReference(login, projectId, 'heads/master', params);
    };
    
    Adaptor.getCssName_ = function(name) {
        return 'synquery-github-adaptor-' + name;
    };
    
    Adaptor.base64ToUtf8 = function(base64) {
        return decodeURIComponent(escape(window.atob(base64.replace(/\n|\r/g, ''))));
    };
    
    Adaptor.setGithubDebug = function() {
        $.each(github, function(fname, fnc) {
        
            if(!$.isFunction(fnc) || fname.match(/_$/))
                return;
        
            github[fname] = function() {
                var args = arguments;

                return fnc.apply(this, arguments).pipe(function() {
                    console.log('github#' + fname, 'success', arguments, args);
                    return $.Deferred().resolveWith(this, arguments);
                    
                }, function() {
                    console.error('github#' + fname, 'fail', arguments, args);
                    return $.Deferred().rejectWith(this, arguments);
                });
            
            };
        
        });
    };
    Adaptor.setDebug = function() {
        $.each(Adaptor.prototype, function(fname, fnc) {
        
            if(!$.isFunction(fnc))
                return;
        
            Adaptor.prototype[fname] = function() {
                var args = arguments;

                return fnc.apply(this, arguments).pipe(function() {
                    console.log('Adaptor#' + fname, 'success', arguments, args);
                    return $.Deferred().resolveWith(this, arguments);
                    
                }, function() {
                    console.error('Adaptor#' + fname, 'fail', arguments, args);
                    return $.Deferred().rejectWith(this, arguments);
                });
            
            };
        
        });
    };
    
    var SynqueryError = function(info) {
        var message = 'string' === typeof info ? info: info.data.message;
        Error.call(this, message);
        this.info_ = info;
    };
    Synquery.prototype = $.extend(true, Synquery.prototype, Object.create(Error.prototype));
    

    
    // expose
    this.SynqueryGithubAdaptor = Adaptor;

}).call(Synquery.ext);