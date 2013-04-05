// use minified rsd
ECDB.require("38OJQCIf");

// use not-minified rsd
//ECDB.require("Mu8F7I0W");
 
// debug
//Synquery.ext.SynqueryGithubAdaptor.setGithubDebug();
// debug
//Synquery.ext.SynqueryGithubAdaptor.setDebug();
        
new ECDB({title:"Bench for [class] SynqueryGithubAdaptor [rU9adSPX]",
    beforeLaunch:function(top){ /* Describe Bench function here */
    
    
        var getRsd = function(id) {
            var def = $.Deferred();
            top.BOOK({}).send({"file":"./developer","prj":"9zpoe9Jq","func":"getRsd","db":"synquery","table":"rsd","val":[id]}, function(err, info) {
                err ? def.reject(err): def.resolve(info[0]);
            });
            return def.promise();
        };
    
        var adaptor = new Synquery.ext.SynqueryGithubAdaptor();
        
        var icon = adaptor.getIcon().appendTo(top.Body());
        
        adaptor.on('ready', function() {
            var rsd;
            var x = top.BOOK({
                'title': 'Get RSD from Synquery and commit it to Github.',
                'structure': [
                    ['mess', '', 'string', '', {'constant': true, 'css': {'color': 'red'}}, 100],
                    ['id', 'RSD ID', 'string', '', {'default': 'rU9adSPX', 'fill': true}, [10, 90]],
                    ['trace[]', '', [
                        ['log', '', 'string', '', {'constant': true}, 90],
                        ['hidden', '', 'string', '', {'hidden': true}, 0]
                    ], 200, {}, 10]
                ],
                'style': {'noSearch': true, 'formWidth': 768, 'editForm': true},
                'formButton': {
                    'Get': function(x) {
                        if(x.CheckForm())
                            return;
                        var id = x.GetForm().id;
                        putLog('start getting your RSD');
                        getRsd(id).pipe(function(res) {
                            if(!res)
                                return $.Deferred().reject();
                            
                            rsd = res
                            
                            x.Input('id').Disabled(true);
                            
                            putLog('succeeded to get RSD(' + id + ')');
                            
                            x.FormButton('Get').hide();
                            x.FormButton('Commit').show();
                            
                            putMess('Commit the RSD to your Github repository.');
                            
                        }).pipe(null, function() {
                            putLog('failed to get RSD(' + id + ')')
                        });
                    },
                    'Commit': function(x) {
                        x.FormButton('Commit').hide();
                        var id = x.GetForm().id;
                        putLog('start commiting your RSD');
                        var rsds = {};
                        rsds[id] = rsd
                        adaptor.commit(rsds).pipe(function() {
                            putLog('succeeded to commit RSD(' + id + ')');
                            
                            var url = 'https://github.com/' + adaptor.user_.login + '/' + Synquery.Project;
                            var div = x.message('<div>Please check your repository.<br><a href="' + url + '" target="_blank">Go to Github</a></div>');
                       }, function() {
                            putLog('failed to commit RSD(' + id + ')');

                        });
                    }
                },
                'beforeShowMatrix': function(dom) {
                    this.InsertButton(dom).remove();
                    this.DeleteButton(dom).remove();
                },
                'beforeShowForm': function() {
                    this.FormButton('Commit').hide();
                    putMess('Get an RSD you\'d like to commit to Github.');
                    
                }
            });
            var logs = [];
            var putLog = function(mess) {
                logs.push(mess);
                var form = x.GetForm();
                form.trace.log = logs;
                x.PutForm(form);
            };
            var putMess = function(mess) {
                x.Value('mess', mess);
            };
            
            x.ShowForm();
        
        });        
    }
});